import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

export type Notificacao = Database['public']['Tables']['notificacao']['Row'];

/** Teto da caixa de entrada. Ninguém rola mais que isso num sino. */
const LIMITE = 50;

export const notificacoesService = {
  async listar(): Promise<Notificacao[]> {
    const { data, error } = await supabase
      .from('notificacao')
      .select('*')
      // Não lidas primeiro, e dentro de cada grupo as recentes antes. Ordenar
      // só por data faria o aviso novo já lido empurrar para baixo o pedido de
      // ontem que ainda espera resposta.
      .order('lida', { ascending: true })
      .order('criado_em', { ascending: false })
      .limit(LIMITE);

    if (error) throw new Error(`Falha ao carregar notificações: ${error.message}`);
    return data;
  },

  async marcarComoLida(id: string): Promise<void> {
    const { error } = await supabase.from('notificacao').update({ lida: true }).eq('id', id);
    if (error) throw new Error(`Falha ao marcar como lida: ${error.message}`);
  },

  /**
   * A RLS já restringe ao próprio usuário, mas o filtro explícito fica:
   * um `update` sem `where` depender só da policy é uma linha a um descuido
   * de virar "marcar as de todo mundo".
   */
  async marcarTodasComoLidas(usuarioId: string): Promise<void> {
    const { error } = await supabase
      .from('notificacao')
      .update({ lida: true })
      .eq('usuario_id', usuarioId)
      .eq('lida', false);

    if (error) throw new Error(`Falha ao marcar todas como lidas: ${error.message}`);
  },
};
