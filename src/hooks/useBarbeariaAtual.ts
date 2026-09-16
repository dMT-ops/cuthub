import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/AuthContext';
import { barbeariaService } from '@/services/barbearia.service';

export function useBarbeariaAtual() {
  const { barbeariaId } = useAuth();

  const queryBarbearia = useQuery({
    queryKey: ['barbearia', barbeariaId],
    queryFn: () => barbeariaService.obterBarbearia(barbeariaId!),
    enabled: !!barbeariaId,
  });

  const queryConfig = useQuery({
    queryKey: ['barbearia_config', barbeariaId],
    queryFn: () => barbeariaService.obterConfiguracao(barbeariaId!),
    enabled: !!barbeariaId,
  });

  return {
    barbearia: queryBarbearia.data,
    configuracao: queryConfig.data,
    isLoading: queryBarbearia.isLoading || queryConfig.isLoading,
    isError: queryBarbearia.isError || queryConfig.isError,
    error: queryBarbearia.error || queryConfig.error,
  };
}
