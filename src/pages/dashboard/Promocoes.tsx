import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Eye, EyeOff, Pencil, Percent, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/lib/auth/AuthContext';
import { usePromocoes } from '@/hooks/usePromocoes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { PromocaoFormDialog } from '@/components/promocoes/PromocaoFormDialog';
import type { Database } from '@/types/database.types';

type Promocao = Database['public']['Tables']['promocao']['Row'];

/**
 * Onde a promoção está na linha do tempo.
 *
 * Três estados, não dois: o gestor precisa distinguir "ainda não começou" de
 * "já acabou" — as duas somem da vitrine, mas por motivos opostos e com ações
 * diferentes.
 */
function situacao(p: Promocao): { texto: string; variante: 'default' | 'secondary' | 'outline' } {
  if (p.status !== 'ativo') return { texto: 'Inativa', variante: 'secondary' };
  const agora = Date.now();
  if (new Date(p.data_inicio).getTime() > agora) return { texto: 'Agendada', variante: 'outline' };
  if (new Date(p.data_fim).getTime() < agora) return { texto: 'Encerrada', variante: 'secondary' };
  return { texto: 'No ar', variante: 'default' };
}

export default function Promocoes() {
  const { barbeariaId, podeOperar, motivoBloqueio } = useAuth();
  const { promocoes, isLoading, isError, error, alternarStatus, isAlternandoStatus } =
    usePromocoes(barbeariaId);

  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<Promocao | null>(null);

  const abrirNova = () => {
    setEditando(null);
    setFormOpen(true);
  };

  const trocarStatus = async (p: Promocao) => {
    const novo = p.status === 'ativo' ? 'inativo' : 'ativo';
    try {
      await alternarStatus({ id: p.id, status: novo });
      toast.success(novo === 'ativo' ? `${p.titulo} reativada.` : `${p.titulo} desativada.`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao alterar o status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Promoções</h2>
          <p className="text-sm text-muted-foreground">
            Aparecem no seu perfil público enquanto estiverem vigentes.
          </p>
        </div>
        <span title={motivoBloqueio ?? undefined}>
          <Button onClick={abrirNova} disabled={!podeOperar}>
            <Plus className="mr-2 h-4 w-4" /> Nova promoção
          </Button>
        </span>
      </div>

      {isError ? (
        <div className="rounded-xl border border-dashed bg-card p-12 text-center">
          <h3 className="mb-1 text-lg font-semibold">Não foi possível carregar as promoções</h3>
          <p className="text-sm text-muted-foreground">
            {(error as Error)?.message || 'Erro desconhecido.'}
          </p>
        </div>
      ) : isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : promocoes.length === 0 ? (
        <EmptyState
          icon={Percent}
          title="Nenhuma promoção cadastrada"
          description="Crie uma promoção para destacar sua barbearia no catálogo."
          action={
            <span title={motivoBloqueio ?? undefined}>
              <Button onClick={abrirNova} disabled={!podeOperar}>
                <Plus className="mr-2 h-4 w-4" /> Nova promoção
              </Button>
            </span>
          }
        />
      ) : (
        <ul className="divide-y rounded-lg border">
          {promocoes.map((p) => {
            const s = situacao(p);
            return (
              <li key={p.id} className="flex flex-wrap items-center gap-3 p-4">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                  {Number(p.desconto_percentual)}%
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.titulo}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(p.data_inicio), "d 'de' MMM", { locale: ptBR })} até{' '}
                    {format(new Date(p.data_fim), "d 'de' MMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>

                <Badge variant={s.variante}>{s.texto}</Badge>

                <div className="flex gap-1">
                  <span title={motivoBloqueio ?? undefined}>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={!podeOperar}
                      onClick={() => {
                        setEditando(p);
                        setFormOpen(true);
                      }}
                      aria-label={`Editar ${p.titulo}`}
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </span>
                  <span
                    title={
                      motivoBloqueio ??
                      (p.status === 'ativo' ? 'Tirar do ar' : 'Colocar no ar')
                    }
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={!podeOperar || isAlternandoStatus}
                      onClick={() => void trocarStatus(p)}
                      aria-label={p.status === 'ativo' ? `Desativar ${p.titulo}` : `Reativar ${p.titulo}`}
                    >
                      {p.status === 'ativo' ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                    </Button>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <PromocaoFormDialog
        promocao={editando}
        open={formOpen}
        onOpenChange={(aberto) => {
          setFormOpen(aberto);
          if (!aberto) setEditando(null);
        }}
      />
    </div>
  );
}
