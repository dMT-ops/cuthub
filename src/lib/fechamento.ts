import type { Database } from '@/types/database.types';

import { arredondar } from './comissao';
import { ROTULO_FORMA_PAGAMENTO } from './financeiro';

type FormaPagamento = Database['public']['Enums']['forma_pagamento'];
type TipoLancamento = Database['public']['Enums']['tipo_lancamento'];

export interface LinhaDeFechamento {
  forma: FormaPagamento | null;
  rotulo: string;
  total: number;
  quantidade: number;
}

interface LancamentoParaFechamento {
  tipo: TipoLancamento;
  valor: number;
  forma_pagamento: FormaPagamento | null;
}

/**
 * Fechamento do período por forma de pagamento — como se confere a gaveta
 * contra o extrato do Pix no fim do dia.
 *
 * Só entradas: fechamento de caixa é sobre o que entrou. As saídas já aparecem
 * no resumo e misturá-las aqui daria um número que não confere com nada.
 *
 * `forma_pagamento` nula vira "Não informada" em vez de ser descartada. Existem
 * 5 entradas assim no banco hoje (R$ 245,00); silenciá-las faria a soma do
 * fechamento não bater com o total de entradas do resumo, e um fechamento que
 * não fecha é pior do que nenhum.
 */
export function fecharPorFormaDePagamento(
  lancamentos: LancamentoParaFechamento[]
): LinhaDeFechamento[] {
  const SEM_FORMA = '__sem_forma__';
  const porForma = new Map<string, LinhaDeFechamento>();

  for (const lancamento of lancamentos) {
    if (lancamento.tipo !== 'entrada') continue;

    const forma = lancamento.forma_pagamento ?? null;
    const chave = forma ?? SEM_FORMA;
    const atual = porForma.get(chave) ?? {
      forma,
      rotulo: forma ? ROTULO_FORMA_PAGAMENTO[forma] : 'Não informada',
      total: 0,
      quantidade: 0,
    };

    atual.total += Number(lancamento.valor);
    atual.quantidade += 1;
    porForma.set(chave, atual);
  }

  return [...porForma.values()]
    .map((linha) => ({ ...linha, total: arredondar(linha.total) }))
    .sort((a, b) => b.total - a.total);
}
