import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { servicosService } from '@/services/servicos.service';
import type { Database } from '@/types/database.types';

type ServicoInsert = Database['public']['Tables']['servico']['Insert'];
type Servico = Database['public']['Tables']['servico']['Row'];

/**
 * Referência estável para a lista ainda não carregada. Ver useHorarios.ts:
 * `query.data || []` cria um array novo a cada render enquanto `data` for
 * undefined, e uma dep instável em useEffect vira laço de renderização.
 */
const SERVICOS_VAZIOS: Servico[] = [];

export function useServicos(
  barbeariaId: string | null | undefined,
  options?: { busca?: string; categoria?: 'corte' | 'barba' | 'combo' | 'quimica' | 'estetica' | 'infantil' | 'outro'; status?: 'ativo' | 'inativo' }
) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['servicos', barbeariaId, options],
    queryFn: () => barbeariaId ? servicosService.listarServicos(barbeariaId, options as any) : Promise.resolve([]),
    enabled: !!barbeariaId,
  });

  const criarMutation = useMutation({
    mutationFn: (servico: ServicoInsert) => servicosService.criarServico(servico),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos', barbeariaId] });
    },
  });

  const atualizarMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ServicoInsert> }) => 
      servicosService.atualizarServico(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos', barbeariaId] });
    },
  });

  const alternarStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ativo' | 'inativo' }) => 
      servicosService.alternarStatusServico(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos', barbeariaId] });
    },
  });

  return {
    servicos: query.data ?? SERVICOS_VAZIOS,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    criarServico: criarMutation.mutateAsync,
    isCriando: criarMutation.isPending,
    atualizarServico: atualizarMutation.mutateAsync,
    isAtualizando: atualizarMutation.isPending,
    alternarStatus: alternarStatusMutation.mutateAsync,
    isAlternandoStatus: alternarStatusMutation.isPending,
  };
}

export function useServicoDetalhes(id: string | null | undefined) {
  const query = useQuery({
    queryKey: ['servico_detalhe', id],
    queryFn: () => id ? servicosService.obterServicoDetalhes(id) : Promise.reject('No ID'),
    enabled: !!id,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError
  };
}
