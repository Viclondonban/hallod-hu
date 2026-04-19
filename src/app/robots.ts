import type { MetadataRoute } from 'next';

// Serve a proper robots.txt instead of letting the catch-all [slug] route
// absorb probe traffic. Every real bot asks for /robots.txt first, so giving
// it a 200 response saves a wasted Prisma lookup per probe.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api'],
      },
    ],
    sitemap: 'https://www.hallod.hu/sitemap.xml',
    host: 'https://www.hallod.hu',
  };
}
