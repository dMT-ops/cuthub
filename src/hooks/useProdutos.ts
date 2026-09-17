import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { produtosService } from '@/services/produtos.service';
import type { ListarProdutosOptions } from '@/services/produtos.service';
import type { Database } from '@/types/database.types';

type Produto = Database['public']['Tables']['produto']['Row'];
type ProdutoInsert = Database['public']['Tables']['produto']['Insert'];
type StatusRegistro = Database['public']['Enums']['status_registro'];

/**
 * Referência estável para a lista ainda não carregada. Ver useHorarios.ts:
 * `query.data || []` cria um array novo a cada render enquanto `data` for
 * undefined, e uma dep instável em useEffect vira laço de renderização.
 */
const PRODUTOS_VAZIOS: Produto[] = [];

export function useProdutos(
  barbeariaId: string | null | undefined,
  options?: ListarProdutosOptions
) {
  const queryClient = useQueryClient();

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ['produtos', barbeariaId] });
  };

  const query = useQuery({
    queryKey: ['produtos', barbeariaId, options],
    queryFn: () => produtosService.listarProdutos(barbeariaId!, options),
    enabled: !!barbeariaId,
  });

  const criar = useMutation({
    mutationFn: (produto: Omit<ProdutoInsert, 'barbearia_id'>) => {
      // Falhar alto em vez de resolver em silêncio: resolver aqui faria a tela
      // anunciar sucesso sem nada ter sido gravado.
      if (!barbeariaId) {
        return Promise.reject(new Error('Barbearia não identificada.'));
      }
      return produtosService.criarProduto({ ...produto, barbearia_id: barbeariaId });
    },
    onSuccess: invalidar,
  });

  const atualizar = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ProdutoInsert> }) =>
      produtosService.atualizarProduto(id, updates),
    onSuccess: invalidar,
  });

  const alternarStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: StatusRegistro }) =>
      produtosService.alternarStatus(id, status),
    onSuccess: invalidar,
  });

  return {
    produtos: query.data ?? PRODUTOS_VAZIOS,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    criarProduto: criar.mutateAsync,
    isCriando: criar.isPending,
    atualizarProduto: atualizar.mutateAsync,
    isAtualizando: atualizar.isPending,
    alternarStatus: alternarStatus.mutateAsync,
    isAlternandoStatus: alternarStatus.isPending,
  };
}
