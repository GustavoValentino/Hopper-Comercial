/*
  Warnings:

  - Added the required column `section` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Made the column `expirationDate` on table `Product` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "lotNumber" TEXT,
ADD COLUMN     "section" TEXT NOT NULL,
ALTER COLUMN "expirationDate" SET NOT NULL;
