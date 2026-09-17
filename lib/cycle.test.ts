import { describe, expect, it } from 'vitest';
import {
  clampClosingDay,
  closingDate,
  closingDayResolver,
  cycleByKey,
  cycleFor,
  cycleProgress,
  saturdaysLeft,
  toResolver,
} from './cycle';

/** Meia-noite local, como o app grava e lê todas as datas. */
const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);
/** "2026-10-25" para asserções legíveis. */
const iso = (x: Date) =>
  `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;

describe('clampClosingDay', () => {
  it('mantém dias válidos', () => {
    expect(clampClosingDay(1)).toBe(1);
    expect(clampClosingDay(25)).toBe(25);
    expect(clampClosingDay(31)).toBe(31);
  });

  it('prende nos limites', () => {
    expect(clampClosingDay(0)).toBe(1);
    expect(clampClosingDay(-5)).toBe(1);
    expect(clampClosingDay(99)).toBe(31);
  });

  it('arredonda fracionário', () => {
    expect(clampClosingDay(25.4)).toBe(25);
    expect(clampClosingDay(25.6)).toBe(26);
  });
});

describe('closingDate', () => {
  it('encurta em mês curto: dia 31 em fevereiro vira 28', () => {
    expect(iso(closingDate(2026, 2, 31))).toBe('2026-02-28');
  });

  it('respeita ano bissexto', () => {
    expect(iso(closingDate(2028, 2, 31))).toBe('2028-02-29');
  });

  it('encurta em mês de 30 dias', () => {
    expect(iso(closingDate(2026, 4, 31))).toBe('2026-04-30');
  });

  it('não mexe quando o dia cabe', () => {
    expect(iso(closingDate(2026, 10, 25))).toBe('2026-10-25');
  });
});

describe('toResolver', () => {
  it('aceita um dia fixo', () => {
    expect(toResolver(25)(2026, 10)).toBe(25);
    expect(toResolver(25)(2030, 1)).toBe(25);
  });

  it('repassa um resolver intacto', () => {
    const r = (y: number, m: number) => (m === 10 ? 20 : 25);
    expect(toResolver(r)(2026, 10)).toBe(20);
  });
});

describe('closingDayResolver', () => {
  it('cai no dia padrão sem exceções', () => {
    expect(closingDayResolver(25)(2026, 10)).toBe(25);
  });

  it('aplica a exceção do ciclo', () => {
    const r = closingDayResolver(25, new Map([['2026-10', 23]]));
    expect(r(2026, 10)).toBe(23);
    expect(r(2026, 11)).toBe(25);
  });
});

describe('cycleByKey', () => {
  it('o ciclo é nomeado pelo mês em que FECHA', () => {
    const c = cycleByKey(2026, 10, 25);
    expect(iso(c.closesOn)).toBe('2026-10-25');
    expect(c.year).toBe(2026);
    expect(c.month).toBe(10);
  });

  it('começa no dia do fechamento anterior e termina na véspera do próprio', () => {
    const c = cycleByKey(2026, 10, 25);
    expect(iso(c.start)).toBe('2026-09-25');
    expect(iso(c.end)).toBe('2026-10-24');
    expect(c.totalDays).toBe(30);
  });

  it('endExclusive é o fechamento — a compra do dia já é do próximo ciclo', () => {
    const c = cycleByKey(2026, 10, 25);
    expect(iso(c.endExclusive)).toBe(iso(c.closesOn));
    expect(d(2026, 10, 24) < c.endExclusive).toBe(true);
    expect(d(2026, 10, 25) < c.endExclusive).toBe(false);
  });

  it('atravessa a virada de ano: janeiro começa em dezembro', () => {
    const c = cycleByKey(2026, 1, 25);
    expect(iso(c.start)).toBe('2025-12-25');
    expect(iso(c.closesOn)).toBe('2026-01-25');
    expect(c.totalDays).toBe(31);
  });

  it('encurta o fechamento em fevereiro sem quebrar o início', () => {
    const c = cycleByKey(2026, 2, 31);
    expect(iso(c.start)).toBe('2026-01-31');
    expect(iso(c.closesOn)).toBe('2026-02-28');
    expect(c.totalDays).toBe(28);
  });

  it('uma exceção antecipa só o próprio ciclo e alonga o seguinte', () => {
    // O banco antecipou out/2026 do dia 25 para o 23.
    const resolve = closingDayResolver(25, new Map([['2026-10', 23]]));

    const outubro = cycleByKey(2026, 10, resolve);
    expect(iso(outubro.start)).toBe('2026-09-25');
    expect(iso(outubro.closesOn)).toBe('2026-10-23');
    expect(outubro.closingDay).toBe(23);
    expect(outubro.totalDays).toBe(28);

    // O ciclo seguinte herda o início antecipado e fica mais longo.
    const novembro = cycleByKey(2026, 11, resolve);
    expect(iso(novembro.start)).toBe('2026-10-23');
    expect(iso(novembro.closesOn)).toBe('2026-11-25');
    expect(novembro.totalDays).toBe(33);
  });

  it('ciclos consecutivos se encaixam sem buraco nem sobreposição', () => {
    const a = cycleByKey(2026, 10, 25);
    const b = cycleByKey(2026, 11, 25);
    expect(iso(b.start)).toBe(iso(a.endExclusive));
  });

  it('prende dia de fechamento fora da faixa', () => {
    expect(cycleByKey(2026, 10, 99).closingDay).toBe(31);
    expect(cycleByKey(2026, 10, 0).closingDay).toBe(1);
  });
});

describe('cycleFor', () => {
  const resolve = 25;

  it('data antes do fechamento cai no ciclo que fecha neste mês', () => {
    expect(iso(cycleFor(d(2026, 10, 24), resolve).closesOn)).toBe('2026-10-25');
  });

  it('no dia do fechamento o ciclo já virou o seguinte', () => {
    expect(iso(cycleFor(d(2026, 10, 25), resolve).closesOn)).toBe('2026-11-25');
  });

  it('depois do fechamento continua no ciclo seguinte', () => {
    expect(iso(cycleFor(d(2026, 10, 26), resolve).closesOn)).toBe('2026-11-25');
  });

  it('dezembro depois do fechamento rola para janeiro do ano seguinte', () => {
    const c = cycleFor(d(2026, 12, 26), resolve);
    expect(c.year).toBe(2027);
    expect(c.month).toBe(1);
  });

  it('toda data cai dentro do ciclo que cycleFor devolve', () => {
    for (const day of [1, 15, 24, 25, 26, 31]) {
      const date = d(2026, 10, day);
      const c = cycleFor(date, resolve);
      expect(date >= c.start).toBe(true);
      expect(date < c.endExclusive).toBe(true);
    }
  });
});

describe('cycleProgress', () => {
  const c = cycleByKey(2026, 10, 25); // 25/set → 24/out, 30 dias

  it('ciclo futuro: nada decorrido', () => {
    const p = cycleProgress(c, d(2026, 9, 20));
    expect(p.isFuture).toBe(true);
    expect(p.elapsed).toBe(0);
    expect(p.left).toBe(30);
    expect(p.spendableDays).toBe(30);
  });

  it('primeiro dia conta como decorrido', () => {
    const p = cycleProgress(c, d(2026, 9, 25));
    expect(p.isCurrent).toBe(true);
    expect(p.elapsed).toBe(1);
    expect(p.left).toBe(29);
    expect(p.spendableDays).toBe(30);
    expect(p.daysToClose).toBe(30);
  });

  it('véspera do fechamento: fecha amanhã, ainda dá para gastar hoje', () => {
    const p = cycleProgress(c, d(2026, 10, 24));
    expect(p.isCurrent).toBe(true);
    expect(p.elapsed).toBe(30);
    expect(p.left).toBe(0);
    expect(p.spendableDays).toBe(1);
    expect(p.daysToClose).toBe(1);
  });

  it('no dia do fechamento o ciclo já é passado', () => {
    const p = cycleProgress(c, d(2026, 10, 25));
    expect(p.isPast).toBe(true);
    expect(p.spendableDays).toBe(0);
    expect(p.daysToClose).toBe(0);
  });

  it('num ciclo em curso spendableDays nunca é 0', () => {
    for (let day = 25; day <= 30; day++) {
      const p = cycleProgress(c, d(2026, 9, day));
      if (p.isCurrent) expect(p.spendableDays).toBeGreaterThan(0);
    }
  });

  it('elapsed + left é sempre totalDays num ciclo em curso', () => {
    for (const day of [25, 28, 30]) {
      const p = cycleProgress(c, d(2026, 9, day));
      expect(p.elapsed + p.left).toBe(c.totalDays);
    }
  });

  it('os três estados são mutuamente exclusivos', () => {
    for (const now of [d(2026, 9, 1), d(2026, 10, 1), d(2026, 11, 1)]) {
      const p = cycleProgress(c, now);
      expect([p.isCurrent, p.isPast, p.isFuture].filter(Boolean)).toHaveLength(1);
    }
  });

  it('atravessa o horário de verão sem perder um dia', () => {
    // Fev/2026 tem 28 dias; a contagem é feita em meia-noites locais.
    const fev = cycleByKey(2026, 2, 25);
    const p = cycleProgress(fev, d(2026, 2, 24));
    expect(p.elapsed + p.left).toBe(fev.totalDays);
    expect(p.daysToClose).toBe(1);
  });
});

describe('saturdaysLeft', () => {
  const c = cycleByKey(2026, 10, 25); // 25/set/2026 → 24/out/2026

  it('conta os sábados restantes contando hoje', () => {
    // 24/out/2026 é sábado; é o último dia do ciclo.
    expect(d(2026, 10, 24).getDay()).toBe(6);
    expect(saturdaysLeft(c, d(2026, 10, 24))).toBe(1);
  });

  it('não conta sábado depois do fechamento', () => {
    expect(saturdaysLeft(c, d(2026, 10, 25))).toBe(0);
  });

  it('num ciclo futuro conta a partir do início, não de hoje', () => {
    const inteiro = saturdaysLeft(c, d(2026, 9, 1));
    const doInicio = saturdaysLeft(c, d(2026, 9, 25));
    expect(inteiro).toBe(doInicio);
  });

  it('um ciclo de 30 dias tem 4 ou 5 sábados', () => {
    const n = saturdaysLeft(c, d(2026, 9, 25));
    expect(n).toBeGreaterThanOrEqual(4);
    expect(n).toBeLessThanOrEqual(5);
  });

  it('nunca é negativo', () => {
    expect(saturdaysLeft(c, d(2027, 1, 1))).toBe(0);
  });
});
