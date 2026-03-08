// src/app/admin/page.tsx
import { PrismaClient } from '@prisma/client';
import AdminClientPage from './client-page';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  // 1. Fetch all podcasts, sorted by title
  const allPodcasts = await prisma.podcast.findMany({
    orderBy: { title: 'asc' },
    select: { id: true, title: true, category: true },
  });

  // 2. Fetch all categories, sorted by their order
  // NOTE: If your Prisma model is named something else (like 'podcastCategory'), change 'category' below.
  const allCategories = await prisma.category.findMany({
    orderBy: { sortOrder: 'asc' },
    select: { id: true, name: true, sortOrder: true },
  });

  // 3. Pass BOTH to the client page
  return <AdminClientPage podcasts={allPodcasts} dbCategories={allCategories} />;
}