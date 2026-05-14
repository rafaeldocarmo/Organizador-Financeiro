/*
  Warnings:

  - You are about to drop the `FixedExpense` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FixedExpensePayment` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "FixedExpense" DROP CONSTRAINT "FixedExpense_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "FixedExpense" DROP CONSTRAINT "FixedExpense_userId_fkey";

-- DropForeignKey
ALTER TABLE "FixedExpensePayment" DROP CONSTRAINT "FixedExpensePayment_fixedExpenseId_fkey";

-- DropForeignKey
ALTER TABLE "FixedExpensePayment" DROP CONSTRAINT "FixedExpensePayment_monthId_fkey";

-- DropTable
DROP TABLE "FixedExpense";

-- DropTable
DROP TABLE "FixedExpensePayment";

-- DropEnum
DROP TYPE "RecurrencePeriod";
