import { useQuery } from '@tanstack/react-query';
import { catalogoService } from '@/services/catalogo.service';
import type { FiltroCatalogo } from '@/services/catalogo.service';
import type { Database } from '@/types/database.types';

type BarbeariaPublica = Database['public']['Views']['barbearia_publica']['Row'];

/**
 * Referência estável para a lista ainda não carregada. Ver useHorarios.ts:
 * `query.data || []` cria um array novo a cada render enquanto `data` for
 * undefined, e uma dep instável em useEffect vira laço de renderização.
 */
const BARBEARIAS_VAZIAS: BarbeariaPublica[] = [];
const CIDADES_VAZIAS: { cidade: string; estado: string | null }[] = [];

export function useCatalogo(filtro?: FiltroCatalogo) {
  const query = useQuery({
    queryKey: ['catalogo', filtro],
    queryFn: () => catalogoService.listarBarbearias(filtro),
  });

  const cidades = useQuery({
    queryKey: ['catalogo_cidades'],
    queryFn: () => catalogoService.listarCidades(),
  });

  return {
    barbearias: query.data ?? BARBEARIAS_VAZIAS,
    cidades: cidades.data ?? CIDADES_VAZIAS,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

export function usePerfilPublico(slug: string | undefined) {
  const query = useQuery({
    queryKey: ['perfil_publico', slug],
    queryFn: () => catalogoService.obterPerfil(slug!),
    enabled: !!slug,
  });

  return {
    perfil: query.data ?? null,
    // `data === null` é resposta válida (slug não existe), então "não
    // encontrada" só vale depois que a busca terminou.
    naoEncontrada: !query.isLoading && query.data === null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
