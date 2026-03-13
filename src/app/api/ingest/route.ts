import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Parser from 'rss-parser';
import { PrismaClient } from '@prisma/client';

// --- Auth helper ---
async function requireAdmin(): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const allowedEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim())
    .filter(Boolean);
  if (!allowedEmails.includes(session.user?.email || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

// --- Slug helper ---
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

// --- Duration parser ---
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
  const authError = await requireAdmin();
  if (authError) return authError;

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
      return NextResponse.json({ error: 'Failed to parse RSS. Is the URL correct?' }, { status: 422 });
    }

    const slug = slugify(feed.title || 'podcast');

    console.log(`[API] Feed found: "${feed.title}" with ${feed.items.length} episodes.`);

    console.log('[API] Upserting Podcast info...');
    const podcast = await prisma.podcast.upsert({
      where: { feedUrl: feedUrl },
      update: {
        slug: slug, // Keep slug in sync with title changes
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
        slug: slug,
        description: feed.description?.substring(0, 1000),
        author: feed.itunes?.author,
        websiteUrl: feed.link,
        imageUrl: feed.image?.url || feed.itunes?.image,
        language: feed.language || 'hu',
        lastCheckedAt: new Date(),
        category: category || 'Egyéb',
        isActive: true,
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

    console.log(`[API] Done. New: ${newEpisodesCount}, Updated: ${updatedEpisodesCount}`);

    return NextResponse.json({
      status: 'Success',
      message: 'Podcast saved.',
      podcast: podcast
    }, { status: 200 });

  } catch (error) {
    console.error('[API] Critical Error during ingestion:', error);
    if (feedUrl) {
      try {
        const errorMsg = error instanceof Error ? error.message : String(error);
        await prisma.podcast.update({
          where: { feedUrl: feedUrl },
          data: { lastError: errorMsg }
        });
      } catch (dbError) {
        console.error('Could not save error to DB', dbError);
      }
    }
    return NextResponse.json(
      { error: 'A server error occurred.' },
      { status: 500 }
    );
  }
}
