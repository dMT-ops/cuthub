import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { promocoesService } from '@/services/promocoes.service';
import type { Database } from '@/types/database.types';

type Promocao = Database['public']['Tables']['promocao']['Row'];
type PromocaoInsert = Database['public']['Tables']['promocao']['Insert'];
type PromocaoPublica = Database['public']['Views']['promocao_publica']['Row'];
type StatusRegistro = Database['public']['Enums']['status_registro'];

/**
 * Referência estável para a lista ainda não carregada. Ver useHorarios.ts:
 * `query.data || []` cria um array novo a cada render enquanto `data` for
 * undefined, e uma dep instável em useEffect vira laço de renderização.
 */
const PROMOCOES_VAZIAS: Promocao[] = [];
const VIGENTES_VAZIAS: PromocaoPublica[] = [];

export function usePromocoes(barbeariaId: string | null | undefined) {
  const queryClient = useQueryClient();

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ['promocoes', barbeariaId] });
    // A vitrine pública lê a mesma informação por outro caminho.
    queryClient.invalidateQueries({ queryKey: ['promocoes_vigentes'] });
  };

  const query = useQuery({
    queryKey: ['promocoes', barbeariaId],
    queryFn: () => promocoesService.listar(barbeariaId!),
    enabled: !!barbeariaId,
  });

  const criar = useMutation({
    mutationFn: (promocao: Omit<PromocaoInsert, 'barbearia_id'>) => {
      // Falhar alto em vez de resolver em silêncio.
      if (!barbeariaId) return Promise.reject(new Error('Barbearia não identificada.'));
      return promocoesService.criar({ ...promocao, barbearia_id: barbeariaId });
    },
    onSuccess: invalidar,
  });

  const atualizar = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<PromocaoInsert> }) =>
      promocoesService.atualizar(id, updates),
    onSuccess: invalidar,
  });

  const alternarStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: StatusRegistro }) =>
      promocoesService.alternarStatus(id, status),
    onSuccess: invalidar,
  });

  return {
    promocoes: query.data ?? PROMOCOES_VAZIAS,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    criarPromocao: criar.mutateAsync,
    isCriando: criar.isPending,
    atualizarPromocao: atualizar.mutateAsync,
    isAtualizando: atualizar.isPending,
    alternarStatus: alternarStatus.mutateAsync,
    isAlternandoStatus: alternarStatus.isPending,
  };
}

/** Promoções vigentes de um conjunto de barbearias — usada nas telas públicas. */
export function usePromocoesVigentes(barbeariaIds: string[]) {
  const query = useQuery({
    queryKey: ['promocoes_vigentes', [...barbeariaIds].sort()],
    queryFn: () => promocoesService.listarVigentes(barbeariaIds),
    enabled: barbeariaIds.length > 0,
  });

  return {
    promocoes: query.data ?? VIGENTES_VAZIAS,
    isLoading: query.isLoading,
  };
}
