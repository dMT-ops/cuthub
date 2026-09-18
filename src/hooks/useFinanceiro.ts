import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeiroService } from '@/services/financeiro.service';
import type {
  AtendimentoAReceber,
  ComissaoAPagar,
  LancamentoComDetalhes,
  ListarLancamentosOptions,
} from '@/services/financeiro.service';
import type { Database } from '@/types/database.types';

type LancamentoInsert = Database['public']['Tables']['lancamento_financeiro']['Insert'];
type LancamentoUpdate = Database['public']['Tables']['lancamento_financeiro']['Update'];

/**
 * Referência estável para a lista ainda não carregada. Ver useHorarios.ts:
 * `query.data || []` cria um array novo a cada render enquanto `data` for
 * undefined, e uma dep instável em useEffect vira laço de renderização.
 */
const LANCAMENTOS_VAZIOS: LancamentoComDetalhes[] = [];
const ATENDIMENTOS_VAZIOS: AtendimentoAReceber[] = [];
const COMISSOES_VAZIAS: ComissaoAPagar[] = [];

export function useFinanceiro(
  barbeariaId: string | null | undefined,
  options?: ListarLancamentosOptions
) {
  const queryClient = useQueryClient();

  const invalidarCaixa = () => {
    queryClient.invalidateQueries({ queryKey: ['lancamentos', barbeariaId] });
    queryClient.invalidateQueries({ queryKey: ['resumo_financeiro', barbeariaId] });
    queryClient.invalidateQueries({ queryKey: ['atendimentos_a_receber', barbeariaId] });
    // A comissao sai da receita lancada: registrar entrada muda o devido, e
    // registrar o pagamento muda o pendente. Os dois casos passam por aqui.
    queryClient.invalidateQueries({ queryKey: ['comissoes_a_pagar', barbeariaId] });
    // Um lancamento novo pode ser a provisao de uma despesa fixa. Sem invalidar
    // aqui, o painel continua oferecendo "a lancar" o que ja foi lancado -- e o
    // segundo clique duplica a despesa, porque a unicidade por mes nao existe
    // no banco (ver nota na migration 00020).
    queryClient.invalidateQueries({ queryKey: ['despesas_ja_lancadas', barbeariaId] });
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

  const atualizarMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: LancamentoUpdate }) =>
      financeiroService.atualizarLancamento(id, barbeariaId!, patch),
    onSuccess: invalidarCaixa,
  });

  const excluirMutation = useMutation({
    mutationFn: (id: string) => financeiroService.excluirLancamento(id, barbeariaId!),
    onSuccess: invalidarCaixa,
  });

  return {
    lancamentos: query.data ?? LANCAMENTOS_VAZIOS,
    resumo: queryResumo.data,
    isLoading: query.isLoading || queryResumo.isLoading,
    isError: query.isError || queryResumo.isError,
    error: query.error || queryResumo.error,
    criarLancamento: criarMutation.mutateAsync,
    isCriando: criarMutation.isPending,
    atualizarLancamento: atualizarMutation.mutateAsync,
    isAtualizando: atualizarMutation.isPending,
    excluirLancamento: excluirMutation.mutateAsync,
    isExcluindo: excluirMutation.isPending,
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
    atendimentos: query.data ?? ATENDIMENTOS_VAZIOS,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

/** Comissão a pagar por profissional no período, apurada sobre a receita já lançada */
export function useComissoesAPagar(
  barbeariaId: string | null | undefined,
  inicio?: string,
  fim?: string
) {
  const query = useQuery({
    queryKey: ['comissoes_a_pagar', barbeariaId, inicio, fim],
    queryFn: () => financeiroService.listarComissoesAPagar(barbeariaId!, inicio!, fim!),
    enabled: !!barbeariaId && !!inicio && !!fim,
  });

  return {
    comissoes: query.data ?? COMISSOES_VAZIAS,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
