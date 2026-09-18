import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { despesaRecorrenteService } from '@/services/despesaRecorrente.service';
import type { DespesaRecorrente } from '@/services/despesaRecorrente.service';
import type { Database } from '@/types/database.types';

type DespesaInsert = Database['public']['Tables']['despesa_recorrente']['Insert'];
type DespesaUpdate = Database['public']['Tables']['despesa_recorrente']['Update'];

/** Ver useFinanceiro: referência estável evita laço de renderização. */
const DESPESAS_VAZIAS: DespesaRecorrente[] = [];
const IDS_VAZIOS: string[] = [];

export function useDespesasRecorrentes(
  barbeariaId: string | null | undefined,
  periodo?: { inicio: string; fim: string }
) {
  const queryClient = useQueryClient();

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ['despesas_recorrentes', barbeariaId] });
    queryClient.invalidateQueries({ queryKey: ['despesas_ja_lancadas', barbeariaId] });
  };

  const query = useQuery({
    queryKey: ['despesas_recorrentes', barbeariaId],
    queryFn: () => despesaRecorrenteService.listar(barbeariaId!),
    enabled: !!barbeariaId,
  });

  const queryLancadas = useQuery({
    queryKey: ['despesas_ja_lancadas', barbeariaId, periodo?.inicio, periodo?.fim],
    queryFn: () => despesaRecorrenteService.idsJaLancados(barbeariaId!, periodo!.inicio, periodo!.fim),
    enabled: !!barbeariaId && !!periodo?.inicio && !!periodo?.fim,
  });

  const criarMutation = useMutation({
    mutationFn: (despesa: DespesaInsert) => despesaRecorrenteService.criar(despesa),
    onSuccess: invalidar,
  });

  const atualizarMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: DespesaUpdate }) =>
      despesaRecorrenteService.atualizar(id, barbeariaId!, patch),
    onSuccess: invalidar,
  });

  const excluirMutation = useMutation({
    mutationFn: (id: string) => despesaRecorrenteService.excluir(id, barbeariaId!),
    onSuccess: invalidar,
  });

  return {
    despesas: query.data ?? DESPESAS_VAZIAS,
    idsJaLancados: queryLancadas.data ?? IDS_VAZIOS,
    isLoading: query.isLoading || queryLancadas.isLoading,
    isError: query.isError,
    error: query.error,
    criarDespesa: criarMutation.mutateAsync,
    atualizarDespesa: atualizarMutation.mutateAsync,
    excluirDespesa: excluirMutation.mutateAsync,
    isSalvando: criarMutation.isPending || atualizarMutation.isPending,
  };
}
