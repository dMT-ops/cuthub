import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';
import { startOfMonth, endOfMonth } from 'date-fns';

type Profissional = Database['public']['Tables']['profissional']['Row'];
type ProfissionalInsert = Database['public']['Tables']['profissional']['Insert'];

export const profissionaisService = {
  async listarProfissionais(barbeariaId: string, options?: { busca?: string; status?: 'ativo' | 'inativo', page?: number, limit?: number }): Promise<{ profissionais: (Profissional & { atendimentosMes: number })[], count: number }> {
    let query = supabase
      .from('profissional')
      .select('*', { count: 'exact' })
      .eq('barbearia_id', barbeariaId)
      .order('nome');

    if (options?.status && options.status !== 'todos' as any) {
      query = query.eq('status', options.status);
    }
    
    if (options?.busca) {
      query = query.or(`nome.ilike.%${options.busca}%,email.ilike.%${options.busca}%,telefone.ilike.%${options.busca}%,especialidade.ilike.%${options.busca}%`);
    }

    if (options?.page && options?.limit) {
      const from = (options.page - 1) * options.limit;
      const to = from + options.limit - 1;
      query = query.range(from, to);
    }

    const { data: profissionais, error, count } = await query;
    if (error) throw new Error(`Falha ao listar profissionais: ${error.message}`);
    
    if (!profissionais || profissionais.length === 0) return { profissionais: [], count: 0 };

    // Plano B aprovado: Fazer requisição fixa separada para os agendamentos do mês de todos os profissionais.
    const start = startOfMonth(new Date()).toISOString();
    const end = endOfMonth(new Date()).toISOString();

    const { data: agendamentos, error: errorAg } = await supabase
      .from('agendamento')
      .select('profissional_id')
      .eq('barbearia_id', barbeariaId)
      .eq('status', 'concluido')
      .gte('data_hora', start)
      .lte('data_hora', end);

    if (errorAg) throw new Error(`Falha ao obter métricas mensais: ${errorAg.message}`);

    // Agrupar contagem no frontend
    const contagemPorProfissional: Record<string, number> = {};
    agendamentos.forEach(ag => {
      contagemPorProfissional[ag.profissional_id] = (contagemPorProfissional[ag.profissional_id] || 0) + 1;
    });

    const profsComMetricas = profissionais.map(p => ({
      ...p,
      atendimentosMes: contagemPorProfissional[p.id] || 0
    })).sort((a, b) => b.atendimentosMes - a.atendimentosMes || a.nome.localeCompare(b.nome)); 
    
    return { profissionais: profsComMetricas, count: count || 0 };
  },

  async obterProfissional(id: string): Promise<Profissional> {
    const { data, error } = await supabase
      .from('profissional')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(`Falha ao obter profissional: ${error.message}`);
    return data;
  },

  async criarProfissional(profissional: ProfissionalInsert): Promise<Profissional> {
    const { data, error } = await supabase
      .from('profissional')
      .insert([profissional])
      .select()
      .single();

    if (error) throw new Error(`Falha ao criar profissional: ${error.message}`);
    return data;
  },

  async atualizarProfissional(id: string, updates: Partial<ProfissionalInsert>): Promise<Profissional> {
    const { data, error } = await supabase
      .from('profissional')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Falha ao atualizar profissional: ${error.message}`);
    return data;
  },

  async alternarStatusProfissional(id: string, novoStatus: 'ativo' | 'inativo'): Promise<void> {
    const { error } = await supabase
      .from('profissional')
      .update({ status: novoStatus })
      .eq('id', id);

    if (error) throw new Error(`Falha ao alterar status do profissional: ${error.message}`);
  },

  async obterDesempenho(id: string, comissaoPerc: number, inicioIso: string, fimIso: string) {
    // Busca agendamentos do período
    const { data, error } = await supabase
      .from('agendamento')
      .select('id, agendamento_servico(preco_cobrado)')
      .eq('profissional_id', id)
      .eq('status', 'concluido')
      .gte('data_hora', inicioIso)
      .lte('data_hora', fimIso);

    if (error) throw new Error(`Falha ao buscar desempenho: ${error.message}`);

    const atendimentosConcluidos = data.length;
    let faturamentoTotal = 0;

    data.forEach(ag => {
      ag.agendamento_servico.forEach((servico: any) => {
        faturamentoTotal += Number(servico.preco_cobrado);
      });
    });

    const comissaoDevida = (faturamentoTotal * comissaoPerc) / 100;
    const ticketMedio = atendimentosConcluidos > 0 ? faturamentoTotal / atendimentosConcluidos : 0;

    return {
      atendimentos: atendimentosConcluidos,
      faturamento: faturamentoTotal,
      comissao: comissaoDevida,
      ticketMedio: ticketMedio
    };
  },

  async obterHistorico(id: string) {
    const { data, error } = await supabase
      .from('agendamento')
      .select(`
        id, 
        data_hora, 
        status, 
        cliente (nome), 
        agendamento_servico (
          preco_cobrado,
          servico (nome)
        )
      `)
      .eq('profissional_id', id)
      .order('data_hora', { ascending: false })
      .limit(10);

    if (error) throw new Error(`Falha ao obter histórico: ${error.message}`);
    return data;
  },

  async verificarAgendamentoFuturo(id: string): Promise<{ possui: boolean; proximo: string | null; quantidade: number }> {
    const now = new Date().toISOString();
    const { data, error, count } = await supabase
      .from('agendamento')
      .select('data_hora', { count: 'exact' })
      .eq('profissional_id', id)
      .in('status', ['pendente', 'confirmado'])
      .gt('data_hora', now)
      .order('data_hora', { ascending: true })
      .limit(1);

    if (error) throw new Error(`Falha ao verificar agendamentos futuros: ${error.message}`);

    return {
      possui: (count || 0) > 0,
      quantidade: count || 0,
      proximo: data && data.length > 0 ? data[0].data_hora : null
    };
  }
};
