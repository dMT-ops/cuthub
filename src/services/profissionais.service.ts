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

  /**
   * Cadastra o profissional vinculando-o a uma conta existente, quando o e-mail
   * informado já pertencer a um usuário do sistema.
   *
   * Mesmo mecanismo do cadastro de clientes: o vínculo em
   * `profissional.usuario_id` é o que permitirá, no futuro, a área logada do
   * barbeiro enxergar a própria agenda.
   */
  async cadastrarComConta(dados: {
    barbeariaId: string;
    nome: string;
    email?: string | null;
    telefone?: string | null;
    especialidade?: string | null;
    bio?: string | null;
    comissaoPercentual?: number;
  }): Promise<{ profissionalId: string; usuarioId: string | null; contaVinculada: boolean }> {
    const { data, error } = await supabase.rpc('cadastrar_profissional_com_conta', {
      p_barbearia_id: dados.barbeariaId,
      p_nome: dados.nome,
      p_email: dados.email ?? undefined,
      p_telefone: dados.telefone ?? undefined,
      p_especialidade: dados.especialidade ?? undefined,
      p_bio: dados.bio ?? undefined,
      p_comissao_percentual: dados.comissaoPercentual,
    });

    if (error) throw new Error(`Falha ao cadastrar profissional: ${error.message}`);

    const linha = data?.[0];
    if (!linha) throw new Error('O banco não retornou o profissional cadastrado.');

    return {
      profissionalId: linha.profissional_id,
      usuarioId: linha.usuario_id,
      contaVinculada: linha.conta_vinculada,
    };
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
