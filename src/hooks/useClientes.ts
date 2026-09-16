import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientesService } from '@/services/clientes.service';
import type { ListarClientesOptions } from '@/services/clientes.service';
import type { ClienteInsert } from '@/types/database.types';

export function useClientes(
  barbeariaId: string | null | undefined,
  options?: ListarClientesOptions
) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['clientes', barbeariaId, options],
    queryFn: () => barbeariaId ? clientesService.listarClientes(barbeariaId, options) : Promise.resolve({ clientes: [], count: 0 }),
    enabled: !!barbeariaId,
  });

  const criarMutation = useMutation({
    mutationFn: (cliente: ClienteInsert) => clientesService.criarCliente(cliente),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes', barbeariaId] });
    },
  });

  const atualizarMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ClienteInsert> }) => 
      clientesService.atualizarCliente(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clientes', barbeariaId] });
      queryClient.invalidateQueries({ queryKey: ['clienteDetalhes', variables.id] });
    },
  });

  const alternarStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ativo' | 'inativo' }) =>
      clientesService.alternarStatus({ id, status }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clientes', barbeariaId] });
      queryClient.invalidateQueries({ queryKey: ['clienteDetalhes', variables.id] });
    },
  });

  return {
    clientes: query.data?.clientes || [],
    totalCount: query.data?.count || 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    criarCliente: criarMutation.mutateAsync,
    isCriando: criarMutation.isPending,
    atualizarCliente: atualizarMutation.mutateAsync,
    isAtualizando: atualizarMutation.isPending,
    alternarStatus: alternarStatusMutation.mutateAsync,
    verificarDuplicidade: (telefone: string | null, email: string | null, ignoreId?: string) => 
      barbeariaId ? clientesService.verificarDuplicidade(barbeariaId, telefone, email, ignoreId) : Promise.resolve({ telefoneDuplicado: false, emailDuplicado: false }),
    verificarAgendamentoFuturo: (id: string) => clientesService.verificarAgendamentoFuturo(id),
  };
}

export function useClienteDetalhes(clienteId: string | null) {
  return useQuery({
    queryKey: ['clienteDetalhes', clienteId],
    queryFn: () => clienteId ? clientesService.obterDetalhesCliente(clienteId) : Promise.resolve(null),
    enabled: !!clienteId,
  });
}
