import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { PrismaClient } from '@prisma/client';

// Helper function to convert duration strings (e.g., "01:05:30" or "3930") to integer seconds
function parseDurationToSeconds(durationStr: string | undefined | null): number | null {
  if (!durationStr) return null;
  // If it's just numbers (e.g. "3600"), parse it directly
  if (/^\d+$/.test(durationStr)) {
    return parseInt(durationStr, 10);
  }
  // If it's HH:MM:SS format (e.g. "01:05:30" or "10:30")
  const parts = durationStr.split(':').map(part => parseInt(part, 10));
  let seconds = 0;
  if (parts.length === 3) { seconds = parts[0] * 3600 + parts[1] * 60 + parts[2]; }
  else if (parts.length === 2) { seconds = parts[0] * 60 + parts[1]; }
  else { return null; } // Unrecognized format
  return isNaN(seconds) ? null : seconds;
}


const parser = new Parser();
// Use global Prisma instance for dev
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function POST(request: Request) {
  let feedUrl = '';
  try {
    const body = await request.json();
    feedUrl = body.url;
    // <-- NEW: Get the category and banner URL
    const category = body.category;
    

    if (!feedUrl || typeof feedUrl !== 'string' || !feedUrl.startsWith('http')) {
      return NextResponse.json({ error: 'Invalid RSS URL provided.' }, { status: 400 });
    }

    console.log(`[API] Starting ingestion for: ${feedUrl}`);

    // 1. Parse RSS
    console.log('[API] Parsing feed...');
    let feed;
    try {
      feed = await parser.parseURL(feedUrl);
    } catch (parseError) {
      console.error('[API] RSS Parse Error:', parseError);
      return NextResponse.json({ error: `Failed to parse RSS. Is the URL correct?` }, { status: 422 });
    }

    console.log(`[API] Feed found: "${feed.title}" with ${feed.items.length} episodes.`);


    // 2. Save/Update Podcast Info (The Container)
    console.log('[API] Upserting Podcast info...');
    const podcast = await prisma.podcast.upsert({
      where: { feedUrl: feedUrl },
      update: {
        title: feed.title || 'Unknown Title',
        description: feed.description?.substring(0, 1000), // Limit description length
        author: feed.itunes?.author,
        websiteUrl: feed.link,
        imageUrl: feed.image?.url || feed.itunes?.image,
        language: feed.language || 'hu',
        lastCheckedAt: new Date(),
        // <-- NEW: Update the category and banner image
        category: category || undefined, // Only update if provided
       
      },
      create: {
        feedUrl: feedUrl,
        title: feed.title || 'Unknown Title',
        description: feed.description?.substring(0, 1000),
        author: feed.itunes?.author,
        websiteUrl: feed.link,
        imageUrl: feed.image?.url || feed.itunes?.image,
        language: feed.language || 'hu',
        lastCheckedAt: new Date(),
        // <-- NEW: Create with the category and banner image
        category: category || 'Egyéb', // Default to 'Egyéb'
       
      }
    });

    // 3. Loop through and save Episodes (The Content)
    console.log(`[API] Processing ${feed.items.length} episodes for podcast ID: ${podcast.id}...`);
    let newEpisodesCount = 0;
    let updatedEpisodesCount = 0;

    // We use a loop to process episodes one by one
    for (const item of feed.items) {
      // Skip items that don't have an audio file link (enclosure)
      if (!item.enclosure || !item.enclosure.url) {
        console.log(`[API] Skipping item "${item.title}" - No audio file found.`);
        continue;
      }

      // Skip items without a GUID or Date (essential for sorting/deduping)
      if (!item.guid || !item.pubDate) {
         console.log(`[API] Skipping item "${item.title}" - Missing GUID or Date.`);
         continue;
      }

      const durationSeconds = parseDurationToSeconds(item.itunes?.duration);

      // The Upsert magic: Find episode by Podcast ID + Episode GUID combination.
      const episode = await prisma.episode.upsert({
        where: {
          // This corresponds to the @@unique identifier in schema.prisma
          podcastId_guid: {
            podcastId: podcast.id,
            guid: item.guid,
          }
        },
        update: {
          // Update details if changed
          title: item.title || 'Unknown Episode',
          description: (item.contentSnippet || item.description)?.substring(0, 1000),
          pubDate: new Date(item.pubDate),
          enclosureUrl: item.enclosure.url,
          duration: durationSeconds,
          imageUrl: item.itunes?.image || podcast.imageUrl, // Fallback to podcast cover if no episode cover
        },
        create: {
          // Link it to the parent podcast
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

      // Check if it was created newly or just updated (based on createdAt timestamp)
      if (episode.createdAt.getTime() === episode.updatedAt.getTime()) {
          newEpisodesCount++;
      } else {
          updatedEpisodesCount++;
      }
      // A little log every 50 episodes just so we know it's not frozen on huge feeds
      if ((newEpisodesCount + updatedEpisodesCount) % 50 === 0) {
         console.log(`[API] Processed ${newEpisodesCount + updatedEpisodesCount} episodes so far...`);
      }
    }

    console.log(`[API] SUCCESS: Finished processing. New: ${newEpisodesCount}, Updated: ${updatedEpisodesCount}`);

    return NextResponse.json({
      status: 'Success',
      message: `Podcast saved. Processed ${feed.items.length} items. (New: ${newEpisodesCount}, Updated: ${updatedEpisodesCount})`,
      podcast: podcast,
      stats: { total: feed.items.length, new: newEpisodesCount, updated: updatedEpisodesCount }
    }, { status: 200 });


  } catch (error) {
    console.error('[API] Critical Error during ingestion:', error);
    // Mark the podcast as having an error if possible
    if (feedUrl) {
       try {
         await prisma.podcast.update({
             where: { feedUrl: feedUrl },
             data: { lastError: (error as Error).message }
         });
       } catch (dbError) { /* Ignore update error if podcast doesn't exist yet */ }
    }

    return NextResponse.json(
      { error: 'A server error occurred during ingestion.', details: (error as Error).message },
      { status: 500 }
    );
  }
}