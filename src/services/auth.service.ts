import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

type UsuarioPerfil = Database['public']['Tables']['usuario_perfil']['Row'];

export const authService = {
  /**
   * Perfil do usuário logado.
   *
   * `null` significa **não existe perfil**; falha de leitura é lançada. Antes,
   * os dois casos viravam `null` e o AuthContext não tinha como distinguir um
   * erro passageiro (JWT expirado, rede, RLS) de uma conta sem perfil — e o app
   * degradava para "sem barbearia" em silêncio, com um console.error como único
   * rastro. Por isso `maybeSingle`: com `single`, zero linhas já é erro.
   */
  async obterPerfil(userId: string): Promise<UsuarioPerfil | null> {
    const { data, error } = await supabase
      .from('usuario_perfil')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw new Error(`Falha ao carregar o perfil: ${error.message}`);
    return data;
  },

  async atualizarNome(userId: string, nome: string): Promise<UsuarioPerfil> {
    const { data, error } = await supabase
      .from('usuario_perfil')
      .update({ nome })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw new Error(`Falha ao atualizar o perfil: ${error.message}`);
    return data;
  }
};
