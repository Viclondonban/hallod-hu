-- Add HTTP conditional request fields to Podcast table
ALTER TABLE "Podcast" ADD COLUMN "feedEtag" TEXT;
ALTER TABLE "Podcast" ADD COLUMN "feedLastModified" TEXT;
