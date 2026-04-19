import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Parser from 'rss-parser';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

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
  // getUser() re-validates the JWT against Supabase servers on every call.
  // getSession() only reads the cookie and trusts it, which Supabase flags as
  // insecure for any code path that makes an authorisation decision.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const allowedEmails = (process.env.ADMIN_EMAILS || '')
    .split(',').map(e => e.trim()).filter(Boolean);
  if (!allowedEmails.includes(user.email || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

// Strict 8s timeout per feed — any slower feed is skipped, not blocking
const parser = new Parser({
  timeout: 8000,
  customFields: {
    item: [
      ['itunes:image', 'itunesImage'],
      ['itunes:duration', 'itunesDuration'],
    ],
  },
});

// Process at most this many items per feed — older episodes are unlikely to
// be missing images/durations, and scanning everything causes Railway timeouts.
const MAX_BACKFILL_ITEMS = 50;

async function backfillPodcast(podcast: { id: string; title: string; feedUrl: string }) {
  const feed = await parser.parseURL(podcast.feedUrl);
  let updated = 0;

  for (const item of feed.items.slice(0, MAX_BACKFILL_ITEMS)) {
    const audioUrl = item.enclosure?.url || item.link;
    const guid = item.guid || audioUrl;
    if (!guid) continue;

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

    if (!episodeImageUrl && !durationSeconds) continue;

    const result = await prisma.episode.updateMany({
      where: {
        podcastId: podcast.id,
        guid,
        OR: [
          ...(episodeImageUrl ? [{ imageUrl: null }] : []),
          ...(durationSeconds ? [{ duration: null }] : []),
        ],
      },
      data: {
        ...(episodeImageUrl && { imageUrl: episodeImageUrl }),
        ...(durationSeconds && { duration: durationSeconds }),
      },
    });

    updated += result.count;
  }

  return updated;
}

export async function POST(): Promise<NextResponse> {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const podcasts = await prisma.podcast.findMany({
      where: { isActive: true },
      select: { id: true, title: true, feedUrl: true },
    });

    // Run all feeds in parallel — total time = slowest feed, not sum of all
    const settled = await Promise.allSettled(
      podcasts.map(podcast => backfillPodcast(podcast))
    );

    let totalUpdated = 0;
    const errors: string[] = [];

    settled.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        totalUpdated += result.value;
      } else {
        const msg = result.reason instanceof Error ? result.reason.message : String(result.reason);
        errors.push(`${podcasts[i].title}: ${msg}`);
      }
    });

    return NextResponse.json({
      success: true,
      message: `Backfill complete. Updated ${totalUpdated} episodes across ${podcasts.length} podcasts.`,
      totalUpdated,
      failedFeeds: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('Backfill error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
