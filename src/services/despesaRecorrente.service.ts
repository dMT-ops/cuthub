import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

type DespesaRecorrente = Database['public']['Tables']['despesa_recorrente']['Row'];
type DespesaInsert = Database['public']['Tables']['despesa_recorrente']['Insert'];
type DespesaUpdate = Database['public']['Tables']['despesa_recorrente']['Update'];

export type { DespesaRecorrente };

export const despesaRecorrenteService = {
  async listar(barbeariaId: string): Promise<DespesaRecorrente[]> {
    const { data, error } = await supabase
      .from('despesa_recorrente')
      .select('*')
      .eq('barbearia_id', barbeariaId)
      .order('dia_vencimento', { ascending: true });

    if (error) throw new Error(`Falha ao listar despesas fixas: ${error.message}`);
    return data;
  },

  async criar(despesa: DespesaInsert): Promise<DespesaRecorrente> {
    const { data, error } = await supabase
      .from('despesa_recorrente')
      .insert([despesa])
      .select()
      .single();

    if (error) {
      if (error.message.includes('despesa_recorrente_valor_positivo')) {
        throw new Error('O valor precisa ser maior que zero.');
      }
      if (error.message.includes('despesa_recorrente_dia_valido')) {
        throw new Error('O dia de vencimento precisa estar entre 1 e 31.');
      }
      throw new Error(`Falha ao criar despesa fixa: ${error.message}`);
    }
    return data;
  },

  /** Mesma tranca dupla dos lançamentos: id + barbearia na própria consulta. */
  async atualizar(id: string, barbeariaId: string, patch: DespesaUpdate): Promise<DespesaRecorrente> {
    const { data, error } = await supabase
      .from('despesa_recorrente')
      .update({ ...patch, atualizado_em: new Date().toISOString() })
      .eq('id', id)
      .eq('barbearia_id', barbeariaId)
      .select()
      .maybeSingle();

    if (error) throw new Error(`Falha ao atualizar despesa fixa: ${error.message}`);
    if (!data) throw new Error('Despesa não encontrada nesta barbearia.');
    return data;
  },

  async excluir(id: string, barbeariaId: string): Promise<void> {
    const { data, error } = await supabase
      .from('despesa_recorrente')
      .delete()
      .eq('id', id)
      .eq('barbearia_id', barbeariaId)
      .select('id');

    if (error) throw new Error(`Falha ao excluir despesa fixa: ${error.message}`);
    if (!data || data.length === 0) throw new Error('Despesa não encontrada nesta barbearia.');
  },

  /**
   * Ids das despesas fixas que já viraram lançamento no período.
   *
   * O índice único por mês não é possível no banco (`date_trunc` sobre
   * TIMESTAMPTZ é STABLE, não IMMUTABLE — ver nota na migration 00020), então
   * a checagem de duplicidade acontece aqui, no mesmo padrão que
   * `listarAtendimentosAReceber` usa.
   */
  async idsJaLancados(barbeariaId: string, inicio: string, fim: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('lancamento_financeiro')
      .select('despesa_recorrente_id')
      .eq('barbearia_id', barbeariaId)
      .not('despesa_recorrente_id', 'is', null)
      .gte('data_lancamento', inicio)
      .lte('data_lancamento', fim);

    if (error) throw new Error(`Falha ao verificar despesas já lançadas: ${error.message}`);
    return data.map((l) => l.despesa_recorrente_id as string);
  },
};
