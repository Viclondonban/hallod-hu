import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import Parser from 'rss-parser';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// 10 second timeout per feed (Railway has no function timeout limit)
const parser = new Parser({
  timeout: 10000,
  customFields: {
    item: [
      ['itunes:image', 'itunesImage'],
      ['itunes:duration', 'itunesDuration'],
    ],
  },
});

// Only check the N most recent items from each feed.
// Running every 15 min means at most 1-2 new episodes exist — no need to
// scan the full back-catalogue on every run.
const MAX_ITEMS_PER_FEED = 20;

const MIN_CHECK_HOURS = 12;
const MAX_CHECK_HOURS = 24 * 30;

async function calculateNextCheckHours(podcastId: string): Promise<number> {
  const recentEpisodes = await prisma.episode.findMany({
    where: { podcastId },
    orderBy: { pubDate: 'desc' },
    take: 10,
    select: { pubDate: true },
  });

  if (recentEpisodes.length < 2) return 48;

  const intervals: number[] = [];
  for (let i = 0; i < recentEpisodes.length - 1; i++) {
    const diffMs = recentEpisodes[i].pubDate.getTime() - recentEpisodes[i + 1].pubDate.getTime();
    if (diffMs > 0) intervals.push(diffMs);
  }

  if (intervals.length === 0) return 48;

  const avgMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const avgHours = avgMs / (1000 * 60 * 60);
  return Math.min(Math.max(avgHours * 0.8, MIN_CHECK_HOURS), MAX_CHECK_HOURS);
}

async function syncPodcast(podcast: { id: string; title: string; feedUrl: string }) {
  const feed = await parser.parseURL(podcast.feedUrl);
  let newEpisodes = 0;

  // Only look at the most recent items — older ones are already in the DB
  const recentItems = feed.items.slice(0, MAX_ITEMS_PER_FEED);

  for (const item of recentItems) {
    const audioUrl = item.enclosure?.url || item.link;
    const guid = item.guid || audioUrl;
    if (!audioUrl || !item.title || !guid) continue;

    // Extract episode-level cover art from itunes:image (href attribute or plain string)
    const itemAsUnknown = item as unknown as Record<string, unknown>;
    const rawImage = itemAsUnknown.itunesImage;
    const episodeImageUrl: string | null =
      (rawImage && typeof rawImage === 'object' && '$' in rawImage
        ? (rawImage as { $?: { href?: string } }).$?.href
        : typeof rawImage === 'string' ? rawImage : null) ?? null;

    // Parse duration: itunes:duration can be "HH:MM:SS", "MM:SS", or plain seconds
    const rawDuration = itemAsUnknown.itunesDuration;
    let durationSeconds: number | null = null;
    if (rawDuration) {
      const parts = String(rawDuration).split(':').map(Number);
      if (parts.length === 3) durationSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
      else if (parts.length === 2) durationSeconds = parts[0] * 60 + parts[1];
      else if (parts.length === 1 && !isNaN(parts[0])) durationSeconds = parts[0];
    }

    // Single upsert instead of findFirst + create — half the DB roundtrips
    const result = await prisma.episode.upsert({
      where: { podcastId_guid: { podcastId: podcast.id, guid } },
      update: {
        // Update image and duration in case they change after initial ingest
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

    // createdAt === updatedAt means it was just created
    if (result.createdAt.getTime() === result.updatedAt.getTime()) {
      newEpisodes++;
    }
  }

  const nextCheckHours = await calculateNextCheckHours(podcast.id);
  const nextCheckAt = new Date(Date.now() + nextCheckHours * 60 * 60 * 1000);

  await prisma.podcast.update({
    where: { id: podcast.id },
    data: { lastCheckedAt: new Date(), nextCheckAt, lastError: null },
  });

  return { newEpisodes, nextCheckHours: Math.round(nextCheckHours) };
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // No take() limit — Railway has no function timeout, so process all due podcasts
    const podcasts = await prisma.podcast.findMany({
      where: { isActive: true, nextCheckAt: { lte: new Date() } },
      orderBy: { nextCheckAt: 'asc' },
      select: { id: true, title: true, feedUrl: true },
    });

    // Fetch all feeds in parallel — total time = slowest single feed, not sum of all
    const settled = await Promise.allSettled(
      podcasts.map(podcast => syncPodcast(podcast))
    );

    let totalNewEpisodes = 0;
    const results = await Promise.all(
      settled.map(async (result, i) => {
        const podcast = podcasts[i];

        if (result.status === 'fulfilled') {
          totalNewEpisodes += result.value.newEpisodes;
          return {
            title: podcast.title,
            newEpisodes: result.value.newEpisodes,
            nextCheckHours: result.value.nextCheckHours,
          };
        } else {
          const errorMsg = result.reason instanceof Error
            ? result.reason.message
            : String(result.reason);
          console.error(`Error syncing ${podcast.title}:`, result.reason);

          await prisma.podcast.update({
            where: { id: podcast.id },
            data: { lastError: errorMsg, nextCheckAt: new Date(Date.now() + 6 * 60 * 60 * 1000) },
          }).catch(() => {});

          return { title: podcast.title, newEpisodes: 0, error: errorMsg };
        }
      })
    );

    return NextResponse.json({
      success: true,
      message: `Processed ${podcasts.length} podcasts. Added ${totalNewEpisodes} new episodes.`,
      results,
    });

  } catch (error) {
    console.error('Global Cron Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
