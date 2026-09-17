import { beforeEach, describe, expect, it, vi } from 'vitest';

// Os mocks precisam existir antes do import de ./recurring. `vi.mock` é içado,
// então os módulos reais (e o next-auth que lib/api arrasta) nunca carregam.
const db = {
  transactions: [] as Array<Record<string, unknown>>,
  months: new Map<string, { id: string; year: number; month: number }>(),
  createCalls: 0,
};

vi.mock('@/lib/prisma', () => ({
  prisma: {
    month: {
      findMany: vi.fn(async ({ where }: { where: { userId: string; OR: { year: number; month: number }[] } }) => {
        const querido = new Set(where.OR.map(m => `${where.userId}-${m.year}-${m.month}`));
        return [...db.months.values()]
          .filter(m => querido.has(m.id))
          .map(m => ({ id: m.id, year: m.year, month: m.month }));
      }),
    },
    transaction: {
      findFirst: vi.fn(async ({ where }: { where: Record<string, unknown> }) =>
        db.transactions.find(
          t =>
            t.recurringTemplateId === where.recurringTemplateId &&
            t.monthId === where.monthId,
        ) ?? null,
      ),
      findMany: vi.fn(async ({ where }: { where: { recurringTemplateId: string } }) =>
        db.transactions
          .filter(t => t.recurringTemplateId === where.recurringTemplateId)
          .map(t => ({ monthId: t.monthId })),
      ),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        db.createCalls += 1;
        const row = { id: `clone-${db.transactions.length + 1}`, ...data };
        db.transactions.push(row);
        return row;
      }),
      createMany: vi.fn(async ({ data }: { data: Record<string, unknown>[] }) => {
        db.createCalls += 1; // uma escrita em lote, não N
        for (const d of data) {
          db.transactions.push({ id: `clone-${db.transactions.length + 1}`, ...d });
        }
        return { count: data.length };
      }),
    },
  },
}));

vi.mock('@/lib/api', () => ({
  getOrCreateMonth: vi.fn(async (userId: string, year: number, month: number) => {
    const key = `${userId}-${year}-${month}`;
    if (!db.months.has(key)) db.months.set(key, { id: key, year, month });
    return db.months.get(key)!;
  }),
}));

const { addMonths, ensureCloneForMonth, ensureClonesThrough, horizonMonth, nextMonth } =
  await import('./recurring');

type Tx = Parameters<typeof ensureCloneForMonth>[0];

/** Template mínimo com os campos que ensureCloneForMonth lê. */
function template(over: Partial<Tx> = {}): Tx {
  return {
    id: 'tpl-1',
    userId: 'user-1',
    type: 'EXPENSE',
    title: 'Aluguel',
    description: null,
    amount: 2500,
    date: new Date(2026, 0, 15), // 15/jan/2026
    hasAttachment: false,
    isCredit: false,
    received: true,
    isRecurring: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    categoryId: 'cat-1',
    monthId: 'month-tpl',
    recurringTemplateId: null,
    ...over,
  } as Tx;
}

beforeEach(() => {
  db.transactions = [];
  db.months = new Map();
  db.createCalls = 0;
});

describe('nextMonth', () => {
  it('avança dentro do ano', () => {
    expect(nextMonth(2026, 5)).toEqual({ year: 2026, month: 6 });
  });

  it('vira o ano em dezembro', () => {
    expect(nextMonth(2026, 12)).toEqual({ year: 2027, month: 1 });
  });
});

describe('addMonths', () => {
  it('soma dentro do ano', () => {
    expect(addMonths(2026, 1, 3)).toEqual({ year: 2026, month: 4 });
  });

  it('atravessa a virada de ano', () => {
    expect(addMonths(2026, 11, 3)).toEqual({ year: 2027, month: 2 });
    expect(addMonths(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
  });

  it('aceita deslocamento zero e negativo', () => {
    expect(addMonths(2026, 6, 0)).toEqual({ year: 2026, month: 6 });
    expect(addMonths(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
  });

  it('é consistente com nextMonth aplicado n vezes', () => {
    let ym = { year: 2026, month: 10 };
    for (let i = 0; i < 5; i++) ym = nextMonth(ym.year, ym.month);
    expect(ym).toEqual(addMonths(2026, 10, 5));
  });
});

describe('horizonMonth', () => {
  it('projeta 3 meses à frente da data dada', () => {
    expect(horizonMonth(new Date(Date.UTC(2026, 8, 3)))).toEqual({ year: 2026, month: 12 });
  });

  it('atravessa o fim do ano', () => {
    expect(horizonMonth(new Date(Date.UTC(2026, 10, 15)))).toEqual({ year: 2027, month: 2 });
  });
});

describe('ensureCloneForMonth', () => {
  it('cria o clone com os campos do template', async () => {
    const r = await ensureCloneForMonth(template(), 2026, 3);
    expect(r?.created).toBe(true);
    expect(r?.clone.title).toBe('Aluguel');
    expect(r?.clone.amount).toBe(2500);
    expect(r?.clone.recurringTemplateId).toBe('tpl-1');
  });

  it('o clone não é ele próprio um template', async () => {
    const r = await ensureCloneForMonth(template(), 2026, 3);
    expect(r?.clone.isRecurring).toBe(false);
  });

  it('mantém o dia do mês', async () => {
    const r = await ensureCloneForMonth(template(), 2026, 3);
    const d = r!.clone.date as Date;
    expect([d.getFullYear(), d.getMonth() + 1, d.getDate()]).toEqual([2026, 3, 15]);
  });

  it('encurta o dia em mês curto: 31 vira 28 em fevereiro', async () => {
    const tpl = template({ date: new Date(2026, 0, 31) });
    const r = await ensureCloneForMonth(tpl, 2026, 2);
    const d = r!.clone.date as Date;
    expect([d.getMonth() + 1, d.getDate()]).toEqual([2, 28]);
  });

  it('o clone do dia 1 cai dentro do próprio mês (regressão DEB-2)', async () => {
    // Gravar o clone em meia-noite UTC o punha 3h antes do início do mês
    // calculado em meia-noite local: em BRT, o aluguel do dia 1 sumia do
    // dashboard. Reproduz aqui a faixa exata que dashboard/route.ts usa.
    const tpl = template({ date: new Date(2026, 0, 1) });
    const r = await ensureCloneForMonth(tpl, 2026, 3);
    const d = r!.clone.date as Date;

    const inicioDeMarco = new Date(2026, 2, 1);
    const fimDeMarco = new Date(2026, 3, 1);
    expect(d >= inicioDeMarco && d < fimDeMarco).toBe(true);
  });

  it('todo clone cai dentro do mês que pediu, em qualquer dia de origem', async () => {
    for (const dia of [1, 15, 28, 31]) {
      const tpl = template({ id: `tpl-${dia}`, date: new Date(2026, 0, dia) });
      for (const mes of [2, 3, 4]) {
        const r = await ensureCloneForMonth(tpl, 2026, mes);
        const d = r!.clone.date as Date;
        expect(d >= new Date(2026, mes - 1, 1) && d < new Date(2026, mes, 1)).toBe(true);
      }
    }
  });

  it('é idempotente: a segunda chamada não cria nada', async () => {
    const tpl = template();
    const a = await ensureCloneForMonth(tpl, 2026, 3);
    const b = await ensureCloneForMonth(tpl, 2026, 3);
    expect(a?.created).toBe(true);
    expect(b?.created).toBe(false);
    expect(b?.clone.id).toBe(a?.clone.id);
    expect(db.createCalls).toBe(1);
  });

  it('ignora transação que não é template', async () => {
    expect(await ensureCloneForMonth(template({ isRecurring: false }), 2026, 3)).toBeNull();
  });
});

describe('ensureClonesThrough', () => {
  it('preenche do mês seguinte ao template até o horizonte', async () => {
    // Template em jan/2026, horizonte abr/2026 -> fev, mar, abr.
    const n = await ensureClonesThrough(template(), 2026, 4);
    expect(n).toBe(3);
  });

  it('é idempotente: rodar de novo não duplica', async () => {
    const tpl = template();
    await ensureClonesThrough(tpl, 2026, 4);
    const segunda = await ensureClonesThrough(tpl, 2026, 4);
    expect(segunda).toBe(0);
    expect(db.transactions).toHaveLength(3);
  });

  it('grava os clones em lote, não um por um (regressão PER-2)', async () => {
    await ensureClonesThrough(template(), 2026, 7); // 6 meses
    expect(db.transactions).toHaveLength(6);
    expect(db.createCalls).toBe(1);
  });

  it('não escreve nada quando já está tudo preenchido', async () => {
    const tpl = template();
    await ensureClonesThrough(tpl, 2026, 4);
    db.createCalls = 0;
    await ensureClonesThrough(tpl, 2026, 4);
    expect(db.createCalls).toBe(0);
  });

  it('preenche lacuna deixada por execução pulada do cron', async () => {
    const tpl = template();
    await ensureClonesThrough(tpl, 2026, 3); // 2 clones: fev, mar
    expect(db.transactions).toHaveLength(2);

    // O cron ficou dois meses sem rodar e agora o horizonte é mai/2026.
    const criados = await ensureClonesThrough(tpl, 2026, 5);
    expect(criados).toBe(2); // abr, mai
    expect(db.transactions).toHaveLength(4);
  });

  it('atravessa a virada de ano', async () => {
    const tpl = template({ date: new Date(2026, 10, 10) }); // nov/2026
    const n = await ensureClonesThrough(tpl, 2027, 1); // dez, jan
    expect(n).toBe(2);
  });

  it('não faz nada quando o alvo já passou', async () => {
    expect(await ensureClonesThrough(template(), 2025, 12)).toBe(0);
    expect(db.createCalls).toBe(0);
  });

  it('recusa clones como origem — só templates geram clones', async () => {
    const clone = template({ recurringTemplateId: 'tpl-1' });
    expect(await ensureClonesThrough(clone, 2026, 6)).toBe(0);
  });

  it('recusa transação não recorrente', async () => {
    expect(await ensureClonesThrough(template({ isRecurring: false }), 2026, 6)).toBe(0);
  });
});
