// Server-side Sentry init. Loaded from instrumentation.ts.
// Captures errors from route handlers, server actions, and the cron sync.
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  enabled: !!process.env.SENTRY_DSN,
  // Common noise we don't want to see:
  //   - Server Action hash mismatches after a deploy (unavoidable, user just refreshes)
  //   - upstream image response failed (external CDN issues)
  //   - HTTP 404/410 from dead RSS feeds (handled by auto-disable logic)
  ignoreErrors: [
    'Failed to find Server Action',
    'upstream image response failed',
    /Error syncing .+: Error: HTTP (404|410)/,
  ],
});
