import { describe, expect, it, vi } from 'vitest';

// lib/api importa @/auth (next-auth) e @/lib/prisma. Os validadores são puros,
// mas o módulo inteiro carrega junto — então os dois vizinhos viram stub.
vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('./prisma', () => ({ prisma: {} }));

const { ApiError, clampInt, parseISODate, positiveAmount, positiveInt, requiredString } =
  await import('./api');

describe('clampInt', () => {
  it('prende na faixa', () => {
    expect(clampInt(0, 1, 12, 5)).toBe(1);
    expect(clampInt(99, 1, 12, 5)).toBe(12);
    expect(clampInt(7, 1, 12, 5)).toBe(7);
  });

  it('usa o fallback para valor não numérico', () => {
    // Regressão de SEG-5: ?year=abc virava NaN e derrubava a query com um 500.
    expect(clampInt('abc', 1970, 9999, 2026)).toBe(2026);
    expect(clampInt(null, 1970, 9999, 2026)).toBe(2026);
    expect(clampInt(undefined, 1970, 9999, 2026)).toBe(2026);
    expect(clampInt(Infinity, 1970, 9999, 2026)).toBe(2026);
  });

  it('trunca fracionário', () => {
    expect(clampInt('7.9', 1, 12, 5)).toBe(7);
  });

  it('aceita string numérica, como vem da query', () => {
    expect(clampInt('2026', 1970, 9999, 2000)).toBe(2026);
  });
});

describe('positiveAmount', () => {
  it('aceita valores positivos', () => {
    expect(positiveAmount(10.5)).toBe(10.5);
    expect(positiveAmount('250')).toBe(250);
  });

  it('rejeita zero e negativo', () => {
    // Regressão de SEG-5: `!amount` deixava passar -500, que invertia o saldo.
    expect(() => positiveAmount(0)).toThrow(ApiError);
    expect(() => positiveAmount(-500)).toThrow(ApiError);
  });

  it('rejeita não-número', () => {
    expect(() => positiveAmount('abc')).toThrow(ApiError);
    expect(() => positiveAmount(undefined)).toThrow(ApiError);
    expect(() => positiveAmount(NaN)).toThrow(ApiError);
  });

  it('erra com status 400, não 500', () => {
    try { positiveAmount(-1); } catch (e) { expect((e as InstanceType<typeof ApiError>).status).toBe(400); }
  });
});

describe('positiveInt', () => {
  it('aceita inteiro positivo', () => {
    expect(positiveInt(12, 'totalParcels')).toBe(12);
  });

  it('rejeita zero, negativo e fracionário', () => {
    expect(() => positiveInt(0, 'x')).toThrow(ApiError);
    expect(() => positiveInt(-3, 'x')).toThrow(ApiError);
    expect(() => positiveInt(2.5, 'x')).toThrow(ApiError);
  });
});

describe('requiredString', () => {
  it('apara o texto', () => {
    expect(requiredString('  Almoço  ', 'title')).toBe('Almoço');
  });

  it('rejeita vazio e só-espaço', () => {
    expect(() => requiredString('', 'title')).toThrow(ApiError);
    expect(() => requiredString('   ', 'title')).toThrow(ApiError);
    expect(() => requiredString(null, 'title')).toThrow(ApiError);
  });

  it('rejeita acima do limite', () => {
    expect(() => requiredString('x'.repeat(201), 'title', 200)).toThrow(ApiError);
    expect(requiredString('x'.repeat(200), 'title', 200)).toHaveLength(200);
  });
});

describe('parseISODate', () => {
  it('aceita data válida', () => {
    expect(parseISODate('2026-09-03')).toEqual({ year: 2026, month: 9, day: 3 });
  });

  it('rejeita formato errado', () => {
    expect(() => parseISODate('03/09/2026')).toThrow(ApiError);
    expect(() => parseISODate('2026-9-3')).toThrow(ApiError);
    expect(() => parseISODate('')).toThrow(ApiError);
  });

  it('rejeita mês fora da faixa', () => {
    expect(() => parseISODate('2026-13-01')).toThrow(ApiError);
    expect(() => parseISODate('2026-00-01')).toThrow(ApiError);
  });

  it('rejeita dia que não existe no mês', () => {
    // new Date normalizaria 31/02 para 03/03 em silêncio.
    expect(() => parseISODate('2026-02-31')).toThrow(ApiError);
    expect(() => parseISODate('2026-04-31')).toThrow(ApiError);
  });

  it('aceita 29/02 em ano bissexto e recusa fora dele', () => {
    expect(parseISODate('2028-02-29').day).toBe(29);
    expect(() => parseISODate('2026-02-29')).toThrow(ApiError);
  });
});
