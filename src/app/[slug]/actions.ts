'use server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export type SerializedEpisode = {
  id: string;
  title: string;
  description: string | null;
  pubDate: string; // ISO string — Date can't cross the server/client boundary
  duration: number | null;
  imageUrl: string | null;
  enclosureUrl: string;
};

const PAGE_SIZE = 20;

/**
 * Cursor-based pagination: fetch the next PAGE_SIZE episodes older than
 * the last loaded episode (identified by pubDate + id to handle ties).
 */
export async function fetchMoreEpisodes(
  podcastId: string,
  cursorPubDate: string,
  cursorId: string,
): Promise<SerializedEpisode[]> {
  const cursor = new Date(cursorPubDate);

  const episodes = await prisma.episode.findMany({
    where: {
      podcastId,
      OR: [
        { pubDate: { lt: cursor } },
        { pubDate: cursor, id: { lt: cursorId } }, // stable tie-breaking
      ],
    },
    orderBy: [{ pubDate: 'desc' }, { id: 'desc' }],
    take: PAGE_SIZE,
    select: {
      id: true,
      title: true,
      description: true,
      pubDate: true,
      duration: true,
      imageUrl: true,
      enclosureUrl: true,
    },
  });

  return episodes.map(ep => ({ ...ep, pubDate: ep.pubDate.toISOString() }));
}
