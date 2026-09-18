import { supabase } from '@/lib/supabase';
import { apurarComissoes } from '@/lib/comissao';
import type { ComissaoApurada } from '@/lib/comissao';
import type { Database } from '@/types/database.types';

type LancamentoFinanceiro = Database['public']['Tables']['lancamento_financeiro']['Row'];
type LancamentoInsert = Database['public']['Tables']['lancamento_financeiro']['Insert'];
type LancamentoUpdate = Database['public']['Tables']['lancamento_financeiro']['Update'];
type CategoriaLancamento = Database['public']['Enums']['categoria_lancamento'];
type TipoLancamento = Database['public']['Enums']['tipo_lancamento'];

export type LancamentoComDetalhes = LancamentoFinanceiro & {
  profissional: { id: string; nome: string } | null;
};

/** Atendimento concluído que ainda não virou receita no caixa */
export interface AtendimentoAReceber {
  agendamentoId: string;
  dataHora: string;
  clienteNome: string;
  profissionalId: string | null;
  profissionalNome: string | null;
  servicos: string;
  valor: number;
}

/**
 * Comissão de um profissional no período, reconciliada contra o caixa.
 *
 * A base é a receita EFETIVAMENTE LANÇADA (entrada + atendimento), não o
 * agendamento concluído: só se deve comissão sobre dinheiro que entrou. Esta é
 * a mesma base usada em `profissionaisService.obterDesempenho`, de propósito —
 * o sistema dava dois números diferentes para a mesma pergunta.
 */
/** Alias do tipo apurado em `@/lib/comissao` — o cálculo mora lá, testado sem banco. */
export type ComissaoAPagar = ComissaoApurada;

export interface ListarLancamentosOptions {
  inicio?: string;
  fim?: string;
  tipo?: TipoLancamento;
  categoria?: CategoriaLancamento;
}


export const financeiroService = {
  async listarLancamentos(barbeariaId: string, options?: ListarLancamentosOptions): Promise<LancamentoComDetalhes[]> {
    let query = supabase
      .from('lancamento_financeiro')
      .select('*, profissional:profissional ( id, nome )')
      .eq('barbearia_id', barbeariaId)
      .order('data_lancamento', { ascending: false });

    if (options?.inicio) {
      query = query.gte('data_lancamento', options.inicio);
    }
    if (options?.fim) {
      query = query.lte('data_lancamento', options.fim);
    }
    if (options?.tipo) {
      query = query.eq('tipo', options.tipo);
    }
    if (options?.categoria) {
      query = query.eq('categoria', options.categoria);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Falha ao listar lançamentos: ${error.message}`);
    return (data as unknown) as LancamentoComDetalhes[];
  },

  async criarLancamento(lancamento: LancamentoInsert): Promise<LancamentoFinanceiro> {
    const { data, error } = await supabase
      .from('lancamento_financeiro')
      .insert([lancamento])
      .select()
      .single();

    if (error) {
      if (error.message.includes('lancamento_valor_positivo')) {
        throw new Error('O valor do lançamento precisa ser maior que zero.');
      }
      throw new Error(`Falha ao criar lançamento: ${error.message}`);
    }
    return data;
  },

  /**
   * Corrige um lançamento existente.
   *
   * O `.eq('barbearia_id')` é redundante com a RLS (policy FOR ALL, cujo USING
   * o Postgres reaproveita como WITH CHECK -- comprovado na auditoria da
   * Fase 1, teste T3). Está aqui como segunda tranca: se alguém forçar um id de
   * outra barbearia pelo frontend, a consulta não casa nenhuma linha em vez de
   * depender só da policy.
   */
  async atualizarLancamento(
    id: string,
    barbeariaId: string,
    patch: LancamentoUpdate
  ): Promise<LancamentoFinanceiro> {
    const { data, error } = await supabase
      .from('lancamento_financeiro')
      .update(patch)
      .eq('id', id)
      .eq('barbearia_id', barbeariaId)
      .select()
      .maybeSingle();

    if (error) {
      if (error.message.includes('lancamento_valor_positivo')) {
        throw new Error('O valor do lançamento precisa ser maior que zero.');
      }
      throw new Error(`Falha ao atualizar lançamento: ${error.message}`);
    }
    // maybeSingle devolve null sem erro quando nada casou -- id inexistente ou
    // de outra barbearia. Silenciar isso faria a tela dizer "salvo" sem ter salvo.
    if (!data) throw new Error('Lançamento não encontrado nesta barbearia.');
    return data;
  },

  /** Exclui um lançamento. Mesma tranca dupla de `atualizarLancamento`. */
  async excluirLancamento(id: string, barbeariaId: string): Promise<void> {
    const { data, error } = await supabase
      .from('lancamento_financeiro')
      .delete()
      .eq('id', id)
      .eq('barbearia_id', barbeariaId)
      .select('id');

    if (error) throw new Error(`Falha ao excluir lançamento: ${error.message}`);
    if (!data || data.length === 0) {
      throw new Error('Lançamento não encontrado nesta barbearia.');
    }
  },

  async resumo(barbeariaId: string, inicio: string, fim: string): Promise<{ entradas: number; saidas: number; saldo: number }> {
    const { data, error } = await supabase
      .from('lancamento_financeiro')
      .select('tipo, valor')
      .eq('barbearia_id', barbeariaId)
      .gte('data_lancamento', inicio)
      .lte('data_lancamento', fim);

    if (error) throw new Error(`Falha ao gerar resumo financeiro: ${error.message}`);

    const resumo = data.reduce(
      (acc, curr) => {
        if (curr.tipo === 'entrada') acc.entradas += Number(curr.valor);
        if (curr.tipo === 'saida') acc.saidas += Number(curr.valor);
        return acc;
      },
      { entradas: 0, saidas: 0, saldo: 0 }
    );

    resumo.saldo = resumo.entradas - resumo.saidas;
    return resumo;
  },

  /**
   * Atendimentos concluídos no período que ainda não têm lançamento vinculado.
   *
   * Não existe geração automática de receita no banco: o caixa só registra o que o
   * gestor confirmar. Esta consulta existe para que nada seja esquecido.
   */
  async listarAtendimentosAReceber(barbeariaId: string, inicio: string, fim: string): Promise<AtendimentoAReceber[]> {
    const [atendimentosRes, lancamentosRes] = await Promise.all([
      supabase
        .from('agendamento')
        .select(`
          id, data_hora,
          cliente:cliente ( nome ),
          profissional:profissional ( id, nome ),
          agendamento_servico ( preco_cobrado, servico:servico ( nome ) )
        `)
        .eq('barbearia_id', barbeariaId)
        .eq('status', 'concluido')
        .gte('data_hora', inicio)
        .lte('data_hora', fim)
        .order('data_hora', { ascending: false }),

      // Só a receita de atendimento marca o agendamento como já lançado. Sem este
      // filtro, um lançamento de comissão (que aponta para o mesmo agendamento)
      // tiraria o atendimento da lista e a receita nunca seria registrada.
      // Mesmo escopo do índice lancamento_atendimento_unico_por_agendamento (00013).
      supabase
        .from('lancamento_financeiro')
        .select('agendamento_id')
        .eq('barbearia_id', barbeariaId)
        .eq('tipo', 'entrada')
        .eq('categoria', 'atendimento')
        .not('agendamento_id', 'is', null),
    ]);

    if (atendimentosRes.error) throw new Error(`Falha ao listar atendimentos concluídos: ${atendimentosRes.error.message}`);
    if (lancamentosRes.error) throw new Error(`Falha ao verificar lançamentos existentes: ${lancamentosRes.error.message}`);

    const jaLancados = new Set(lancamentosRes.data.map((l) => l.agendamento_id));

    return (atendimentosRes.data as any[])
      .filter((a) => !jaLancados.has(a.id))
      .map((a) => ({
        agendamentoId: a.id,
        dataHora: a.data_hora,
        clienteNome: a.cliente?.nome ?? 'Cliente não informado',
        profissionalId: a.profissional?.id ?? null,
        profissionalNome: a.profissional?.nome ?? null,
        servicos: (a.agendamento_servico ?? [])
          .map((i: any) => i.servico?.nome)
          .filter(Boolean)
          .join(' + ') || 'Serviço não informado',
        valor: (a.agendamento_servico ?? []).reduce(
          (total: number, i: any) => total + Number(i.preco_cobrado ?? 0),
          0
        ),
      }));
  },

  /**
   * Quanto cada profissional tem a receber de comissão no período.
   *
   * Reconciliação por período, não por atendimento: o devido vem da receita
   * lançada no intervalo, o pago vem das saídas de comissão no mesmo intervalo,
   * e a diferença é o pendente. É o mesmo recorte do filtro de mês da tela.
   *
   * Ressalva registrada de propósito: o percentual aplicado é o ATUAL do
   * profissional. Se o gestor mudar a comissão dele, os períodos passados são
   * recalculados com o percentual novo. Guardar o percentual histórico exigiria
   * coluna nova; enquanto não existir, o valor pago fica gravado no lançamento
   * e é ele que vale como registro do que foi acertado.
   */
  async listarComissoesAPagar(barbeariaId: string, inicio: string, fim: string): Promise<ComissaoAPagar[]> {
    const [receitasRes, pagamentosRes] = await Promise.all([
      supabase
        .from('lancamento_financeiro')
        .select('valor, profissional_id, profissional:profissional ( id, nome, comissao_percentual )')
        .eq('barbearia_id', barbeariaId)
        .eq('tipo', 'entrada')
        .eq('categoria', 'atendimento')
        .not('profissional_id', 'is', null)
        .gte('data_lancamento', inicio)
        .lte('data_lancamento', fim),

      supabase
        .from('lancamento_financeiro')
        .select('valor, profissional_id')
        .eq('barbearia_id', barbeariaId)
        .eq('tipo', 'saida')
        .eq('categoria', 'comissao')
        .not('profissional_id', 'is', null)
        .gte('data_lancamento', inicio)
        .lte('data_lancamento', fim),
    ]);

    if (receitasRes.error) throw new Error(`Falha ao apurar comissões: ${receitasRes.error.message}`);
    if (pagamentosRes.error) throw new Error(`Falha ao verificar comissões já pagas: ${pagamentosRes.error.message}`);

    const receitas = (receitasRes.data as any[])
      .filter((linha) => linha.profissional)
      .map((linha) => ({
        profissionalId: linha.profissional.id as string,
        profissionalNome: linha.profissional.nome as string,
        percentual: Number(linha.profissional.comissao_percentual),
        valor: Number(linha.valor),
      }));

    const pagamentos = (pagamentosRes.data as { valor: number; profissional_id: string }[]).map((p) => ({
      profissionalId: p.profissional_id,
      valor: Number(p.valor),
    }));

    return apurarComissoes(receitas, pagamentos);
  },
};
