"use server";

import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// 1. Fetch all podcasts for the manager to display
export async function getAllPodcasts() {
  return await prisma.podcast.findMany({
    select: { id: true, title: true, isActive: true, category: true },
    orderBy: { title: 'asc' }
  });
}

// 2. Toggle the active status (Hide/Unhide)
export async function togglePodcastStatus(id: string, currentStatus: boolean) {
  await prisma.podcast.update({
    where: { id },
    data: { isActive: !currentStatus },
  });

  // Force the live website to instantly update
  revalidatePath('/');
  revalidatePath('/admin');
}