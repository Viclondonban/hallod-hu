// Client-side Sentry init. Loaded automatically by Next.js when this
// file exists at the project root. Runs once per page load in the
// browser only — never on the server.
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Sample only 10% of transactions to stay inside the free-tier quota.
  // Bump to 1.0 temporarily when actively debugging.
  tracesSampleRate: 0.1,
  // Don't send anything if the DSN isn't configured (e.g. local dev).
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Filter noisy browser extension and bot errors.
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    'Non-Error promise rejection captured',
  ],
});

// Required for Next.js router transitions to appear in traces.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
