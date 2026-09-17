import { useState, useMemo } from 'react';
import { Eye, EyeOff, PackageOpen, Pencil, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/lib/auth/AuthContext';
import { useProdutos } from '@/hooks/useProdutos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/shared/EmptyState';
import { ProdutoFormDialog } from '@/components/produtos/ProdutoFormDialog';
import type { Database } from '@/types/database.types';

type Produto = Database['public']['Tables']['produto']['Row'];

const MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Produtos() {
  const { barbeariaId, podeOperar, motivoBloqueio } = useAuth();
  const { produtos, isLoading, isError, error, alternarStatus, isAlternandoStatus } =
    useProdutos(barbeariaId);

  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState('todos');
  const [formOpen, setFormOpen] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState<Produto | null>(null);

  const produtosFiltrados = useMemo(() => {
    return produtos.filter((p) => {
      if (busca && !p.nome.toLowerCase().includes(busca.toLowerCase())) return false;
      if (status !== 'todos' && p.status !== status) return false;
      return true;
    });
  }, [produtos, busca, status]);

  const abrirNovo = () => {
    setProdutoEditando(null);
    setFormOpen(true);
  };

  const abrirEdicao = (produto: Produto) => {
    setProdutoEditando(produto);
    setFormOpen(true);
  };

  const trocarStatus = async (produto: Produto) => {
    const novo = produto.status === 'ativo' ? 'inativo' : 'ativo';
    try {
      await alternarStatus({ id: produto.id, status: novo });
      toast.success(
        novo === 'ativo'
          ? `${produto.nome} voltou para a vitrine.`
          : `${produto.nome} saiu da vitrine.`
      );
    } catch (err: any) {
      toast.error(err.message || 'Erro ao alterar o status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Produtos</h2>
          <p className="text-sm text-muted-foreground">
            Seu estoque aqui; a vitrine do cliente mostra só os ativos, sem a
            quantidade.
          </p>
        </div>
        <span title={motivoBloqueio ?? undefined}>
          <Button onClick={abrirNovo} disabled={!podeOperar}>
            <Plus className="mr-2 h-4 w-4" /> Cadastrar produto
          </Button>
        </span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder="Buscar por nome"
            className="pl-9"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ativo">Na vitrine</SelectItem>
            <SelectItem value="inativo">Fora da vitrine</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isError ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card p-12 text-center">
          <h3 className="mb-1 text-lg font-semibold">Não foi possível carregar os produtos</h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            {(error as Error)?.message || 'Erro desconhecido ao consultar o catálogo.'}
          </p>
        </div>
      ) : isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : produtosFiltrados.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title={produtos.length === 0 ? 'Nenhum produto cadastrado' : 'Nada encontrado'}
          description={
            produtos.length === 0
              ? 'Cadastre os produtos que a sua barbearia vende para montar a vitrine.'
              : 'Nenhum produto corresponde ao filtro atual.'
          }
          action={
            produtos.length === 0 ? (
              <span title={motivoBloqueio ?? undefined}>
                <Button onClick={abrirNovo} disabled={!podeOperar}>
                  <Plus className="mr-2 h-4 w-4" /> Cadastrar produto
                </Button>
              </span>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead className="text-right">Estoque</TableHead>
                <TableHead>Vitrine</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {produtosFiltrados.map((produto) => (
                <TableRow key={produto.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {produto.imagem_url ? (
                        <img
                          src={produto.imagem_url}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-md border object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted/30 text-muted-foreground">
                          <PackageOpen className="h-4 w-4" aria-hidden="true" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium">{produto.nome}</p>
                        {produto.descricao && (
                          <p className="truncate text-sm text-muted-foreground">
                            {produto.descricao}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="text-right tabular-nums">
                    {MOEDA.format(Number(produto.preco))}
                  </TableCell>

                  <TableCell className="text-right tabular-nums">
                    {produto.quantidade === 0 ? (
                      <Badge variant="destructive">Sem estoque</Badge>
                    ) : (
                      produto.quantidade
                    )}
                  </TableCell>

                  <TableCell>
                    <Badge variant={produto.status === 'ativo' ? 'default' : 'secondary'}>
                      {produto.status === 'ativo' ? 'Visível' : 'Oculto'}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <span title={motivoBloqueio ?? undefined}>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={!podeOperar}
                          onClick={() => abrirEdicao(produto)}
                          aria-label={`Editar ${produto.nome}`}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </span>
                      <span
                        title={
                          motivoBloqueio ??
                          (produto.status === 'ativo'
                            ? 'Tirar da vitrine do cliente'
                            : 'Colocar na vitrine do cliente')
                        }
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={!podeOperar || isAlternandoStatus}
                          onClick={() => void trocarStatus(produto)}
                          aria-label={
                            produto.status === 'ativo'
                              ? `Tirar ${produto.nome} da vitrine`
                              : `Colocar ${produto.nome} na vitrine`
                          }
                        >
                          {produto.status === 'ativo' ? (
                            <EyeOff className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <Eye className="h-4 w-4" aria-hidden="true" />
                          )}
                        </Button>
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ProdutoFormDialog
        produto={produtoEditando}
        open={formOpen}
        onOpenChange={(aberto) => {
          setFormOpen(aberto);
          if (!aberto) setProdutoEditando(null);
        }}
      />
    </div>
  );
}
