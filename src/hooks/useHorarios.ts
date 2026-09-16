import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { horariosService } from '@/services/horarios.service';

export function useHorarios(profissionalId: string | null | undefined, barbeariaId: string | null | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['horarios', profissionalId],
    queryFn: () => profissionalId ? horariosService.obterJornada(profissionalId) : Promise.resolve([]),
    enabled: !!profissionalId && !!barbeariaId,
  });

  const salvarMutation = useMutation({
    mutationFn: (faixasNovas: any[]) => {
      if (!barbeariaId || !profissionalId) return Promise.resolve();
      const atuais = query.data || [];
      return horariosService.salvarJornada(barbeariaId, profissionalId, atuais, faixasNovas);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['horarios', profissionalId] });
    },
  });

  return {
    horarios: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    salvarJornada: salvarMutation.mutateAsync,
    isSalvando: salvarMutation.isPending,
  };
}
