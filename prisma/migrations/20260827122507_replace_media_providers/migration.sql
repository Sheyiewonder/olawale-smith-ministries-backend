/*
  Warnings:

  - The values [R2,SUPABASE] on the enum `MediaProvider` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "MediaProvider_new" AS ENUM ('CLOUDINARY', 'YOUTUBE', 'EXTERNAL');
ALTER TABLE "MediaAsset" ALTER COLUMN "provider" TYPE "MediaProvider_new" USING ("provider"::text::"MediaProvider_new");
ALTER TYPE "MediaProvider" RENAME TO "MediaProvider_old";
ALTER TYPE "MediaProvider_new" RENAME TO "MediaProvider";
DROP TYPE "public"."MediaProvider_old";
COMMIT;
