import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { acessosService } from '@/services/acessos.service';
import type { Gestor, PapelDeGestao } from '@/services/acessos.service';

/**
 * Referência estável para a lista ainda não carregada. Ver useHorarios.ts:
 * `query.data || []` cria um array novo a cada render enquanto `data` for
 * undefined, e uma dep instável em useEffect vira laço de renderização.
 */
const GESTORES_VAZIOS: Gestor[] = [];

export function useAcessos(barbeariaId: string | null | undefined) {
  const queryClient = useQueryClient();

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ['acessos', barbeariaId] });
  };

  const query = useQuery({
    queryKey: ['acessos', barbeariaId],
    queryFn: () => acessosService.listarGestores(barbeariaId!),
    enabled: !!barbeariaId,
  });

  const adicionar = useMutation({
    mutationFn: (params: { email: string; nome?: string; tipo: PapelDeGestao }) => {
      // Falhar alto em vez de resolver em silêncio: resolver aqui faria a tela
      // anunciar sucesso sem nada ter sido gravado.
      if (!barbeariaId) {
        return Promise.reject(new Error('Barbearia não identificada.'));
      }
      return acessosService.adicionarGestor({ ...params, barbeariaId });
    },
    onSuccess: invalidar,
  });

  const alterarPapel = useMutation({
    mutationFn: ({ usuarioId, tipo }: { usuarioId: string; tipo: PapelDeGestao }) =>
      acessosService.alterarPapel(usuarioId, tipo),
    onSuccess: invalidar,
  });

  const remover = useMutation({
    mutationFn: (usuarioId: string) => acessosService.removerGestor(usuarioId),
    onSuccess: invalidar,
  });

  return {
    gestores: query.data ?? GESTORES_VAZIOS,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    adicionarGestor: adicionar.mutateAsync,
    isAdicionando: adicionar.isPending,
    alterarPapel: alterarPapel.mutateAsync,
    isAlterando: alterarPapel.isPending,
    removerGestor: remover.mutateAsync,
    isRemovendo: remover.isPending,
  };
}
