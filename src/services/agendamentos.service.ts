import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';
import { addMinutes, parseISO, formatISO } from 'date-fns';

type Agendamento = Database['public']['Tables']['agendamento']['Row'];
type AgendamentoInsert = Database['public']['Tables']['agendamento']['Insert'];
type StatusAgendamento = Database['public']['Enums']['status_agendamento'];

// Tipo customizado refletindo o Join que faremos
export type AgendamentoComDetalhes = {
  id: string;
  data_hora: string;
  data_hora_fim: string;
  status: StatusAgendamento;
  observacoes: string | null;
  cliente: { id: string; nome: string; telefone: string | null } | null;
  profissional: { id: string; nome: string; avatar_url: string | null } | null;
  agendamento_servico: { 
    preco_cobrado: number; 
    servico: { id: string; nome: string; duracao_minutos: number; categoria: string } | null 
  }[];
};

export const agendamentosService = {
  async listarPorPeriodo(barbeariaId: string, inicio: string, fim: string): Promise<AgendamentoComDetalhes[]> {
    const { data, error } = await supabase
      .from('agendamento')
      .select(`
        id, data_hora, data_hora_fim, status, observacoes,
        cliente:cliente ( id, nome, telefone ),
        profissional:profissional ( id, nome, avatar_url ),
        agendamento_servico ( 
          preco_cobrado, 
          servico:servico ( id, nome, duracao_minutos, categoria ) 
        )
      `)
      .eq('barbearia_id', barbeariaId)
      .gte('data_hora', inicio)
      .lte('data_hora', fim)
      .order('data_hora');

    if (error) throw new Error(`Falha ao listar agendamentos: ${error.message}`);
    
    // Casting forçado devido ao PostgREST complex joins tipagem
    return (data as unknown) as AgendamentoComDetalhes[];
  },

  async obterAgendamento(id: string): Promise<AgendamentoComDetalhes> {
    const { data, error } = await supabase
      .from('agendamento')
      .select(`
        id, data_hora, data_hora_fim, status, observacoes,
        cliente:cliente ( id, nome, telefone ),
        profissional:profissional ( id, nome, avatar_url ),
        agendamento_servico ( 
          preco_cobrado, 
          servico:servico ( id, nome, duracao_minutos, categoria ) 
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw new Error(`Falha ao obter agendamento: ${error.message}`);
    return (data as unknown) as AgendamentoComDetalhes;
  },

  /**
   * Agendamentos ainda por vir na barbearia, do mais próximo ao mais distante.
   *
   * Uma única consulta atende todos os profissionais — quem agrupa por
   * profissional é a UI, evitando N requisições para N barbeiros.
   */
  async listarProximos(barbeariaId: string, limite = 100): Promise<AgendamentoComDetalhes[]> {
    const { data, error } = await supabase
      .from('agendamento')
      .select(`
        id, data_hora, data_hora_fim, status, observacoes,
        cliente:cliente ( id, nome, telefone ),
        profissional:profissional ( id, nome, avatar_url ),
        agendamento_servico ( 
          preco_cobrado, 
          servico:servico ( id, nome, duracao_minutos, categoria ) 
        )
      `)
      .eq('barbearia_id', barbeariaId)
      .in('status', ['pendente', 'confirmado', 'em_atendimento'])
      .gte('data_hora', new Date().toISOString())
      .order('data_hora')
      .limit(limite);

    if (error) throw new Error(`Falha ao listar os próximos agendamentos: ${error.message}`);

    return (data as unknown) as AgendamentoComDetalhes[];
  },

  async criarAgendamento(
    agendamentoData: Omit<AgendamentoInsert, 'data_hora_fim'>, 
    servicoIds: string[]
  ): Promise<Agendamento> {
    if (!servicoIds || servicoIds.length === 0) {
      throw new Error('É obrigatório selecionar pelo menos um serviço.');
    }

    // 1. Buscar detalhes dos serviços para calcular duração total e preço
    const { data: servicosData, error: servicosError } = await supabase
      .from('servico')
      .select('id, duracao_minutos, preco')
      .in('id', servicoIds);

    if (servicosError) {
      throw new Error(`Falha ao consultar serviços: ${servicosError.message}`);
    }

    const duracaoTotal = servicosData.reduce((acc, curr) => acc + curr.duracao_minutos, 0);
    const dataHoraFim = formatISO(addMinutes(parseISO(agendamentoData.data_hora), duracaoTotal));

    // 2. Inserir agendamento
    const payloadAgendamento: AgendamentoInsert = {
      ...agendamentoData,
      data_hora_fim: dataHoraFim,
    };

    const { data: agendamento, error: agendamentoError } = await supabase
      .from('agendamento')
      .insert([payloadAgendamento])
      .select()
      .single();

    if (agendamentoError) {
      if (agendamentoError.message.includes('agendamento_sem_sobreposicao')) {
        throw new Error('Este profissional já possui atendimento neste horário.');
      }
      throw new Error(`Falha ao criar agendamento: ${agendamentoError.message}`);
    }

    // 3. Inserir as relações em agendamento_servico
    const servicosPayload = servicosData.map(s => ({
      agendamento_id: agendamento.id,
      servico_id: s.id,
      preco_cobrado: s.preco
    }));

    const { error: relError } = await supabase
      .from('agendamento_servico')
      .insert(servicosPayload);

    // Rollback manual caso a inserção dos serviços falhe
    if (relError) {
      await supabase.from('agendamento').delete().eq('id', agendamento.id);
      throw new Error(`Falha ao vincular serviços. O agendamento foi cancelado. Erro: ${relError.message}`);
    }

    return agendamento;
  },

  async atualizarStatus(id: string, novoStatus: StatusAgendamento): Promise<void> {
    const { error } = await supabase
      .from('agendamento')
      .update({ status: novoStatus })
      .eq('id', id);

    if (error) throw new Error(`Falha ao atualizar status do agendamento: ${error.message}`);
  },

  /**
   * Exclusão definitiva do agendamento.
   *
   * Diferente de `cancelar`, que preserva o registro para histórico, aqui a
   * linha some do banco. Os vínculos em `agendamento_servico` são removidos
   * antes por clareza — o ON DELETE CASCADE já faria isso, mas depender do
   * cascade esconde a intenção de quem lê o código.
   */
  async excluir(id: string): Promise<void> {
    const { error: erroServicos } = await supabase
      .from('agendamento_servico')
      .delete()
      .eq('agendamento_id', id);

    if (erroServicos) {
      throw new Error(`Falha ao remover os serviços do agendamento: ${erroServicos.message}`);
    }

    const { error } = await supabase
      .from('agendamento')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Falha ao excluir o agendamento: ${error.message}`);
  },

  async cancelar(id: string, canceladoPorId: string): Promise<void> {
    const { error } = await supabase
      .from('agendamento')
      .update({ 
        status: 'cancelado',
        cancelado_por: canceladoPorId 
      })
      .eq('id', id);

    if (error) throw new Error(`Falha ao cancelar agendamento: ${error.message}`);
  }
};
