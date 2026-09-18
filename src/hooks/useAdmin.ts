import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminService } from '@/services/admin.service';
import type { BarbeariaNaPlataforma, RegistroDeAuditoria, StatusTenant } from '@/services/admin.service';

const BARBEARIAS_VAZIAS: BarbeariaNaPlataforma[] = [];
const AUDITORIA_VAZIA: RegistroDeAuditoria[] = [];

export function useAdminBarbearias() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['admin_barbearias'],
    queryFn: () => adminService.listarBarbearias(),
  });

  const mutation = useMutation({
    mutationFn: ({
      barbeariaId,
      status,
      motivo,
    }: {
      barbeariaId: string;
      status: StatusTenant;
      motivo?: string;
    }) => adminService.definirStatusDaBarbearia(barbeariaId, status, motivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_barbearias'] });
      queryClient.invalidateQueries({ queryKey: ['admin_metricas'] });
      // A auditoria e escrita pela mesma RPC: sem invalidar aqui, a aba de
      // auditoria mostraria a lista de antes da acao que o admin acabou de fazer.
      queryClient.invalidateQueries({ queryKey: ['admin_auditoria'] });
      // O catalogo publico muda junto -- a barbearia suspensa some dele.
      queryClient.invalidateQueries({ queryKey: ['catalogo'] });
    },
  });

  return {
    barbearias: query.data ?? BARBEARIAS_VAZIAS,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    definirStatus: mutation.mutateAsync,
    isSalvando: mutation.isPending,
  };
}

export function useAdminMetricas() {
  const query = useQuery({
    queryKey: ['admin_metricas'],
    queryFn: () => adminService.metricas(),
  });

  return {
    metricas: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

export function useAdminAuditoria(limite = 100) {
  const query = useQuery({
    queryKey: ['admin_auditoria', limite],
    queryFn: () => adminService.listarAuditoria(limite),
  });

  return {
    registros: query.data ?? AUDITORIA_VAZIA,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
