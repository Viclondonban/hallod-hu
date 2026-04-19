import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

const BASE = 'https://www.hallod.hu';

// Rebuild at most once an hour. A new podcast or episode becoming crawlable
// within the hour is fine; more frequent rebuilds would just spam the DB.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [podcasts, categories] = await Promise.all([
    prisma.podcast.findMany({
      where: { isActive: true, slug: { not: null } },
      select: { slug: true, updatedAt: true },
    }),
    prisma.category.findMany({ select: { name: true } }),
  ]);

  const now = new Date();

  return [
    {
      url: BASE,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    ...categories.map((c) => ({
      url: `${BASE}/category/${encodeURIComponent(c.name)}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...podcasts
      .filter((p) => p.slug !== null)
      .map((p) => ({
        url: `${BASE}/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: 'daily' as const,
        priority: 0.8,
      })),
  ];
}
