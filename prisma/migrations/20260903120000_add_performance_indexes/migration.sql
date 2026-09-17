-- Índices de performance.
--
-- O Postgres não cria índice para chave estrangeira automaticamente (diferente
-- do MySQL), e até aqui o único índice não-único do schema era
-- Transaction_recurringTemplateId_monthId_idx. Toda query da aplicação filtra
-- por "userId", quase sempre combinado com uma faixa de data.
--
-- Todos são CREATE INDEX simples: não reescrevem dados e não alteram o schema
-- lógico. Em tabelas grandes o CREATE INDEX pega um lock de escrita; se isso
-- for um problema, troque por CREATE INDEX CONCURRENTLY (que não pode rodar
-- dentro de transação, então precisa sair do fluxo do prisma migrate).

-- Transaction: userId + date é o filtro de /fluxo, /gastos e da projeção;
-- userId + type + date é o do dashboard, que separa INCOME de EXPENSE.
CREATE INDEX "Transaction_userId_date_idx" ON "Transaction"("userId", "date");
CREATE INDEX "Transaction_userId_type_date_idx" ON "Transaction"("userId", "type", "date");
CREATE INDEX "Transaction_categoryId_idx" ON "Transaction"("categoryId");
CREATE INDEX "Transaction_monthId_idx" ON "Transaction"("monthId");

-- Installment: listadas por usuário e ordenadas por startDate.
CREATE INDEX "Installment_userId_startDate_idx" ON "Installment"("userId", "startDate");
CREATE INDEX "Installment_categoryId_idx" ON "Installment"("categoryId");

-- Investment e histórico: o gráfico de linha lê snapshots por investimento
-- ordenados por data decrescente.
CREATE INDEX "Investment_userId_idx" ON "Investment"("userId");
CREATE INDEX "InvestmentSnapshot_investmentId_recordedAt_idx" ON "InvestmentSnapshot"("investmentId", "recordedAt");

-- Budget: o unique (userId, categoryId, monthId) não serve para a consulta por
-- (userId, monthId), que é como a tela de categorias lê os orçamentos.
CREATE INDEX "Budget_userId_monthId_idx" ON "Budget"("userId", "monthId");
CREATE INDEX "Budget_categoryId_idx" ON "Budget"("categoryId");

-- Category: OR [{ isSystem: true }, { userId }] em toda listagem.
CREATE INDEX "Category_userId_idx" ON "Category"("userId");
