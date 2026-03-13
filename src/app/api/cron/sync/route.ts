import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import Parser from 'rss-parser';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

const parser = new Parser();

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const podcasts = await prisma.podcast.findMany();

    let totalNewEpisodes = 0;

    for (const podcast of podcasts) {
      try {
        console.log(`Syncing: ${podcast.title}`);
        const rssUrl = podcast.feedUrl;

        if (!rssUrl) {
          console.error(`No RSS URL found for podcast: ${podcast.title}`);
          continue;
        }

        const feed = await parser.parseURL(rssUrl);

        for (const item of feed.items) {
          const audioUrl = item.enclosure?.url || item.link;
          // Grab the GUID from the feed, or fallback to the audioUrl if missing
          const guid = item.guid || audioUrl;

          if (!audioUrl || !item.title || !guid) continue;

          // Check if episode exists
          const existing = await prisma.episode.findFirst({
            where: { 
              OR: [
                { enclosureUrl: audioUrl },
                { guid: guid }
              ]
            },
          });

          if (!existing) {
            await prisma.episode.create({
              data: {
                guid: guid, // Added the missing required field!
                title: item.title,
                enclosureUrl: audioUrl,
                pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
                description: item.contentSnippet || item.content || '',
                podcastId: podcast.id,
              },
            });
            totalNewEpisodes++;
          }
        }
      } catch (podcastError) {
        console.error(`Error syncing ${podcast.title}:`, podcastError);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Processed ${podcasts.length} podcasts. Added ${totalNewEpisodes} new episodes.` 
    });

  } catch (error) {
    console.error('Global Cron Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}