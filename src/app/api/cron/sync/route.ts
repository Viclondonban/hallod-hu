import { NextRequest, NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { prisma } from '@/lib/prisma';

// rss-parser is only used for parseString() now — we do the fetch ourselves
// so we can intercept headers and handle 304 Not Modified.
const parser = new Parser({
  customFields: {
    item: [
      ['itunes:image', 'itunesImage'],
      ['itunes:duration', 'itunesDuration'],
    ],
  },
});

const FETCH_HEADERS = {
  'User-Agent': 'AppleCoreMedia/1.0.0.21F79 (iPhone; U; CPU OS 17_5 like Mac OS X)',
  'Accept': 'application/rss+xml, application/xml, text/xml, */*',
};

const FETCH_TIMEOUT_MS = 15000;

// Only check the N most recent items from each feed.
const MAX_ITEMS_PER_FEED = 20;

const MIN_CHECK_HOURS = 0.5;
const MAX_CHECK_HOURS = 2;

async function calculateNextCheckHours(podcastId: string): Promise<number> {
  const recentEpisodes = await prisma.episode.findMany({
    where: { podcastId },
    orderBy: { pubDate: 'desc' },
    take: 10,
    select: { pubDate: true },
  });

  if (recentEpisodes.length < 2) return MAX_CHECK_HOURS;

  const intervals: number[] = [];
  for (let i = 0; i < recentEpisodes.length - 1; i++) {
    const diffMs = recentEpisodes[i].pubDate.getTime() - recentEpisodes[i + 1].pubDate.getTime();
    if (diffMs > 0) intervals.push(diffMs);
  }

  if (intervals.length === 0) return MAX_CHECK_HOURS;

  const avgMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const avgHours = avgMs / (1000 * 60 * 60);
  return Math.min(Math.max(avgHours * 0.5, MIN_CHECK_HOURS), MAX_CHECK_HOURS);
}

async function syncPodcast(podcast: {
  id: string;
  title: string;
  feedUrl: string;
  feedEtag: string | null;
  feedLastModified: string | null;
}) {
  // Build conditional request headers — if we have a cached validator, send it.
  // The server replies with 304 Not Modified (no body) if nothing changed,
  // saving the full feed download (~50-130KB) on the vast majority of checks.
  const reqHeaders: Record<string, string> = { ...FETCH_HEADERS };
  if (podcast.feedEtag) reqHeaders['If-None-Match'] = podcast.feedEtag;
  else if (podcast.feedLastModified) reqHeaders['If-Modified-Since'] = podcast.feedLastModified;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let xml: string;
  let newEtag: string | null;
  let newLastModified: string | null;

  // The timer stays live through the body read so a slow/hung sender can't
  // pin this task forever once headers arrive. Previously clearTimeout ran
  // right after fetch() resolved, leaving response.text() without a guard.
  try {
    const response = await fetch(podcast.feedUrl, {
      headers: reqHeaders,
      signal: controller.signal,
    });

    // 304 — feed unchanged since last check. No body to read.
    if (response.status === 304) {
      const nextCheckHours = await calculateNextCheckHours(podcast.id);
      const nextCheckAt = new Date(Date.now() + nextCheckHours * 60 * 60 * 1000);
      await prisma.podcast.update({
        where: { id: podcast.id },
        data: { lastCheckedAt: new Date(), nextCheckAt, lastError: null },
      });
      return { newEpisodes: 0, nextCheckHours: Math.round(nextCheckHours), skipped: true };
    }

    if (!response.ok) {
      // Cancel the body stream so Undici releases the socket immediately.
      // Without this, the buffered body sits pinned in memory until GC, and
      // the error-heavy feeds (ECONNRESET, 5xx) were a real contributor to
      // the Railway RAM drift.
      await response.body?.cancel().catch(() => {});
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    // Save ETag / Last-Modified so the next check can be conditional.
    newEtag = response.headers.get('etag');
    newLastModified = response.headers.get('last-modified');
    xml = await response.text();
  } finally {
    clearTimeout(timer);
  }

  const feed = await parser.parseString(xml);
  let newEpisodes = 0;

  const recentItems = feed.items.slice(0, MAX_ITEMS_PER_FEED);

  for (const item of recentItems) {
    const audioUrl = item.enclosure?.url || item.link;
    const guid = item.guid || audioUrl;
    if (!audioUrl || !item.title || !guid) continue;

    const itemAsUnknown = item as unknown as Record<string, unknown>;
    const rawImage = itemAsUnknown.itunesImage;
    const episodeImageUrl: string | null =
      (rawImage && typeof rawImage === 'object' && '$' in rawImage
        ? (rawImage as { $?: { href?: string } }).$?.href
        : typeof rawImage === 'string' ? rawImage : null) ?? null;

    const rawDuration = itemAsUnknown.itunesDuration;
    let durationSeconds: number | null = null;
    if (rawDuration) {
      const parts = String(rawDuration).split(':').map(Number);
      if (parts.length === 3) durationSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
      else if (parts.length === 2) durationSeconds = parts[0] * 60 + parts[1];
      else if (parts.length === 1 && !isNaN(parts[0])) durationSeconds = parts[0];
    }

    const result = await prisma.episode.upsert({
      where: { podcastId_guid: { podcastId: podcast.id, guid } },
      update: {
        ...(episodeImageUrl && { imageUrl: episodeImageUrl }),
        ...(durationSeconds && { duration: durationSeconds }),
      },
      create: {
        guid,
        title: item.title,
        enclosureUrl: audioUrl,
        pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
        description: item.contentSnippet || item.content || '',
        podcastId: podcast.id,
        imageUrl: episodeImageUrl,
        duration: durationSeconds,
      },
    });

    if (result.createdAt.getTime() === result.updatedAt.getTime()) {
      newEpisodes++;
    }
  }

  const nextCheckHours = await calculateNextCheckHours(podcast.id);
  const nextCheckAt = new Date(Date.now() + nextCheckHours * 60 * 60 * 1000);

  await prisma.podcast.update({
    where: { id: podcast.id },
    data: {
      lastCheckedAt: new Date(),
      nextCheckAt,
      lastError: null,
      // Store validators for the next conditional request
      ...(newEtag !== null && { feedEtag: newEtag }),
      ...(newLastModified !== null && { feedLastModified: newLastModified }),
    },
  });

  return { newEpisodes, nextCheckHours: Math.round(nextCheckHours), skipped: false };
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const podcasts = await prisma.podcast.findMany({
      where: { isActive: true, nextCheckAt: { lte: new Date() } },
      orderBy: { nextCheckAt: 'asc' },
      select: { id: true, title: true, feedUrl: true, feedEtag: true, feedLastModified: true },
    });

    const CONCURRENCY = 25;
    let totalNewEpisodes = 0;
    let totalSkipped = 0;
    const results: {
      title: string;
      newEpisodes: number;
      nextCheckHours?: number;
      skipped?: boolean;
      error?: string;
    }[] = [];

    for (let i = 0; i < podcasts.length; i += CONCURRENCY) {
      const batch = podcasts.slice(i, i + CONCURRENCY);
      const settled = await Promise.allSettled(batch.map(p => syncPodcast(p)));

      await Promise.all(
        settled.map(async (result, j) => {
          const podcast = batch[j];
          if (result.status === 'fulfilled') {
            totalNewEpisodes += result.value.newEpisodes;
            if (result.value.skipped) totalSkipped++;
            results.push({
              title: podcast.title,
              newEpisodes: result.value.newEpisodes,
              nextCheckHours: result.value.nextCheckHours,
              skipped: result.value.skipped,
            });
          } else {
            const errorMsg = result.reason instanceof Error
              ? result.reason.message
              : String(result.reason);
            console.error(`Error syncing ${podcast.title}:`, result.reason);

            await prisma.podcast.update({
              where: { id: podcast.id },
              data: { lastError: errorMsg, nextCheckAt: new Date(Date.now() + 6 * 60 * 60 * 1000) },
            }).catch(() => {});

            results.push({ title: podcast.title, newEpisodes: 0, error: errorMsg });
          }
        })
      );
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${podcasts.length} podcasts — ${totalSkipped} unchanged (304), ${podcasts.length - totalSkipped} downloaded. Added ${totalNewEpisodes} new episodes.`,
      results,
    });

  } catch (error) {
    console.error('Global Cron Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
