// Only images from our own domain are worth running through Next.js's
// image optimiser. Podcast covers from external hosts are:
//   1. Already well-sized (~1400px squares) so optimisation savings are marginal
//   2. Served from many CDNs, several of which block hotlinking (Buzzsprout 403,
//      Substack 404 on stale URLs, Internet Archive 500s) — every failed
//      optimisation attempt costs a server round-trip and pollutes logs
//   3. Browser-cached after first load anyway
//
// Bypassing optimisation makes Next.js render <img src="direct-url"> which
// the browser fetches with a normal Referer — most CDNs accept that.
const OWN_HOSTNAMES = new Set([
  'www.hallod.hu',
  'hallod.hu',
]);

/**
 * Returns true if the image URL should bypass Next.js image optimisation
 * (i.e. render like a plain <img> instead of going through /_next/image).
 */
export function shouldSkipImageOptimization(url: string | null | undefined): boolean {
  if (!url) return false;
  // Relative URLs are our own — let Next.js optimise them.
  if (url.startsWith('/')) return false;
  try {
    const host = new URL(url).hostname;
    // Bypass optimisation for anything that isn't ours.
    return !OWN_HOSTNAMES.has(host);
  } catch {
    return false;
  }
}
