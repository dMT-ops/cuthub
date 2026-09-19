import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notificacoesService } from '@/services/notificacoes.service';
import type { Notificacao } from '@/services/notificacoes.service';
import { useAuth } from '@/lib/auth/AuthContext';

const VAZIO: Notificacao[] = [];

/**
 * Caixa de entrada do usuário logado.
 *
 * Polling de 60s em vez de Realtime: o projeto não tem canal Realtime
 * configurado em lugar nenhum, e ligar um só para o sino significaria manter
 * uma conexão websocket viva em todas as telas. Para aviso de agendamento e
 * de folga, um minuto de atraso não muda nada — e o `refetchOnWindowFocus`
 * cobre o caso que importa: a pessoa volta para a aba e vê o que chegou.
 */
export function useNotificacoes() {
  const { perfil } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['notificacoes', perfil?.id],
    queryFn: () => notificacoesService.listar(),
    enabled: !!perfil?.id,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ['notificacoes', perfil?.id] });
  };

  const marcarUma = useMutation({
    mutationFn: (id: string) => notificacoesService.marcarComoLida(id),
    onSuccess: invalidar,
  });

  const marcarTodas = useMutation({
    mutationFn: () => notificacoesService.marcarTodasComoLidas(perfil!.id),
    onSuccess: invalidar,
  });

  const notificacoes = query.data ?? VAZIO;

  return {
    notificacoes,
    naoLidas: notificacoes.filter((n) => !n.lida).length,
    isLoading: query.isLoading,
    marcarComoLida: marcarUma.mutateAsync,
    marcarTodasComoLidas: marcarTodas.mutateAsync,
    isMarcandoTodas: marcarTodas.isPending,
  };
}
