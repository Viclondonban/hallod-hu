import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
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

// Use the shared singleton so we don't create a new connection per request
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

interface CategoryInput {
  id?: string;
  name: string;
  sortOrder: number;
}

export async function POST(request: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const body = await request.json();
    const { orderedCategories } = body;

    if (!orderedCategories || !Array.isArray(orderedCategories)) {
      return NextResponse.json({ error: 'Invalid data format.' }, { status: 400 });
    }

    // Use upsert so we never delete categories that are still referenced by podcasts.
    // New categories (no id) are created; existing ones are updated in-place.
    await prisma.$transaction(async (tx) => {
      for (const cat of orderedCategories as CategoryInput[]) {
        await tx.category.upsert({
          where: { name: cat.name },
          update: { sortOrder: cat.sortOrder },
          create: { name: cat.name, sortOrder: cat.sortOrder },
        });
      }
    });

    return NextResponse.json({ message: 'Categories saved successfully!' }, { status: 200 });

  } catch (error) {
    console.error('Error saving categories:', error);
    return NextResponse.json({ error: 'Failed to save categories.' }, { status: 500 });
  }
}
