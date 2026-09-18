import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

type Promocao = Database['public']['Tables']['promocao']['Row'];
type PromocaoInsert = Database['public']['Tables']['promocao']['Insert'];
type PromocaoPublica = Database['public']['Views']['promocao_publica']['Row'];
type StatusRegistro = Database['public']['Enums']['status_registro'];

/**
 * Traduz os CHECK do banco — mesmo padrão de `produtos.service.ts` e
 * `financeiro.service.ts`. Sem isto o gestor veria nome de constraint em inglês.
 */
function traduzir(mensagem: string, acao: string): string {
  if (mensagem.includes('promocao_periodo_valido')) {
    return 'A data de término precisa ser depois da data de início.';
  }
  if (mensagem.includes('desconto_percentual')) {
    return 'O desconto precisa estar entre 0% e 100%.';
  }
  return `Falha ao ${acao} a promoção: ${mensagem}`;
}

export const promocoesService = {
  /** Todas as promoções da barbearia, inclusive expiradas e inativas. */
  async listar(barbeariaId: string): Promise<Promocao[]> {
    const { data, error } = await supabase
      .from('promocao')
      .select('*')
      .eq('barbearia_id', barbeariaId)
      .order('data_inicio', { ascending: false });

    if (error) throw new Error(`Falha ao listar as promoções: ${error.message}`);
    return data;
  },

  async criar(promocao: PromocaoInsert): Promise<Promocao> {
    const { data, error } = await supabase.from('promocao').insert([promocao]).select().single();
    if (error) throw new Error(traduzir(error.message, 'cadastrar'));
    return data;
  },

  async atualizar(id: string, updates: Partial<PromocaoInsert>): Promise<Promocao> {
    const { data, error } = await supabase
      .from('promocao')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(traduzir(error.message, 'atualizar'));
    return data;
  },

  async alternarStatus(id: string, status: StatusRegistro): Promise<Promocao> {
    const { data, error } = await supabase
      .from('promocao')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(`Falha ao alterar o status da promoção: ${error.message}`);
    return data;
  },

  /**
   * Promoções vigentes de uma ou mais barbearias, pela view pública.
   *
   * A view já filtra por `now()`, então promoção expirada some sozinha — não
   * depende de alguém lembrar de desativar.
   */
  async listarVigentes(barbeariaIds: string[]): Promise<PromocaoPublica[]> {
    if (barbeariaIds.length === 0) return [];

    const { data, error } = await supabase
      .from('promocao_publica')
      .select('*')
      .in('barbearia_id', barbeariaIds)
      .order('desconto_percentual', { ascending: false });

    if (error) throw new Error(`Falha ao carregar as promoções: ${error.message}`);
    return data ?? [];
  },
};
