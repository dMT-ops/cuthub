import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { horariosService } from '@/services/horarios.service';

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
      return horariosService.salvarJornada(barbeariaId, profissionalId, atuais, faixasNovas);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['horarios', profissionalId] });
    },
  });

  return {
    horarios: query.data ?? JORNADA_VAZIA,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    salvarJornada: salvarMutation.mutateAsync,
    isSalvando: salvarMutation.isPending,
  };
}
