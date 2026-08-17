import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
};

// withSentryConfig injects source-map upload and instrumentation hooks
// at build time. Only runs when SENTRY_AUTH_TOKEN + SENTRY_ORG + SENTRY_PROJECT
// are set — locally and without those env vars, this is a no-op passthrough.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Only upload source maps when explicitly enabled (avoid local dev noise).
  silent: !process.env.CI,
  // Don't fail the build if source-map upload fails (e.g. missing token).
  errorHandler: (err) => {
    console.warn('[sentry] source map upload skipped:', err.message);
  },
  // Delete source-map files after upload so they're not shipped to the
  // browser (still available in Sentry for stack-trace decoding).
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
});
