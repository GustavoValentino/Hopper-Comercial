-- CreateEnum
CREATE TYPE "ProductUnit" AS ENUM ('KG', 'ML_G');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "unit" "ProductUnit" NOT NULL DEFAULT 'KG';
