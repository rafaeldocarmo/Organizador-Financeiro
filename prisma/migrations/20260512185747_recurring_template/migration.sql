-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "recurringTemplateId" TEXT;

-- CreateIndex
CREATE INDEX "Transaction_recurringTemplateId_monthId_idx" ON "Transaction"("recurringTemplateId", "monthId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_recurringTemplateId_fkey" FOREIGN KEY ("recurringTemplateId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
