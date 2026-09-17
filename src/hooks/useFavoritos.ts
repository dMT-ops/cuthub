import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { favoritosService } from '@/services/favoritos.service';
import type { AlvoFavorito } from '@/services/favoritos.service';
import { useAuth } from '@/lib/auth/AuthContext';
import type { Database } from '@/types/database.types';

type Favorito = Database['public']['Tables']['favorito']['Row'];

/**
 * Referência estável para a lista ainda não carregada. Ver useHorarios.ts:
 * `query.data || []` cria um array novo a cada render enquanto `data` for
 * undefined, e uma dep instável em useEffect vira laço de renderização.
 */
const FAVORITOS_VAZIOS: Favorito[] = [];

/** Chave de comparação de um favorito, para saber se o coração está cheio. */
function chave(f: Pick<Favorito, 'tipo' | 'barbearia_id' | 'servico_id' | 'profissional_id' | 'agendamento_id'>) {
  return [f.tipo, f.barbearia_id, f.servico_id ?? '', f.profissional_id ?? '', f.agendamento_id ?? ''].join('|');
}

export function useFavoritos() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['favoritos', user?.id],
    queryFn: () => favoritosService.listar(),
    enabled: !!user,
  });

  const favoritos = query.data ?? FAVORITOS_VAZIOS;

  const porChave = useMemo(() => {
    const mapa = new Map<string, Favorito>();
    for (const f of favoritos) mapa.set(chave(f), f);
    return mapa;
  }, [favoritos]);

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ['favoritos', user?.id] });
  };

  const adicionar = useMutation({
    mutationFn: (alvo: AlvoFavorito) => {
      // Falhar alto em vez de resolver em silêncio: sem usuário não há favorito,
      // e resolver aqui faria o coração encher sem nada ter sido gravado.
      if (!user) return Promise.reject(new Error('Entre na sua conta para favoritar.'));
      return favoritosService.adicionar(user.id, alvo);
    },
    onSuccess: invalidar,
  });

  const remover = useMutation({
    mutationFn: (id: string) => favoritosService.remover(id),
    onSuccess: invalidar,
  });

  /** O favorito correspondente a este alvo, se existir. */
  const encontrar = (alvo: AlvoFavorito) =>
    porChave.get(
      chave({
        tipo: alvo.tipo,
        barbearia_id: alvo.barbeariaId,
        servico_id: alvo.servicoId ?? null,
        profissional_id: alvo.profissionalId ?? null,
        agendamento_id: alvo.agendamentoId ?? null,
      })
    ) ?? null;

  /** Liga ou desliga o favorito deste alvo. */
  const alternar = async (alvo: AlvoFavorito) => {
    const atual = encontrar(alvo);
    if (atual) {
      await remover.mutateAsync(atual.id);
      return false;
    }
    await adicionar.mutateAsync(alvo);
    return true;
  };

  return {
    favoritos,
    encontrar,
    alternar,
    isLoading: query.isLoading,
    isSalvando: adicionar.isPending || remover.isPending,
  };
}
