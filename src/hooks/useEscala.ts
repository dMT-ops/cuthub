import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { escalaService } from '@/services/escala.service';
import type { Bloqueio, NovaFolga, RequisicaoPendente } from '@/services/escala.service';

const FOLGAS_VAZIAS: Bloqueio[] = [];
const REQUISICOES_VAZIAS: RequisicaoPendente[] = [];

/**
 * Invalida tudo que uma folga aprovada muda: a lista, a fila e a agenda.
 *
 * Prefixo `use` obrigatorio: a funcao chama `useQueryClient`, e a regra de
 * hooks do lint so reconhece composicao em nomes que comecam assim.
 */
function useInvalidacaoDaEscala() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['folgas'] });
    queryClient.invalidateQueries({ queryKey: ['requisicoes_pendentes'] });
    // A disponibilidade muda de verdade quando a folga e aprovada -- sem isto
    // o modal de novo agendamento continuaria oferecendo o horario da folga.
    queryClient.invalidateQueries({ queryKey: ['ocupacao'] });
    queryClient.invalidateQueries({ queryKey: ['ocupacao_publica'] });
  };
}

export function useFolgasDoProfissional(profissionalId: string | null | undefined) {
  const invalidar = useInvalidacaoDaEscala();

  const query = useQuery({
    queryKey: ['folgas', profissionalId],
    queryFn: () => escalaService.listarFolgasDoProfissional(profissionalId!),
    enabled: !!profissionalId,
  });

  const criar = useMutation({
    mutationFn: (folga: NovaFolga) => escalaService.criarFolga(folga),
    onSuccess: invalidar,
  });

  const cancelar = useMutation({
    mutationFn: (id: string) => escalaService.cancelarFolga(id),
    onSuccess: invalidar,
  });

  return {
    folgas: query.data ?? FOLGAS_VAZIAS,
    isLoading: query.isLoading,
    isError: query.isError,
    criarFolga: criar.mutateAsync,
    isCriando: criar.isPending,
    cancelarFolga: cancelar.mutateAsync,
    isCancelando: cancelar.isPending,
  };
}

export function useRequisicoesPendentes(barbeariaId: string | null | undefined, habilitado = true) {
  const invalidar = useInvalidacaoDaEscala();

  const query = useQuery({
    queryKey: ['requisicoes_pendentes', barbeariaId],
    queryFn: () => escalaService.listarRequisicoesPendentes(barbeariaId!),
    enabled: !!barbeariaId && habilitado,
  });

  const responder = useMutation({
    mutationFn: ({
      tipo,
      id,
      status,
    }: {
      tipo: 'bloqueio' | 'horario';
      id: string;
      status: 'aprovado' | 'rejeitado';
    }) => escalaService.responderRequisicao(tipo, id, status),
    onSuccess: invalidar,
  });

  return {
    requisicoes: query.data ?? REQUISICOES_VAZIAS,
    isLoading: query.isLoading,
    responder: responder.mutateAsync,
    isRespondendo: responder.isPending,
  };
}
