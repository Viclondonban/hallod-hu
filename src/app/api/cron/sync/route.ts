import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const parser = new Parser();

export async function GET(request: Request) {
  // 1. SECURITY: Keep the bad guys out
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized: Invalid CRON_SECRET', { status: 401 });
  }

  try {
    // 2. Fetch ONLY the active podcasts
    const activePodcasts = await prisma.podcast.findMany({
      where: { isActive: true },
    });

    let podcastsProcessed = 0;
    let episodesAddedOrUpdated = 0;

    // 3. Loop through them and parse their RSS feeds
    for (const podcast of activePodcasts) {
      if (!podcast.feedUrl) continue; // Using your 'feedUrl' field

      try {
        const feed = await parser.parseURL(podcast.feedUrl);

        // 4. Save the episodes
        for (const item of feed.items) {
          const episodeGuid = item.guid || item.id || item.link || `${podcast.id}-${item.title}`;

          // Using your specific database fields and compound unique constraint
          await prisma.episode.upsert({
            where: {
              podcastId_guid: {
                podcastId: podcast.id,
                guid: episodeGuid,
              }
            },
            update: {}, // We do nothing if it already exists
            create: {
              podcastId: podcast.id,
              guid: episodeGuid,
              title: item.title || "Ismeretlen Cím",
              description: item.contentSnippet || item.content || null,
              pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
              enclosureUrl: item.enclosure?.url || "", // Using your 'enclosureUrl' field
              // We leave duration, episodeNumber, and imageUrl null unless you want to parse them later
            },
          });
          episodesAddedOrUpdated++;
        }

        // 5. Success! Update the 'lastCheckedAt' timestamp
        await prisma.podcast.update({
          where: { id: podcast.id },
          data: { 
            lastCheckedAt: new Date(),
            lastError: null 
          }
        });

        podcastsProcessed++;

      } catch (feedError: any) {
        // If one podcast feed breaks (e.g., website is down), log the error 
        // in the database but continue checking the OTHER podcasts!
        console.error(`Failed to parse feed for ${podcast.title}:`, feedError.message);
        await prisma.podcast.update({
          where: { id: podcast.id },
          data: { 
            lastCheckedAt: new Date(),
            lastError: feedError.message 
          }
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Checked ${podcastsProcessed}/${activePodcasts.length} active podcasts. Processed ${episodesAddedOrUpdated} episodes.` 
    });

  } catch (error) {
    console.error("Cron Sync Fatal Error:", error);
    return NextResponse.json({ error: 'Fatal error during sync' }, { status: 500 });
  }
}