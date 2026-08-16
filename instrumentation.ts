// Next.js instrumentation hook, called once per runtime at startup.
// See https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// Forwards errors thrown inside React Server Components, route handlers,
// and server actions to Sentry. Without this, only unhandled crashes are
// captured — expected exceptions caught by Next.js's error boundary go
// silently.
export const onRequestError = Sentry.captureRequestError;
