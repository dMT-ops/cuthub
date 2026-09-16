import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profissionaisService } from '@/services/profissionais.service';
import type { Database } from '@/types/database.types';

type ProfissionalInsert = Database['public']['Tables']['profissional']['Insert'];

export function useProfissionais(
  barbeariaId: string | null | undefined,
  options?: { status?: 'ativo' | 'inativo' | 'todos', busca?: string, page?: number, limit?: number }
) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['profissionais', barbeariaId, options],
    queryFn: () => barbeariaId ? profissionaisService.listarProfissionais(barbeariaId, options as any) : Promise.resolve({ profissionais: [], count: 0 }),
    enabled: !!barbeariaId,
  });

  const criarMutation = useMutation({
    mutationFn: (profissional: ProfissionalInsert) => profissionaisService.criarProfissional(profissional),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profissionais', barbeariaId] });
    },
  });

  const atualizarMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ProfissionalInsert> }) => 
      profissionaisService.atualizarProfissional(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profissionais', barbeariaId] });
    },
  });

  const alternarStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ativo' | 'inativo' }) => 
      profissionaisService.alternarStatusProfissional(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profissionais', barbeariaId] });
    },
  });

  return {
    profissionais: query.data?.profissionais || [],
    totalCount: query.data?.count || 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    criarProfissional: criarMutation.mutateAsync,
    isCriando: criarMutation.isPending,
    atualizarProfissional: atualizarMutation.mutateAsync,
    isAtualizando: atualizarMutation.isPending,
    alternarStatus: alternarStatusMutation.mutateAsync,
    verificarAgendamentoFuturo: profissionaisService.verificarAgendamentoFuturo,
  };
}

export function useProfissionalDetalhes(profissionalId: string | null, comissaoPerc: number | null, inicioIso?: string, fimIso?: string) {
  const query = useQuery({
    queryKey: ['profissional_detalhes', profissionalId, inicioIso, fimIso],
    queryFn: async () => {
      if (!profissionalId || comissaoPerc === null || !inicioIso || !fimIso) return null;
      
      const [profissional, desempenho, historico] = await Promise.all([
        profissionaisService.obterProfissional(profissionalId),
        profissionaisService.obterDesempenho(profissionalId, comissaoPerc, inicioIso, fimIso),
        profissionaisService.obterHistorico(profissionalId)
      ]);
      
      return {
        profissional,
        desempenho,
        historico
      };
    },
    enabled: !!profissionalId && comissaoPerc !== null && !!inicioIso && !!fimIso,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError
  };
}
