import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agendamentosService } from '@/services/agendamentos.service';
import type { Database } from '@/types/database.types';

type AgendamentoInsert = Database['public']['Tables']['agendamento']['Insert'];
type StatusAgendamento = Database['public']['Enums']['status_agendamento'];

export function useAgendamentos(barbeariaId: string | null, inicio?: string, fim?: string) {
  const queryClient = useQueryClient();

  // Criar, cancelar ou mudar status altera a ocupação da agenda, então os horários
  // livres calculados para o formulário deixam de valer.
  const invalidarAgenda = () => {
    queryClient.invalidateQueries({ queryKey: ['agendamentos', barbeariaId] });
    queryClient.invalidateQueries({ queryKey: ['disponibilidade', barbeariaId] });
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

  const cancelarMutation = useMutation({
    mutationFn: ({ id, canceladoPorId }: { id: string; canceladoPorId: string }) => 
      agendamentosService.cancelar(id, canceladoPorId),
    onSuccess: invalidarAgenda,
  });

  return {
    agendamentos: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    criarAgendamento: criarMutation.mutateAsync,
    isCriando: criarMutation.isPending,
    atualizarStatus: atualizarStatusMutation.mutateAsync,
    isAtualizando: atualizarStatusMutation.isPending,
    cancelarAgendamento: cancelarMutation.mutateAsync,
    isCancelando: cancelarMutation.isPending,
  };
}
