import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

type Produto = Database['public']['Tables']['produto']['Row'];
type ProdutoInsert = Database['public']['Tables']['produto']['Insert'];
type StatusRegistro = Database['public']['Enums']['status_registro'];

export interface ListarProdutosOptions {
  busca?: string;
  status?: StatusRegistro;
}

export const produtosService = {
  /**
   * Catálogo interno da barbearia — inclui `quantidade`, que é estoque e nunca
   * sai desta consulta para o público. A vitrine do cliente lê a view
   * `produto_publico`, que não tem essa coluna.
   */
  async listarProdutos(barbeariaId: string, options?: ListarProdutosOptions): Promise<Produto[]> {
    let query = supabase
      .from('produto')
      .select('*')
      .eq('barbearia_id', barbeariaId)
      .order('ordem')
      .order('nome');

    if (options?.busca) {
      query = query.ilike('nome', `%${options.busca}%`);
    }
    if (options?.status) {
      query = query.eq('status', options.status);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Falha ao listar os produtos: ${error.message}`);
    return data;
  },

  async criarProduto(produto: ProdutoInsert): Promise<Produto> {
    const { data, error } = await supabase
      .from('produto')
      .insert([produto])
      .select()
      .single();

    if (error) throw new Error(traduzir(error.message, 'cadastrar'));
    return data;
  },

  async atualizarProduto(id: string, updates: Partial<ProdutoInsert>): Promise<Produto> {
    const { data, error } = await supabase
      .from('produto')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(traduzir(error.message, 'atualizar'));
    return data;
  },

  /**
   * Esconde ou reexibe o produto. Não existe exclusão: o produto sai da vitrine
   * pública (a view filtra por `status = 'ativo'`) mas o registro continua, para
   * não quebrar histórico nem links já compartilhados.
   */
  async alternarStatus(id: string, status: StatusRegistro): Promise<Produto> {
    const { data, error } = await supabase
      .from('produto')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Falha ao alterar o status do produto: ${error.message}`);
    return data;
  },
};

/**
 * Traduz os CHECK do banco. Sem isto o usuário veria o nome da constraint em
 * inglês — mesmo padrão usado em `agendamentos.service.ts` e `financeiro.service.ts`.
 */
function traduzir(mensagem: string, acao: string): string {
  if (mensagem.includes('produto_quantidade_check')) {
    return 'O estoque não pode ficar negativo.';
  }
  if (mensagem.includes('produto_preco_check')) {
    return 'O preço não pode ser negativo.';
  }
  return `Falha ao ${acao} o produto: ${mensagem}`;
}
