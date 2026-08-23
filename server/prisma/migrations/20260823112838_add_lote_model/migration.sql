/*
  Warnings:

  - You are about to drop the column `expirationDate` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `lotNumber` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `stockQuantity` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "expirationDate",
DROP COLUMN "lotNumber",
DROP COLUMN "stockQuantity";

-- CreateTable
CREATE TABLE "Lote" (
    "loteId" TEXT NOT NULL,
    "expirationDate" TIMESTAMPTZ NOT NULL,
    "stockQuantity" INTEGER NOT NULL,
    "lotNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "Lote_pkey" PRIMARY KEY ("loteId")
);

-- AddForeignKey
ALTER TABLE "Lote" ADD CONSTRAINT "Lote_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("productId") ON DELETE CASCADE ON UPDATE CASCADE;
