import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

type Servico = Database['public']['Tables']['servico']['Row'];
type ServicoInsert = Database['public']['Tables']['servico']['Insert'];

export const servicosService = {
  async listarServicos(barbeariaId: string, options?: { busca?: string; categoria?: 'corte' | 'barba' | 'combo' | 'quimica' | 'estetica' | 'infantil' | 'outro'; status?: 'ativo' | 'inativo' }): Promise<Servico[]> {
    let query = supabase
      .from('servico')
      .select('*')
      .eq('barbearia_id', barbeariaId)
      .order('ordem')
      .order('nome');

    if (options?.status) {
      query = query.eq('status', options.status);
    }
    
    if (options?.categoria) {
      query = query.eq('categoria', options.categoria);
    }

    if (options?.busca) {
      query = query.ilike('nome', `%${options.busca}%`);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Falha ao listar serviços: ${error.message}`);
    return data;
  },

  async obterServico(id: string): Promise<Servico> {
    const { data, error } = await supabase
      .from('servico')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(`Falha ao obter serviço: ${error.message}`);
    return data;
  },

  async obterServicoDetalhes(id: string): Promise<{ servico: Servico, estatisticas: { atendimentos: number, faturamento: number } }> {
    const servico = await this.obterServico(id);
    
    // Obter estatísticas baseadas no preco_cobrado de agendamentos concluidos
    const { data: historico, error } = await supabase
      .from('agendamento_servico')
      .select('preco_cobrado, agendamento!inner(status)')
      .eq('servico_id', id)
      .eq('agendamento.status', 'concluido');

    if (error) throw new Error(`Falha ao obter estatísticas do serviço: ${error.message}`);

    const atendimentos = historico?.length || 0;
    const faturamento = historico?.reduce((acc, curr) => acc + (Number(curr.preco_cobrado) || 0), 0) || 0;

    return { servico, estatisticas: { atendimentos, faturamento } };
  },

  async criarServico(servico: ServicoInsert): Promise<Servico> {
    const { data, error } = await supabase
      .from('servico')
      .insert([servico])
      .select()
      .single();

    if (error) throw new Error(`Falha ao criar serviço: ${error.message}`);
    return data;
  },

  async atualizarServico(id: string, updates: Partial<ServicoInsert>): Promise<Servico> {
    const { data, error } = await supabase
      .from('servico')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Falha ao atualizar serviço: ${error.message}`);
    return data;
  },

  async alternarStatusServico(id: string, novoStatus: 'ativo' | 'inativo'): Promise<void> {
    const { error } = await supabase
      .from('servico')
      .update({ status: novoStatus })
      .eq('id', id);

    if (error) throw new Error(`Falha ao alterar status do serviço: ${error.message}`);
  }
};
