import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, Heart, Store } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth/AuthContext';
import { useMeusAgendamentos } from '@/hooks/useMeusAgendamentos';
import { useMemo } from 'react';
import { useFavoritos } from '@/hooks/useFavoritos';
import { usePromocoesVigentes } from '@/hooks/usePromocoes';
import { useCatalogo } from '@/hooks/useCatalogo';
import { CardPromocao } from '@/components/publico/CardPromocao';

const ATALHOS = [
  { to: '/minha-conta/agendamentos', label: 'Meus agendamentos', icon: CalendarDays },
  { to: '/minha-conta/favoritos', label: 'Meus favoritos', icon: Heart },
  { to: '/barbearias', label: 'Explorar barbearias', icon: Store },
];

export default function MinhaConta() {
  const { perfil } = useAuth();
  const { proximo, isLoading, isError, error } = useMeusAgendamentos();
  const { favoritos } = useFavoritos();
  const { barbearias } = useCatalogo();

  // Conteúdo que já existe no sistema, trazido para preencher a coluna que
  // sobrava em tela larga — em vez de esticar o que já estava aqui.
  const idsFavoritos = useMemo(
    () => Array.from(new Set(favoritos.map((f) => f.barbearia_id))),
    [favoritos]
  );
  const { promocoes } = usePromocoesVigentes(idsFavoritos);
  const porId = useMemo(() => {
    const mapa = new Map<string, (typeof barbearias)[number]>();
    for (const b of barbearias) if (b.id) mapa.set(b.id, b);
    return mapa;
  }, [barbearias]);

  const primeiroNome = perfil?.nome?.split(' ')[0];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {primeiroNome ? `Olá, ${primeiroNome}` : 'Olá'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Seus agendamentos e as barbearias que você acompanha.
        </p>
      </div>

      {/* Em `lg` vira duas colunas; abaixo disso continua empilhado, como foi
          validado no mobile. */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-8">
      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Próximo agendamento</h2>

        {isError ? (
          <div className="rounded-xl border border-dashed p-6 text-sm text-destructive">
            {(error as Error)?.message || 'Não foi possível carregar seus agendamentos.'}
          </div>
        ) : isLoading ? (
          <Skeleton className="h-28 w-full rounded-xl" />
        ) : !proximo ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Você não tem nenhum atendimento marcado.
            </p>
            <Button asChild className="mt-4">
              <Link to="/barbearias">Encontrar uma barbearia</Link>
            </Button>
          </div>
        ) : (
          <article className="rounded-xl border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-lg font-semibold">
                  {proximo.data_hora
                    ? format(new Date(proximo.data_hora), "EEEE, d 'de' MMMM 'às' HH:mm", {
                        locale: ptBR,
                      })
                    : 'Data a confirmar'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {proximo.barbearia_nome}
                  {proximo.profissional_nome ? ` · com ${proximo.profissional_nome}` : ''}
                </p>
              </div>
              {proximo.status && <Badge variant="secondary">{proximo.status}</Badge>}
            </div>

            {proximo.barbearia_slug && (
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link to={`/b/${proximo.barbearia_slug}`}>Ver a barbearia</Link>
              </Button>
            )}
          </article>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Atalhos</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {ATALHOS.map(({ to, label, icon: Icone }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/50"
            >
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icone className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-sm font-medium">{label}</span>
              {to.endsWith('favoritos') && favoritos.length > 0 && (
                <Badge variant="outline" className="ml-auto">
                  {favoritos.length}
                </Badge>
              )}
            </Link>
          ))}
        </div>
      </section>
      </div>

      {promocoes.length > 0 && (
        <aside className="min-w-0 space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Ofertas nas suas barbearias
          </h2>
          {promocoes.slice(0, 4).map((p) => {
            const b = p.barbearia_id ? porId.get(p.barbearia_id) : undefined;
            return (
              <CardPromocao
                key={p.id}
                titulo={p.titulo}
                descricao={p.descricao}
                desconto={p.desconto_percentual}
                dataFim={p.data_fim}
                cor={b?.cor_primaria}
                barbearia={b?.nome}
              />
            );
          })}
        </aside>
      )}
      </div>
    </div>
  );
}
