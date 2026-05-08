export const brl = (n: number, opts: { signed?: boolean } = {}): string => {
  const sign = n < 0 ? '−' : '';
  const v = Math.abs(n);
  return `${opts.signed && n > 0 ? '+' : sign}R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const brlShort = (n: number): string =>
  `R$ ${Math.round(Math.abs(n)).toLocaleString('pt-BR')}`;
