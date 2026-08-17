-- AlterTable: track per-podcast sync failure state so dead feeds
-- can be auto-disabled after N consecutive failures instead of
-- being retried every cron tick forever.
ALTER TABLE "Podcast" ADD COLUMN "lastErrorAt" TIMESTAMP(3);
ALTER TABLE "Podcast" ADD COLUMN "consecutiveFailures" INTEGER NOT NULL DEFAULT 0;
