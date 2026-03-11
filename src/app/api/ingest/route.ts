import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { PrismaClient } from '@prisma/client';

// 1. ADDED SLUGIFY FUNCTION (Handling Hungarian accents)
function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

function parseDurationToSeconds(durationStr: string | undefined | null): number | null {
  if (!durationStr) return null;
  if (/^\d+$/.test(durationStr)) return parseInt(durationStr, 10);
  const parts = durationStr.split(':').map(part => parseInt(part, 10));
  let seconds = 0;
  if (parts.length === 3) { seconds = parts[0] * 3600 + parts[1] * 60 + parts[2]; }
  else if (parts.length === 2) { seconds = parts[0] * 60 + parts[1]; }
  else { return null; }
  return isNaN(seconds) ? null : seconds;
}

const parser = new Parser();
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function POST(request: Request) {
  let feedUrl = '';
  try {
    const body = await request.json();
    feedUrl = body.url;
    const category = body.category;

    if (!feedUrl || typeof feedUrl !== 'string' || !feedUrl.startsWith('http')) {
      return NextResponse.json({ error: 'Invalid RSS URL provided.' }, { status: 400 });
    }

    console.log(`[API] Starting ingestion for: ${feedUrl}`);

    console.log('[API] Parsing feed...');
    let feed;
    try {
      feed = await parser.parseURL(feedUrl);
    } catch (parseError) {
      console.error('[API] RSS Parse Error:', parseError);
      return NextResponse.json({ error: `Failed to parse RSS. Is the URL correct?` }, { status: 422 });
    }

    // 2. GENERATE THE SLUG HERE
    const slug = slugify(feed.title || 'podcast');

    console.log(`[API] Feed found: "${feed.title}" with ${feed.items.length} episodes.`);

    console.log('[API] Upserting Podcast info...');
    const podcast = await prisma.podcast.upsert({
      where: { feedUrl: feedUrl },
      update: {
        title: feed.title || 'Unknown Title',
        description: feed.description?.substring(0, 1000),
        author: feed.itunes?.author,
        websiteUrl: feed.link,
        imageUrl: feed.image?.url || feed.itunes?.image,
        language: feed.language || 'hu',
        lastCheckedAt: new Date(),
        category: category || undefined,
      },
      create: {
        feedUrl: feedUrl,
        title: feed.title || 'Unknown Title',
        slug: slug, // 3. ADDED SLUG TO CREATE
        description: feed.description?.substring(0, 1000),
        author: feed.itunes?.author,
        websiteUrl: feed.link,
        imageUrl: feed.image?.url || feed.itunes?.image,
        language: feed.language || 'hu',
        lastCheckedAt: new Date(),
        category: category || 'Egyéb',
        isActive: true, // 4. ENSURE IT IS ACTIVE BY DEFAULT
      }
    });

    console.log(`[API] Processing ${feed.items.length} episodes for podcast ID: ${podcast.id}...`);
    let newEpisodesCount = 0;
    let updatedEpisodesCount = 0;

    for (const item of feed.items) {
      if (!item.enclosure || !item.enclosure.url) continue;
      if (!item.guid || !item.pubDate) continue;

      const durationSeconds = parseDurationToSeconds(item.itunes?.duration);

      const episode = await prisma.episode.upsert({
        where: {
          podcastId_guid: {
            podcastId: podcast.id,
            guid: item.guid,
          }
        },
        update: {
          title: item.title || 'Unknown Episode',
          description: (item.contentSnippet || item.description)?.substring(0, 1000),
          pubDate: new Date(item.pubDate),
          enclosureUrl: item.enclosure.url,
          duration: durationSeconds,
          imageUrl: item.itunes?.image || podcast.imageUrl,
        },
        create: {
          podcastId: podcast.id,
          guid: item.guid,
          title: item.title || 'Unknown Episode',
          description: (item.contentSnippet || item.description)?.substring(0, 1000),
          pubDate: new Date(item.pubDate),
          enclosureUrl: item.enclosure.url,
          duration: durationSeconds,
          imageUrl: item.itunes?.image || podcast.imageUrl,
        }
      });

      if (episode.createdAt.getTime() === episode.updatedAt.getTime()) {
          newEpisodesCount++;
      } else {
          updatedEpisodesCount++;
      }
    }

    return NextResponse.json({
      status: 'Success',
      message: `Podcast saved.`,
      podcast: podcast
    }, { status: 200 });

  } catch (error) {
    console.error('[API] Critical Error during ingestion:', error);
    if (feedUrl) {
       try {
         await prisma.podcast.update({
             where: { feedUrl: feedUrl },
             data: { lastError: (error as Error).message }
         });
       } catch (dbError) { 
         console.error('Could not save error to DB', dbError);
       }
    }
    return NextResponse.json(
      { error: 'A server error occurred.', details: (error as Error).message },
      { status: 500 }
    );
  }
}