import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

type Barbearia = Database['public']['Tables']['barbearia']['Row'];
type ConfiguracaoBarbearia = Database['public']['Tables']['configuracao_barbearia']['Row'];

export const barbeariaService = {
  async obterBarbearia(id: string): Promise<Barbearia> {
    const { data, error } = await supabase
      .from('barbearia')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(`Falha ao obter barbearia: ${error.message}`);
    return data;
  },

  async obterConfiguracao(barbeariaId: string): Promise<ConfiguracaoBarbearia> {
    const { data, error } = await supabase
      .from('configuracao_barbearia')
      .select('*')
      .eq('barbearia_id', barbeariaId)
      .single();

    if (error) throw new Error(`Falha ao obter configurações da barbearia: ${error.message}`);
    return data;
  },

  async atualizarBarbearia(id: string, nome: string): Promise<Barbearia> {
    const { data, error } = await supabase
      .from('barbearia')
      .update({ nome })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Falha ao atualizar a barbearia: ${error.message}`);
    return data;
  },

  async atualizarConfiguracao(
    barbeariaId: string,
    horarios: { horario_abertura: string; horario_fechamento: string }
  ): Promise<ConfiguracaoBarbearia> {
    const { data, error } = await supabase
      .from('configuracao_barbearia')
      .update(horarios)
      .eq('barbearia_id', barbeariaId)
      .select()
      .single();

    if (error) throw new Error(`Falha ao atualizar o horário de funcionamento: ${error.message}`);
    return data;
  },

  async criarBarbeariaEVincular(nome: string): Promise<string> {
    const { data, error } = await supabase.rpc('criar_barbearia_e_vincular', { p_nome: nome });
    
    if (error) {
      if (error.message.includes('Usuario ja vinculado')) {
        throw new Error('Você já possui uma barbearia vinculada.');
      }
      throw new Error(`Falha ao criar barbearia: ${error.message}`);
    }
    
    return data;
  }
};
