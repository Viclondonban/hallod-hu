import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import Parser from 'rss-parser';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

const parser = new Parser();

// How many podcasts to process per cron run.
// At ~1-2s per feed, 5 fits comfortably inside Vercel Hobby's 10s limit.
const BATCH_SIZE = 5;

// Bounds for how soon a podcast can be re-checked.
// Even a daily show won't be checked more than once every 12 hours.
// Even a dead/monthly show will still be checked at least once every 30 days.
const MIN_CHECK_HOURS = 12;
const MAX_CHECK_HOURS = 24 * 30; // 30 days

/**
 * Looks at the gaps between the last 10 episodes and returns
 * how many hours to wait before checking this podcast again.
 * A daily show → ~24h. A weekly show → ~168h. Unknown → 48h default.
 */
async function calculateNextCheckHours(podcastId: string): Promise<number> {
  const recentEpisodes = await prisma.episode.findMany({
    where: { podcastId },
    orderBy: { pubDate: 'desc' },
    take: 10,
    select: { pubDate: true },
  });

  if (recentEpisodes.length < 2) {
    return 48; // Not enough history — check every 2 days
  }

  const intervals: number[] = [];
  for (let i = 0; i < recentEpisodes.length - 1; i++) {
    const diffMs =
      recentEpisodes[i].pubDate.getTime() - recentEpisodes[i + 1].pubDate.getTime();
    if (diffMs > 0) intervals.push(diffMs);
  }

  if (intervals.length === 0) return 48;

  const avgMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const avgHours = avgMs / (1000 * 60 * 60);

  // Check slightly ahead of schedule (80% of avg interval) so we
  // catch new episodes shortly after they drop rather than after a full cycle.
  const targetHours = avgHours * 0.8;

  return Math.min(Math.max(targetHours, MIN_CHECK_HOURS), MAX_CHECK_HOURS);
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // Only grab podcasts that are due for a check right now,
    // ordered so the most overdue ones go first.
    const podcasts = await prisma.podcast.findMany({
      where: {
        isActive: true,
        nextCheckAt: { lte: new Date() },
      },
      orderBy: { nextCheckAt: 'asc' },
      take: BATCH_SIZE,
    });

    let totalNewEpisodes = 0;
    const results: { title: string; newEpisodes: number; nextCheckHours?: number; error?: string }[] = [];

    for (const podcast of podcasts) {
      try {
        console.log(`Syncing: ${podcast.title}`);
        const feed = await parser.parseURL(podcast.feedUrl);

        let newEpisodesForPodcast = 0;

        for (const item of feed.items) {
          const audioUrl = item.enclosure?.url || item.link;
          const guid = item.guid || audioUrl;

          if (!audioUrl || !item.title || !guid) continue;

          const existing = await prisma.episode.findFirst({
            where: {
              podcastId: podcast.id,
              OR: [{ enclosureUrl: audioUrl }, { guid }],
            },
          });

          if (!existing) {
            await prisma.episode.create({
              data: {
                guid,
                title: item.title,
                enclosureUrl: audioUrl,
                pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
                description: item.contentSnippet || item.content || '',
                podcastId: podcast.id,
              },
            });
            newEpisodesForPodcast++;
            totalNewEpisodes++;
          }
        }

        // Work out when to check this podcast again based on its publish cadence.
        const nextCheckHours = await calculateNextCheckHours(podcast.id);
        const nextCheckAt = new Date(Date.now() + nextCheckHours * 60 * 60 * 1000);

        await prisma.podcast.update({
          where: { id: podcast.id },
          data: {
            lastCheckedAt: new Date(),
            nextCheckAt,
            lastError: null,
          },
        });

        results.push({ title: podcast.title, newEpisodes: newEpisodesForPodcast, nextCheckHours: Math.round(nextCheckHours) });

      } catch (podcastError) {
        const errorMsg = podcastError instanceof Error ? podcastError.message : String(podcastError);
        console.error(`Error syncing ${podcast.title}:`, podcastError);

        // Push it back 6 hours so a broken feed doesn't hog every run.
        const retryAt = new Date(Date.now() + 6 * 60 * 60 * 1000);
        await prisma.podcast.update({
          where: { id: podcast.id },
          data: { lastError: errorMsg, nextCheckAt: retryAt },
        }).catch(() => {});

        results.push({ title: podcast.title, newEpisodes: 0, error: errorMsg });
      }
    }

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
