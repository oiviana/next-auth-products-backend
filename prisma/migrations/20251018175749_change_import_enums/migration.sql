/*
  Warnings:

  - The values [DONE] on the enum `ImportStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ImportStatus_new" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED');
ALTER TABLE "public"."CSVImportJob" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "CSVImportJob" ALTER COLUMN "status" TYPE "ImportStatus_new" USING ("status"::text::"ImportStatus_new");
ALTER TYPE "ImportStatus" RENAME TO "ImportStatus_old";
ALTER TYPE "ImportStatus_new" RENAME TO "ImportStatus";
DROP TYPE "public"."ImportStatus_old";
ALTER TABLE "CSVImportJob" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."CSVImportJob" DROP CONSTRAINT "CSVImportJob_userId_fkey";

-- AlterTable
ALTER TABLE "CSVImportJob" ADD COLUMN     "errorRows" INTEGER,
ALTER COLUMN "processedRows" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "CSVImportJob" ADD CONSTRAINT "CSVImportJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
