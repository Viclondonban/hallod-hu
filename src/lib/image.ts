// Hosts that block hotlink requests from Next.js's image optimiser
// (which sends no Referer header). Bypassing optimisation for these
// hosts lets the browser fetch directly, sending a normal Referer that
// most CDNs accept. Also stops the "upstream image response failed"
// 403 spam in the deploy logs.
const NO_OPTIMIZE_HOSTS = new Set([
  'storage.buzzsprout.com',
]);

/**
 * Returns true if the image URL should bypass Next.js image optimisation
 * (i.e. render like a plain <img> instead of going through /_next/image).
 */
export function shouldSkipImageOptimization(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname;
    return NO_OPTIMIZE_HOSTS.has(host);
  } catch {
    return false;
  }
}
