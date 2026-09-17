import { useMutation, useQueryClient } from '@tanstack/react-query';
import { barbeariaService } from '@/services/barbearia.service';
import { authService } from '@/services/auth.service';
import { useAuth } from '@/lib/auth/AuthContext';

/**
 * Mutações da tela de Configurações.
 *
 * A leitura continua em `useBarbeariaAtual` (barbearia + configuração) e no
 * `AuthContext` (perfil) — aqui ficam apenas as escritas e as invalidações.
 */
export function useConfiguracoes() {
  const queryClient = useQueryClient();
  const { barbeariaId, user, recarregarPerfil } = useAuth();

  const nomeBarbearia = useMutation({
    mutationFn: (dados: {
      nome: string;
      cidade?: string | null;
      estado?: string | null;
      listada_no_catalogo?: boolean;
    }) => barbeariaService.atualizarBarbearia(barbeariaId!, dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barbearia', barbeariaId] });
      // O catalogo publico mostra estes mesmos dados; sem isto a lista ficaria
      // com o nome ou a cidade antigos ate alguem recarregar a pagina.
      queryClient.invalidateQueries({ queryKey: ['catalogo'] });
      queryClient.invalidateQueries({ queryKey: ['catalogo_cidades'] });
    },
  });

  const horarioFuncionamento = useMutation({
    mutationFn: (horarios: { horario_abertura: string; horario_fechamento: string }) =>
      barbeariaService.atualizarConfiguracao(barbeariaId!, horarios),
    onSuccess: () => {
      // A Agenda desenha a grade do dia e da semana a partir desta configuração
      queryClient.invalidateQueries({ queryKey: ['barbearia_config', barbeariaId] });
    },
  });

  const nomeUsuario = useMutation({
    mutationFn: (nome: string) => authService.atualizarNome(user!.id, nome),
    onSuccess: () => recarregarPerfil(),
  });

  return {
    atualizarDadosBarbearia: nomeBarbearia.mutateAsync,
    isSalvandoBarbearia: nomeBarbearia.isPending,
    atualizarHorarioFuncionamento: horarioFuncionamento.mutateAsync,
    isSalvandoHorario: horarioFuncionamento.isPending,
    atualizarNomeUsuario: nomeUsuario.mutateAsync,
    isSalvandoUsuario: nomeUsuario.isPending,
  };
}
