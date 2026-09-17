import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

type Favorito = Database['public']['Tables']['favorito']['Row'];
export type TipoFavorito = Database['public']['Enums']['tipo_favorito'];

export interface AlvoFavorito {
  tipo: TipoFavorito;
  barbeariaId: string;
  servicoId?: string | null;
  profissionalId?: string | null;
  agendamentoId?: string | null;
}

export const favoritosService = {
  /** Todos os favoritos do usuário logado. A RLS já limita ao dono. */
  async listar(): Promise<Favorito[]> {
    const { data, error } = await supabase
      .from('favorito')
      .select('*')
      .order('criado_em', { ascending: false });

    if (error) throw new Error(`Falha ao carregar os favoritos: ${error.message}`);
    return data ?? [];
  },

  async adicionar(usuarioId: string, alvo: AlvoFavorito): Promise<Favorito> {
    const { data, error } = await supabase
      .from('favorito')
      .insert([
        {
          usuario_id: usuarioId,
          tipo: alvo.tipo,
          barbearia_id: alvo.barbeariaId,
          servico_id: alvo.servicoId ?? null,
          profissional_id: alvo.profissionalId ?? null,
          agendamento_id: alvo.agendamentoId ?? null,
        },
      ])
      .select()
      .single();

    if (error) {
      // Clicar duas vezes no coração não é erro do usuário — os índices únicos
      // do banco existem para garantir a integridade, não para virar toast.
      if (error.message.includes('favorito_') && error.message.includes('unico')) {
        throw new Error('Isto já está nos seus favoritos.');
      }
      if (error.message.includes('favorito_campos_por_tipo')) {
        throw new Error('Favorito inválido.');
      }
      throw new Error(`Falha ao favoritar: ${error.message}`);
    }
    return data;
  },

  async remover(id: string): Promise<void> {
    const { error } = await supabase.from('favorito').delete().eq('id', id);
    if (error) throw new Error(`Falha ao remover o favorito: ${error.message}`);
  },
};
