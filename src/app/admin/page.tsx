// src/app/admin/page.tsx
import { PrismaClient } from '@prisma/client';
import AdminClientPage from './client-page';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  // Fetch all podcasts, sorted by title
  // CRITICAL CHANGE: Select 'category' as well
  const allPodcasts = await prisma.podcast.findMany({
    orderBy: { title: 'asc' },
    select: { id: true, title: true, category: true },
  });

  return <AdminClientPage podcasts={allPodcasts} />;
}