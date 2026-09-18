import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Percent } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { useFavoritos } from '@/hooks/useFavoritos';
import { useCatalogo } from '@/hooks/useCatalogo';
import { usePromocoesVigentes } from '@/hooks/usePromocoes';
import { CardPromocao } from '@/components/publico/CardPromocao';

export default function MinhasPromocoes() {
  const { favoritos, isLoading: carregandoFavoritos } = useFavoritos();
  const { barbearias, isLoading: carregandoCatalogo } = useCatalogo();

  // Só as barbearias que o cliente favoritou. Mostrar promoção de todas
  // transformaria a área pessoal num segundo catálogo — e a decisão do Chefe foi
  // "as promoções das barbearias que o cliente favoritou".
  const barbeariaIds = useMemo(
    () => Array.from(new Set(favoritos.map((f) => f.barbearia_id))),
    [favoritos]
  );

  const { promocoes, isLoading: carregandoPromocoes } = usePromocoesVigentes(barbeariaIds);

  const porBarbearia = useMemo(() => {
    const mapa = new Map<string, (typeof barbearias)[number]>();
    for (const b of barbearias) if (b.id) mapa.set(b.id, b);
    return mapa;
  }, [barbearias]);

  const carregando = carregandoFavoritos || carregandoCatalogo || carregandoPromocoes;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Promoções</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          O que está valendo nas barbearias que você favoritou.
        </p>
      </div>

      {carregando ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      ) : barbeariaIds.length === 0 ? (
        <EmptyState
          icon={Percent}
          title="Favorite uma barbearia primeiro"
          description="As promoções que aparecem aqui são das barbearias que você segue."
          action={
            <Button asChild>
              <Link to="/barbearias">Explorar barbearias</Link>
            </Button>
          }
        />
      ) : promocoes.length === 0 ? (
        <EmptyState
          icon={Percent}
          title="Nenhuma promoção no ar"
          description="Suas barbearias favoritas não têm promoção vigente no momento."
        />
      ) : (
        <div className="grid gap-4">
          {promocoes.map((p) => {
            const b = p.barbearia_id ? porBarbearia.get(p.barbearia_id) : undefined;
            return (
              <CardPromocao
                key={p.id}
                titulo={p.titulo}
                descricao={p.descricao}
                regras={p.regras}
                desconto={p.desconto_percentual}
                dataFim={p.data_fim}
                cor={b?.cor_primaria}
                barbearia={b?.nome}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
