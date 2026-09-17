import type { NextRequest } from "next/server";
import { prisma } from "./prisma";
import { auth } from "@/auth";

/**
 * Erro cuja mensagem é segura para mostrar ao usuário — validação de entrada,
 * regra de negócio, recurso não encontrado. Qualquer outra exceção é tratada
 * como interna e nunca tem a mensagem repassada (ver `fail`).
 */
export class ApiError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Resolve o id do usuário autenticado. Lança se não houver sessão.
 *
 * Caminho rápido: o proxy decodifica o JWT e repassa o id em `x-user-id`,
 * poupando um segundo `auth()` por rota. O header só é confiável porque o
 * proxy o REESCREVE em toda requisição que chega ao /api — inclusive apagando
 * o que o cliente tenha mandado quando não há id resolvido. Se aquele
 * contrato mudar, esta função vira um bypass de autenticação: mexer nos dois
 * lugares junto.
 */
export async function getUserId(req?: NextRequest): Promise<string> {
  const fromHeader = req?.headers.get("x-user-id");
  if (fromHeader) return fromHeader;
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new ApiError("Unauthorized", 401);
  return id;
}

/**
 * Garante que a categoria existe e que este usuário pode usá-la — a dele ou uma
 * do sistema. Sem isso, `categoryId` vindo do corpo da requisição permite
 * anexar lançamentos à categoria privada de outra conta (e, como as respostas
 * incluem `category`, ler nome e cor dela de volta).
 */
export async function assertCategory(categoryId: string, userId: string): Promise<void> {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, OR: [{ isSystem: true }, { userId }] },
    select: { id: true },
  });
  if (!category) throw new ApiError("Categoria inválida", 400);
}

/** Mês de referência, criando se não existir. Só para handlers de escrita. */
export async function getOrCreateMonth(userId: string, year: number, month: number) {
  return prisma.month.upsert({
    where: { userId_year_month: { userId, year, month } },
    update: {},
    create: { userId, year, month },
  });
}

/**
 * Mês de referência sem criar nada. Usado nos GET: um handler de leitura que
 * grava deixa qualquer usuário autenticado encher a tabela Month variando os
 * parâmetros da query, além de quebrar a premissa de que GET é seguro para o
 * service worker e para qualquer cache no caminho.
 */
export async function findMonth(userId: string, year: number, month: number) {
  return prisma.month.findUnique({
    where: { userId_year_month: { userId, year, month } },
  });
}

export function ok<T>(data: T, status = 200) {
  return Response.json(data, { status });
}

export function err(message: string, status = 400) {
  const finalStatus = message === "Unauthorized" ? 401 : status;
  return Response.json({ error: message }, { status: finalStatus });
}

/**
 * Resposta de erro para o `catch` das rotas.
 *
 * Só `ApiError` tem a mensagem repassada. O resto vira "Erro interno": as
 * exceções do Prisma trazem modelo, campo, tipo esperado e trecho da
 * invocação — um mapa do banco entregue a quem mandar um payload malformado.
 */
export function fail(e: unknown, context: string) {
  if (e instanceof ApiError) return err(e.message, e.status);
  console.error(`[${context}]`, e);
  return Response.json({ error: "Erro interno" }, { status: 500 });
}

// ─── validação de entrada ──────────────────────────────────────────────────

/**
 * Inteiro dentro de [min, max]; `fallback` quando ausente ou não numérico.
 * Valor fora da faixa é preso nela.
 *
 * O teste de ausência vem antes do Number() de propósito: `Number(null)` e
 * `Number('')` são 0, que passaria por finito e viraria `min` — um
 * `?year=` vazio devolveria 1970 em vez do ano corrente.
 */
export function clampInt(raw: unknown, min: number, max: number, fallback: number): number {
  if (raw === null || raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

/** Valor monetário: finito e maior que zero. Lança `ApiError` se não for. */
export function positiveAmount(raw: unknown, field = "amount"): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new ApiError(`${field} deve ser um número maior que zero`);
  }
  return n;
}

/** Inteiro positivo (nº de parcelas, por exemplo). */
export function positiveInt(raw: unknown, field: string): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    throw new ApiError(`${field} deve ser um inteiro maior que zero`);
  }
  return n;
}

/** Texto não-vazio, já aparado. */
export function requiredString(raw: unknown, field: string, maxLength = 500): string {
  if (typeof raw !== "string" || !raw.trim()) {
    throw new ApiError(`${field} é obrigatório`);
  }
  const value = raw.trim();
  if (value.length > maxLength) {
    throw new ApiError(`${field} excede ${maxLength} caracteres`);
  }
  return value;
}

/** "YYYY-MM-DD" → { year, month, day }, validando o calendário de verdade. */
export function parseISODate(raw: unknown, field = "date"): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(raw));
  if (!match) throw new ApiError(`${field} deve estar no formato YYYY-MM-DD`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) throw new ApiError(`${field} tem mês inválido`);
  // Rejeita 31/02: o Date normaliza para 03/03 em silêncio.
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > lastDay) throw new ApiError(`${field} tem dia inválido`);
  return { year, month, day };
}

/**
 * { year, month } da query, ou o mês corrente. Faixa validada: sem isso,
 * `?year=abc` produz NaN, vira `new Date(NaN)` e derruba a query com um 500.
 */
export function parseMonthParams(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const now = new Date();
  const year = clampInt(sp.get("year") ?? now.getFullYear(), 1970, 9999, now.getFullYear());
  const month = clampInt(sp.get("month") ?? now.getMonth() + 1, 1, 12, now.getMonth() + 1);
  return { year, month };
}

/** Teto de paginação: sem ele, `?limit=99999999` puxa a tabela inteira. */
export const MAX_LIMIT = 500;

export function parseLimit(req: NextRequest, fallback = 50): number {
  return clampInt(req.nextUrl.searchParams.get("limit") ?? fallback, 1, MAX_LIMIT, fallback);
}
