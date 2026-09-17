import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agendamentosService } from '@/services/agendamentos.service';
import type { AgendamentoComDetalhes } from '@/services/agendamentos.service';
import type { Database } from '@/types/database.types';

type AgendamentoInsert = Database['public']['Tables']['agendamento']['Insert'];
type StatusAgendamento = Database['public']['Enums']['status_agendamento'];

/**
 * Referência estável para a lista ainda não carregada. Ver useHorarios.ts:
 * `query.data || []` cria um array novo a cada render enquanto `data` for
 * undefined, e uma dep instável em useEffect vira laço de renderização.
 */
const AGENDAMENTOS_VAZIOS: AgendamentoComDetalhes[] = [];

export function useAgendamentos(barbeariaId: string | null, inicio?: string, fim?: string) {
  const queryClient = useQueryClient();

  // Criar, cancelar ou mudar status altera a ocupação da agenda, então os horários
  // livres calculados para o formulário deixam de valer.
  const invalidarAgenda = () => {
    queryClient.invalidateQueries({ queryKey: ['agendamentos', barbeariaId] });
    queryClient.invalidateQueries({ queryKey: ['disponibilidade', barbeariaId] });
    queryClient.invalidateQueries({ queryKey: ['agendamentos_proximos', barbeariaId] });
    queryClient.invalidateQueries({ queryKey: ['dashboard_proximos', barbeariaId] });
  };

  const query = useQuery({
    queryKey: ['agendamentos', barbeariaId, inicio, fim],
    queryFn: () => agendamentosService.listarPorPeriodo(barbeariaId!, inicio!, fim!),
    enabled: !!barbeariaId && !!inicio && !!fim,
  });

  const criarMutation = useMutation({
    mutationFn: ({ agendamentoData, servicoIds }: { agendamentoData: Omit<AgendamentoInsert, 'data_hora_fim'>, servicoIds: string[] }) => 
      agendamentosService.criarAgendamento(agendamentoData, servicoIds),
    onSuccess: invalidarAgenda,
  });

  const atualizarStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: StatusAgendamento }) => 
      agendamentosService.atualizarStatus(id, status),
    onSuccess: invalidarAgenda,
  });

  const excluirMutation = useMutation({
    mutationFn: (id: string) => agendamentosService.excluir(id),
    onSuccess: invalidarAgenda,
  });

  const cancelarMutation = useMutation({
    mutationFn: ({ id, canceladoPorId }: { id: string; canceladoPorId: string }) => 
      agendamentosService.cancelar(id, canceladoPorId),
    onSuccess: invalidarAgenda,
  });

  return {
    agendamentos: query.data ?? AGENDAMENTOS_VAZIOS,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    criarAgendamento: criarMutation.mutateAsync,
    isCriando: criarMutation.isPending,
    atualizarStatus: atualizarStatusMutation.mutateAsync,
    isAtualizando: atualizarStatusMutation.isPending,
    cancelarAgendamento: cancelarMutation.mutateAsync,
    isCancelando: cancelarMutation.isPending,
    excluirAgendamento: excluirMutation.mutateAsync,
    isExcluindo: excluirMutation.isPending,
  };
}

/**
 * Próximos agendamentos da barbearia, agrupados por profissional.
 *
 * Alimenta o cartão "Próximo da fila" da Dashboard: a consulta é única e o
 * agrupamento acontece em memória.
 */
export function useProximosPorProfissional(barbeariaId: string | null | undefined) {
  const query = useQuery({
    queryKey: ['agendamentos_proximos', barbeariaId],
    queryFn: () => agendamentosService.listarProximos(barbeariaId!),
    enabled: !!barbeariaId,
  });

  const porProfissional = useMemo(() => {
    const mapa = new Map<string, AgendamentoComDetalhes>();
    for (const agendamento of query.data ?? []) {
      const id = agendamento.profissional?.id;
      // A lista já vem ordenada por data_hora, então o primeiro de cada
      // profissional é o próximo da fila dele
      if (id && !mapa.has(id)) mapa.set(id, agendamento);
    }
    return mapa;
  }, [query.data]);

  return {
    porProfissional,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
