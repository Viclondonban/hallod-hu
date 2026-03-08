// src/app/api/update-banner/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { podcastId, bannerUrl } = body;

    if (!podcastId || typeof podcastId !== 'string') {
      return NextResponse.json({ error: 'Invalid Podcast ID provided.' }, { status: 400 });
    }
    if (!bannerUrl || typeof bannerUrl !== 'string' || !bannerUrl.startsWith('http')) {
      return NextResponse.json({ error: 'Invalid Banner URL provided.' }, { status: 400 });
    }

    console.log(`[API] Updating banner for podcast ID: ${podcastId}`);

    // Update the podcast record in the database
    const podcast = await prisma.podcast.update({
      where: { id: podcastId },
      data: {
        bannerImageUrl: bannerUrl,
        isFeatured: true, // Automatically mark as featured when a banner is set
      },
    });

    console.log(`[API] SUCCESS: Banner updated for: ${podcast.title}`);

    return NextResponse.json({
      status: 'Success',
      message: 'Banner updated successfully.',
      podcast: podcast
    }, { status: 200 });

  } catch (error) {
    console.error('[API] Error updating banner:', error);
    return NextResponse.json(
      { error: 'A server error occurred during update.', details: (error as Error).message },
      { status: 500 }
    );
  }
}