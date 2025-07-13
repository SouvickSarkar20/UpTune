-- DropForeignKey
ALTER TABLE "Stream" DROP CONSTRAINT "Stream_addedBy_fkey";

-- AlterTable
ALTER TABLE "Stream" ALTER COLUMN "addedBy" DROP NOT NULL,
ALTER COLUMN "addedBy" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "Stream" ADD CONSTRAINT "Stream_addedBy_fkey" FOREIGN KEY ("addedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
