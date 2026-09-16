import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

type UsuarioPerfil = Database['public']['Tables']['usuario_perfil']['Row'];

export const authService = {
  async obterPerfil(userId: string): Promise<UsuarioPerfil | null> {
    const { data, error } = await supabase
      .from('usuario_perfil')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Erro ao ler perfil:', error);
      return null;
    }
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
