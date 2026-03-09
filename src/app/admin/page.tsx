import { PrismaClient } from '@prisma/client';
import AdminClientPage from './client-page';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  // 1. Fetch podcasts for the dropdowns
  const podcasts = await prisma.podcast.findMany({
    select: { id: true, title: true, category: true },
    orderBy: { title: 'asc' }
  });

  // 2. Fetch categories for the reordering tool
  const dbCategories = await prisma.category.findMany({
    orderBy: { sortOrder: 'asc' }
  });

  // 3. Pass them to your Client Page
  return <AdminClientPage podcasts={podcasts} dbCategories={dbCategories} />;
}