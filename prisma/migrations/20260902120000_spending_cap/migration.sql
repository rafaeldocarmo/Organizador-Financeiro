-- AlterTable
ALTER TABLE "User" ADD COLUMN     "closingDay" INTEGER;

-- CreateTable
CREATE TABLE "SpendingCap" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "SpendingCap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SpendingCap_userId_year_month_key" ON "SpendingCap"("userId", "year", "month");

-- AddForeignKey
ALTER TABLE "SpendingCap" ADD CONSTRAINT "SpendingCap_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
