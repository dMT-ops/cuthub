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

  /**
   * Dados que identificam a barbearia — e, desde a Fase 4, tambem a colocam (ou
   * nao) no catalogo publico. O `slug` NAO entra aqui de proposito: ele e
   * gerado no cadastro e nao muda com o nome, para nao quebrar link divulgado.
   */
  async atualizarBarbearia(
    id: string,
    dados: {
      nome: string;
      cidade?: string | null;
      estado?: string | null;
      listada_no_catalogo?: boolean;
    }
  ): Promise<Barbearia> {
    const { data, error } = await supabase
      .from('barbearia')
      .update(dados)
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

  /**
   * Identidade visual da barbearia — o que a visão do cliente (Fase 4) vai
   * consumir. Mora em `configuracao_barbearia`, a mesma tabela do horário, que
   * o gerente também pode editar.
   */
  async atualizarMarca(
    barbeariaId: string,
    marca: {
      tema_cor_primaria?: string | null;
      tema_logo_url?: string | null;
      tema_banner_url?: string | null;
      tema_descricao?: string | null;
    }
  ): Promise<ConfiguracaoBarbearia> {
    const { data, error } = await supabase
      .from('configuracao_barbearia')
      .update(marca)
      .eq('barbearia_id', barbeariaId)
      .select()
      .single();

    if (error) {
      // O CHECK do banco garante hexadecimal de 6 dígitos; sem esta tradução o
      // usuário veria o nome da constraint em inglês.
      if (error.message.includes('configuracao_cor_primaria_hex')) {
        throw new Error('Cor inválida. Use um hexadecimal como #F0B323.');
      }
      if (error.message.includes('configuracao_descricao_tamanho')) {
        throw new Error('A descrição pode ter no máximo 1000 caracteres.');
      }
      throw new Error(`Falha ao atualizar a identidade da barbearia: ${error.message}`);
    }
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
