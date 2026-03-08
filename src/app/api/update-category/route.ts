// src/app/api/update-category/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function POST(request: Request) {
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

    // Update the podcast record in the database
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
      { error: 'A server error occurred.', details: (error as Error).message },
      { status: 500 }
    );
  }
}