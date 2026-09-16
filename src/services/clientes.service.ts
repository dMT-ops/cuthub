import { supabase } from '@/lib/supabase';
import type { Cliente, ClienteInsert } from '@/types/database.types';

export interface ListarClientesOptions {
  busca?: string;
  status?: 'ativo' | 'inativo' | 'todos';
  page?: number;
  limit?: number;
}

export const clientesService = {
  async listarClientes(barbeariaId: string, options?: ListarClientesOptions): Promise<{ clientes: any[]; count: number }> {
    let query = supabase
      .from('cliente')
      .select('id, barbearia_id, nome, telefone, email, status, usuario_id, data_nascimento, observacoes, criado_em, atualizado_em, agendamento(data_hora)', { count: 'exact' })
      .eq('barbearia_id', barbeariaId)
      .eq('agendamento.status', 'concluido')
      .order('data_hora', { referencedTable: 'agendamento', ascending: false })
      .limit(1, { referencedTable: 'agendamento' })
      .order('nome');

    if (options?.status && options.status !== 'todos') {
      query = query.eq('status', options.status);
    } else if (!options?.status) {
      // Default para ativo se não passado
      query = query.eq('status', 'ativo');
    }
    
    if (options?.busca) {
      const termo = `%${options.busca}%`;
      query = query.or(`nome.ilike.${termo},telefone.ilike.${termo},email.ilike.${termo}`);
    }

    if (options?.page !== undefined && options?.limit !== undefined) {
      const from = (options.page - 1) * options.limit;
      const to = from + options.limit - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query;
    if (error) throw new Error(`Falha ao listar clientes: ${error.message}`);
    
    return { clientes: data, count: count || 0 };
  },

  async obterDetalhesCliente(id: string) {
    // 1. Dados base
    const { data: cliente, error } = await supabase
      .from('cliente')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(`Falha ao obter cliente: ${error.message}`);

    // 2. Histórico e métricas (apenas concluídos para o total gasto)
    // Para simplificar N requisições e processamento, fazemos duas queries focadas.
    // Query A: Agendamentos concluídos para as somatórias de totais.
    const { data: concluidos, error: errConcluidos } = await supabase
      .from('agendamento')
      .select('id, data_hora, agendamento_servico(preco_cobrado)')
      .eq('cliente_id', id)
      .eq('status', 'concluido')
      .order('data_hora', { ascending: false });

    if (errConcluidos) throw new Error(`Falha ao obter métricas financeiras: ${errConcluidos.message}`);

    // Query B: Últimos 10 agendamentos (qualquer status) para a lista de histórico
    const { data: historico, error: errHistorico } = await supabase
      .from('agendamento')
      .select(`
        id, data_hora, status,
        profissional ( id, nome ),
        agendamento_servico ( preco_cobrado, servico ( id, nome ) )
      `)
      .eq('cliente_id', id)
      .order('data_hora', { ascending: false })
      .limit(10);

    if (errHistorico) throw new Error(`Falha ao obter histórico de atendimentos: ${errHistorico.message}`);

    let totalGasto = 0;
    concluidos.forEach(ag => {
      ag.agendamento_servico.forEach(s => {
        totalGasto += Number(s.preco_cobrado || 0);
      });
    });

    return {
      cliente,
      metricas: {
        totalConcluidos: concluidos.length,
        totalGasto,
        primeiroAtendimento: concluidos.length > 0 ? concluidos[concluidos.length - 1].data_hora : null,
        ultimoAtendimento: concluidos.length > 0 ? concluidos[0].data_hora : null
      },
      historico
    };
  },

  async verificarAgendamentoFuturo(id: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('agendamento')
      .select('id')
      .eq('cliente_id', id)
      .in('status', ['pendente', 'confirmado'])
      .gte('data_hora', new Date().toISOString())
      .limit(1);
    
    if (error) throw new Error(`Falha ao verificar agendamentos futuros: ${error.message}`);
    return data.length > 0;
  },

  async verificarDuplicidade(barbeariaId: string, telefone: string | null, email: string | null, clienteIdToIgnore?: string): Promise<{ telefoneDuplicado: boolean; emailDuplicado: boolean }> {
    let telefoneDuplicado = false;
    let emailDuplicado = false;

    if (telefone) {
      let q = supabase.from('cliente').select('id').eq('barbearia_id', barbeariaId).eq('telefone', telefone);
      if (clienteIdToIgnore) q = q.neq('id', clienteIdToIgnore);
      const { data } = await q.limit(1);
      telefoneDuplicado = (data && data.length > 0) ?? false;
    }

    if (email) {
      let q = supabase.from('cliente').select('id').eq('barbearia_id', barbeariaId).eq('email', email);
      if (clienteIdToIgnore) q = q.neq('id', clienteIdToIgnore);
      const { data } = await q.limit(1);
      emailDuplicado = (data && data.length > 0) ?? false;
    }

    return { telefoneDuplicado, emailDuplicado };
  },

  /**
   * Cadastra o cliente vinculando-o a uma conta existente, quando o e-mail
   * informado já pertencer a um usuário do sistema.
   *
   * A checagem acontece no banco (função SECURITY DEFINER), porque `auth.users`
   * não é legível pelo frontend. É esse vínculo (`cliente.usuario_id`) que a
   * futura área do cliente vai usar para listar as barbearias dele.
   */
  async cadastrarComConta(dados: {
    barbeariaId: string;
    nome: string;
    email?: string | null;
    telefone?: string | null;
    dataNascimento?: string | null;
    observacoes?: string | null;
  }): Promise<{ clienteId: string; usuarioId: string | null; contaVinculada: boolean }> {
    const { data, error } = await supabase.rpc('cadastrar_cliente_com_conta', {
      p_barbearia_id: dados.barbeariaId,
      p_nome: dados.nome,
      p_email: dados.email ?? undefined,
      p_telefone: dados.telefone ?? undefined,
      p_data_nascimento: dados.dataNascimento ?? undefined,
      p_observacoes: dados.observacoes ?? undefined,
    });

    if (error) throw new Error(`Falha ao cadastrar cliente: ${error.message}`);

    const linha = data?.[0];
    if (!linha) throw new Error('O banco não retornou o cliente cadastrado.');

    return {
      clienteId: linha.cliente_id,
      usuarioId: linha.usuario_id,
      contaVinculada: linha.conta_vinculada,
    };
  },

  async criarCliente(cliente: ClienteInsert): Promise<Cliente> {
    const { data, error } = await supabase
      .from('cliente')
      .insert([cliente])
      .select()
      .single();

    if (error) throw new Error(`Falha ao criar cliente: ${error.message}`);
    return data;
  },

  async atualizarCliente(id: string, updates: Partial<ClienteInsert>): Promise<Cliente> {
    const { data, error } = await supabase
      .from('cliente')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Falha ao atualizar cliente: ${error.message}`);
    return data;
  },

  async alternarStatus({ id, status }: { id: string; status: 'ativo' | 'inativo' }): Promise<Cliente> {
    const { data, error } = await supabase
      .from('cliente')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Falha ao alterar status do cliente: ${error.message}`);
    return data;
  }
};
