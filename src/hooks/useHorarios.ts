import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { horariosService } from '@/services/horarios.service';
import type { SolicitacaoJornada } from '@/services/horarios.service';
import { useAuth } from '@/lib/auth/AuthContext';

/**
 * Referência estável para a jornada ainda não carregada.
 *
 * `query.data || []` criava um array novo a cada render enquanto `data` fosse
 * undefined (query carregando ou desabilitada). Quem consome `horarios` na
 * lista de dependências de um useEffect via a dep mudar em todo render —
 * JornadaTrabalho entrava em laço de renderização ("Maximum update depth
 * exceeded"). Uma constante de módulo mantém a identidade entre renders.
 */
const JORNADA_VAZIA: any[] = [];

export function useHorarios(profissionalId: string | null | undefined, barbeariaId: string | null | undefined) {
  const queryClient = useQueryClient();
  const { tipo, perfil } = useAuth();
  const comoSolicitacao = tipo === 'profissional';

  const query = useQuery({
    queryKey: ['horarios', profissionalId],
    queryFn: () => profissionalId ? horariosService.obterJornada(profissionalId) : Promise.resolve([]),
    enabled: !!profissionalId && !!barbeariaId,
  });

  const salvarMutation = useMutation({
    mutationFn: (faixasNovas: any[]) => {
      // Falhar alto, não em silêncio: resolver aqui fazia o handler de
      // JornadaTrabalho exibir "Jornada salva com sucesso!" sem nada ter sido
      // gravado. admin_supremo tem barbearia_id nulo e caía exatamente nisso.
      if (!barbeariaId || !profissionalId) {
        return Promise.reject(new Error('Barbearia não identificada.'));
      }
      const atuais = query.data ?? JORNADA_VAZIA;
      return horariosService.salvarJornada(
        barbeariaId,
        profissionalId,
        atuais,
        faixasNovas,
        comoSolicitacao,
        perfil?.id ?? null
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['horarios', profissionalId] });
      // A jornada e a fila do dono mudam juntas quando quem salva e o
      // profissional: o pedido dele aparece la na hora.
      queryClient.invalidateQueries({ queryKey: ['requisicoes_pendentes'] });
      queryClient.invalidateQueries({ queryKey: ['solicitacoes_jornada', profissionalId] });
      queryClient.invalidateQueries({ queryKey: ['ocupacao'] });
    },
  });

  return {
    /** `true` quando o que este hook salva vira pedido em vez de valer na hora. */
    salvaComoSolicitacao: comoSolicitacao,
    horarios: query.data ?? JORNADA_VAZIA,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    salvarJornada: salvarMutation.mutateAsync,
    isSalvando: salvarMutation.isPending,
  };
}

/** Mesma razão da `JORNADA_VAZIA`: identidade estável entre renders. */
const SOLICITACOES_VAZIAS: SolicitacaoJornada[] = [];

/**
 * Os pedidos de jornada do profissional — o lado que faltava do fluxo da 00028.
 *
 * O dono já tinha `useRequisicoesPendentes`; quem pede não tinha nada. Ver
 * `horariosService.listarSolicitacoes`.
 */
export function useSolicitacoesDeJornada(profissionalId: string | null | undefined, habilitado = true) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['solicitacoes_jornada', profissionalId],
    queryFn: () => horariosService.listarSolicitacoes(profissionalId!),
    enabled: !!profissionalId && habilitado,
  });

  const cancelar = useMutation({
    mutationFn: (id: string) => horariosService.cancelarSolicitacao(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoes_jornada', profissionalId] });
      // A fila do dono encolhe junto: o pedido saiu de lá também.
      queryClient.invalidateQueries({ queryKey: ['requisicoes_pendentes'] });
    },
  });

  return {
    solicitacoes: query.data ?? SOLICITACOES_VAZIAS,
    isLoading: query.isLoading,
    cancelar: cancelar.mutateAsync,
    isCancelando: cancelar.isPending,
  };
}
