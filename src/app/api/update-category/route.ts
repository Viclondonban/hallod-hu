// src/app/api/update-category/route.ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

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
  // getUser() re-validates the JWT against Supabase servers on every call.
  // getSession() only reads the cookie and trusts it, which Supabase flags as
  // insecure for any code path that makes an authorisation decision.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const allowedEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim())
    .filter(Boolean);
  if (!allowedEmails.includes(user.email || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

export async function POST(request: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const body = await request.json();
    const { podcastId, newCategory } = body;

    if (!podcastId || typeof podcastId !== 'string') {
      return NextResponse.json({ error: 'Invalid Podcast ID.' }, { status: 400 });
    }
    if (!newCategory || typeof newCategory !== 'string') {
      return NextResponse.json({ error: 'Invalid Category.' }, { status: 400 });
    }

    console.log(`[API] Updating category for podcast ID: ${podcastId} to "${newCategory}"`);

    const podcast = await prisma.podcast.update({
      where: { id: podcastId },
      data: {
        category: newCategory,
      },
    });

    console.log(`[API] SUCCESS: Category updated for: ${podcast.title}`);

    return NextResponse.json({
      status: 'Success',
      message: `Category for '${podcast.title}' updated to '${newCategory}'.`,
      podcast: podcast
    }, { status: 200 });

  } catch (error) {
    console.error('[API] Error updating category:', error);
    return NextResponse.json(
      { error: 'A server error occurred.' },
      { status: 500 }
    );
  }
}
