import React from 'react';
import { I, IconProps } from '@/components/ui/icons';

/**
 * As categorias vivem no banco (ver `prisma/seed.ts`), não aqui — nome, cor e
 * ícone vêm da API e o usuário pode editá-los. Este arquivo guarda só a ponte
 * entre a chave de ícone gravada na coluna `Category.icon` e o componente React
 * correspondente, que não dá para serializar.
 */
export function resolveIcon(key: string): React.FC<IconProps> {
  return I[key] ?? I.wallet;
}
