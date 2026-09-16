import type { Database } from '@/types/database.types';

type CategoriaLancamento = Database['public']['Enums']['categoria_lancamento'];
type FormaPagamento = Database['public']['Enums']['forma_pagamento'];
type TipoLancamento = Database['public']['Enums']['tipo_lancamento'];

export const CATEGORIAS_LANCAMENTO: CategoriaLancamento[] = [
  'atendimento',
  'venda_produto',
  'aluguel',
  'insumos',
  'salario',
  'comissao',
  'outro',
];

export const ROTULO_CATEGORIA: Record<CategoriaLancamento, string> = {
  atendimento: 'Atendimento',
  venda_produto: 'Venda de produto',
  aluguel: 'Aluguel',
  insumos: 'Insumos',
  salario: 'Salário',
  comissao: 'Comissão',
  outro: 'Outro',
};

export const FORMAS_PAGAMENTO: FormaPagamento[] = ['dinheiro', 'pix', 'credito', 'debito', 'outro'];

export const ROTULO_FORMA_PAGAMENTO: Record<FormaPagamento, string> = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  credito: 'Crédito',
  debito: 'Débito',
  outro: 'Outro',
};

export const ROTULO_TIPO: Record<TipoLancamento, string> = {
  entrada: 'Entrada',
  saida: 'Saída',
};

/** Categorias que normalmente acompanham cada tipo, usadas como sugestão no formulário */
export const CATEGORIAS_POR_TIPO: Record<TipoLancamento, CategoriaLancamento[]> = {
  entrada: ['atendimento', 'venda_produto', 'outro'],
  saida: ['aluguel', 'insumos', 'salario', 'comissao', 'outro'],
};
