-- AlterTable
ALTER TABLE "User" ADD COLUMN     "whatsappNumber" TEXT,
ADD COLUMN     "whatsappOptIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whatsappOtpAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "whatsappOtpCode" TEXT,
ADD COLUMN     "whatsappOtpExpires" TIMESTAMP(3),
ADD COLUMN     "whatsappOtpLastSentAt" TIMESTAMP(3);
