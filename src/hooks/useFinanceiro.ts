import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeiroService } from '@/services/financeiro.service';
import type { AtendimentoAReceber, ListarLancamentosOptions } from '@/services/financeiro.service';
import type { Database } from '@/types/database.types';

type LancamentoInsert = Database['public']['Tables']['lancamento_financeiro']['Insert'];

export function useFinanceiro(
  barbeariaId: string | null | undefined,
  options?: ListarLancamentosOptions
) {
  const queryClient = useQueryClient();

  const invalidarCaixa = () => {
    queryClient.invalidateQueries({ queryKey: ['lancamentos', barbeariaId] });
    queryClient.invalidateQueries({ queryKey: ['resumo_financeiro', barbeariaId] });
    queryClient.invalidateQueries({ queryKey: ['atendimentos_a_receber', barbeariaId] });
  };

  const query = useQuery({
    queryKey: ['lancamentos', barbeariaId, options],
    queryFn: () => financeiroService.listarLancamentos(barbeariaId!, options),
    enabled: !!barbeariaId,
  });

  const queryResumo = useQuery({
    queryKey: ['resumo_financeiro', barbeariaId, options?.inicio, options?.fim],
    queryFn: () => financeiroService.resumo(barbeariaId!, options!.inicio!, options!.fim!),
    enabled: !!barbeariaId && !!options?.inicio && !!options?.fim,
  });

  const criarMutation = useMutation({
    mutationFn: (lancamento: LancamentoInsert) => financeiroService.criarLancamento(lancamento),
    onSuccess: invalidarCaixa,
  });

  return {
    lancamentos: query.data || [],
    resumo: queryResumo.data,
    isLoading: query.isLoading || queryResumo.isLoading,
    isError: query.isError || queryResumo.isError,
    error: query.error || queryResumo.error,
    criarLancamento: criarMutation.mutateAsync,
    isCriando: criarMutation.isPending,
  };
}

/** Atendimentos concluídos no período que ainda não foram lançados no caixa */
export function useAtendimentosAReceber(
  barbeariaId: string | null | undefined,
  inicio?: string,
  fim?: string
) {
  const query = useQuery({
    queryKey: ['atendimentos_a_receber', barbeariaId, inicio, fim],
    queryFn: () => financeiroService.listarAtendimentosAReceber(barbeariaId!, inicio!, fim!),
    enabled: !!barbeariaId && !!inicio && !!fim,
  });

  return {
    atendimentos: (query.data || []) as AtendimentoAReceber[],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
