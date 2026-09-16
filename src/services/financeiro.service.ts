import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

type LancamentoFinanceiro = Database['public']['Tables']['lancamento_financeiro']['Row'];
type LancamentoInsert = Database['public']['Tables']['lancamento_financeiro']['Insert'];
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

      supabase
        .from('lancamento_financeiro')
        .select('agendamento_id')
        .eq('barbearia_id', barbeariaId)
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
};
