import { useMutation, useQueryClient } from '@tanstack/react-query';
import { barbeariaService } from '@/services/barbearia.service';
import { useAuth } from '@/lib/auth/AuthContext';

interface Marca {
  tema_cor_primaria?: string | null;
  tema_logo_url?: string | null;
  tema_banner_url?: string | null;
  tema_descricao?: string | null;
}

/** Escrita da identidade visual da barbearia. A leitura vem de `useBarbeariaAtual`. */
export function useMarca() {
  const queryClient = useQueryClient();
  const { barbeariaId } = useAuth();

  const mutation = useMutation({
    mutationFn: (marca: Marca) => {
      // Falhar alto em vez de resolver em silêncio: resolver aqui faria a tela
      // anunciar "identidade atualizada" sem nada ter sido gravado.
      if (!barbeariaId) {
        return Promise.reject(new Error('Barbearia não identificada.'));
      }
      return barbeariaService.atualizarMarca(barbeariaId, marca);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barbearia_config', barbeariaId] });
    },
  });

  return {
    atualizarMarca: mutation.mutateAsync,
    isSalvando: mutation.isPending,
  };
}
