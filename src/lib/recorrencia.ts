/**
 * Regras de despesa recorrente, separadas do banco para ficarem testáveis.
 */

export interface DespesaRecorrenteBasica {
  id: string;
  descricao: string;
  valor: number;
  dia_vencimento: number;
  status: 'ativo' | 'inativo';
}

/**
 * Data do vencimento dentro do mês em tela.
 *
 * Duas armadilhas resolvidas aqui:
 *
 * 1. **Dia que não existe no mês.** Vencimento 31 em setembro (30 dias) vira
 *    dia 30, não 1º de outubro. `new Date(ano, mes, 31)` faria o transbordo
 *    silenciosamente.
 * 2. **Meio-dia, não a virada.** É o mesmo bug corrigido no F6.1: 23:59:59 em
 *    horário local, em BRT, é o dia seguinte em UTC — e o banco guarda em UTC.
 */
export function dataDeVencimento(mesReferencia: Date, diaVencimento: number): Date {
  const ano = mesReferencia.getFullYear();
  const mes = mesReferencia.getMonth();
  const ultimoDiaDoMes = new Date(ano, mes + 1, 0).getDate();
  const dia = Math.min(Math.max(diaVencimento, 1), ultimoDiaDoMes);

  return new Date(ano, mes, dia, 12, 0, 0, 0);
}

/**
 * Despesas fixas que ainda não viraram lançamento no mês.
 *
 * Mesmo padrão de `AtendimentosAReceber` e `ComissoesAPagar`: o sistema mostra
 * o que falta, o gestor confirma. Não existe lançamento "pendente" — lançamento
 * existir significa dinheiro que saiu.
 */
export function despesasAProvisionar<T extends DespesaRecorrenteBasica>(
  despesas: T[],
  idsJaLancadosNoMes: string[]
): T[] {
  const jaLancados = new Set(idsJaLancadosNoMes);

  return despesas
    .filter((d) => d.status === 'ativo' && !jaLancados.has(d.id))
    .sort((a, b) => a.dia_vencimento - b.dia_vencimento);
}
