// Edge runtime Sentry init. Loaded from instrumentation.ts when
// NEXT_RUNTIME=edge (e.g. middleware, edge route handlers).
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  enabled: !!process.env.SENTRY_DSN,
});
