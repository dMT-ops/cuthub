import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { useFavoritos } from '@/hooks/useFavoritos';
import { useCatalogo } from '@/hooks/useCatalogo';
import { CapaBarbearia, LogoBarbearia } from '@/components/publico/CapaBarbearia';
import { BotaoFavorito } from '@/components/publico/BotaoFavorito';

export default function MeusFavoritos() {
  const { favoritos, isLoading } = useFavoritos();
  // O catálogo já traz nome, slug e marca. Os favoritos guardam só o id — é a
  // view pública que sabe como a barbearia se apresenta.
  const { barbearias, isLoading: carregandoCatalogo } = useCatalogo();

  const porId = useMemo(() => {
    const mapa = new Map<string, (typeof barbearias)[number]>();
    for (const b of barbearias) if (b.id) mapa.set(b.id, b);
    return mapa;
  }, [barbearias]);

  const barbeariasFavoritas = useMemo(
    () =>
      favoritos
        .filter((f) => f.tipo === 'barbearia')
        .map((f) => porId.get(f.barbearia_id))
        // Uma barbearia favoritada que saiu do catálogo some da view pública.
        // Não é erro: ela optou por não estar mais listada.
        .filter((b): b is NonNullable<typeof b> => !!b),
    [favoritos, porId]
  );

  const outros = useMemo(() => favoritos.filter((f) => f.tipo !== 'barbearia'), [favoritos]);

  const carregando = isLoading || carregandoCatalogo;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Meus favoritos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          As barbearias e os serviços que você marcou.
        </p>
      </div>

      {carregando ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      ) : favoritos.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Nada favoritado ainda"
          description="Toque no coração de uma barbearia ou de um serviço para guardar aqui."
          action={
            <Button asChild>
              <Link to="/barbearias">Explorar barbearias</Link>
            </Button>
          }
        />
      ) : (
        <>
          {barbeariasFavoritas.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">Barbearias</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {barbeariasFavoritas.map((b) => (
                  <article
                    key={b.id}
                    className="relative overflow-hidden rounded-xl border bg-card transition-colors hover:border-primary/50"
                  >
                    <Link to={`/b/${b.slug}`} className="block">
                      <CapaBarbearia
                        bannerUrl={b.banner_url}
                        corPrimaria={b.cor_primaria}
                        className="h-20"
                      />
                      <div className="flex items-center gap-3 p-4">
                        <LogoBarbearia
                          nome={b.nome ?? ''}
                          logoUrl={b.logo_url}
                          corPrimaria={b.cor_primaria}
                          className="-mt-10 h-12 w-12"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{b.nome}</p>
                          {b.cidade && (
                            <p className="truncate text-sm text-muted-foreground">
                              {b.estado ? `${b.cidade} — ${b.estado}` : b.cidade}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>

                    {b.id && b.nome && (
                      <div className="absolute right-3 top-3">
                        <BotaoFavorito
                          alvo={{ tipo: 'barbearia', barbeariaId: b.id }}
                          rotulo={b.nome}
                          className="bg-background/80 backdrop-blur hover:bg-background"
                        />
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}

          {outros.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">
                Serviços e agendamentos
              </h2>
              <ul className="divide-y rounded-lg border">
                {outros.map((f) => {
                  const barbearia = porId.get(f.barbearia_id);
                  return (
                    <li key={f.id} className="flex items-center gap-3 p-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">
                          {f.tipo === 'servico_profissional' ? 'Serviço favorito' : 'Agendamento favorito'}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {barbearia?.nome ?? 'Barbearia fora do catálogo'}
                        </p>
                      </div>
                      {barbearia?.slug && (
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/b/${barbearia.slug}`}>Abrir</Link>
                        </Button>
                      )}
                      <BotaoFavorito
                        alvo={{
                          tipo: f.tipo,
                          barbeariaId: f.barbearia_id,
                          servicoId: f.servico_id,
                          profissionalId: f.profissional_id,
                          agendamentoId: f.agendamento_id,
                        }}
                        rotulo="este favorito"
                      />
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
