import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Scissors, Search, SlidersHorizontal } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ThemeToggle } from '@/components/tema/ThemeToggle';
import { useCatalogo } from '@/hooks/useCatalogo';
import { CapaBarbearia, LogoBarbearia } from '@/components/publico/CapaBarbearia';
import { BotaoFavorito } from '@/components/publico/BotaoFavorito';
import { useAuth } from '@/lib/auth/AuthContext';
import { rotaInicialDoPapel } from '@/lib/auth/areas';

const TODAS = 'todas';

export default function Barbearias() {
  const { user, tipo } = useAuth();
  const [busca, setBusca] = useState('');
  const [cidadeSelecionada, setCidadeSelecionada] = useState(TODAS);

  const filtro = useMemo(
    () => ({
      busca: busca.trim() || undefined,
      cidade: cidadeSelecionada === TODAS ? undefined : cidadeSelecionada,
    }),
    [busca, cidadeSelecionada]
  );

  const { barbearias, cidades, isLoading, isError, error } = useCatalogo(filtro);
  const rotaDoUsuario = rotaInicialDoPapel(tipo);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 2xl:max-w-screen-2xl">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <Scissors className="h-6 w-6 text-primary" aria-hidden="true" />
            <span className="text-lg">CutHub</span>
          </Link>
          <nav className="flex items-center gap-2">
            <ThemeToggle />
            {user && rotaDoUsuario ? (
              <Button asChild size="sm">
                <Link to={rotaDoUsuario}>Minha área</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/login">Entrar</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/cadastro">Criar conta</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 2xl:max-w-screen-2xl">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Barbearias no CutHub</h1>
          <p className="mt-3 text-muted-foreground">
            Encontre pelo nome ou pela cidade e veja serviços, equipe e produtos
            antes de agendar.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              placeholder="Buscar pelo nome da barbearia"
              className="pl-9"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              aria-label="Buscar barbearia pelo nome"
            />
          </div>

          <Select value={cidadeSelecionada} onValueChange={setCidadeSelecionada}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SlidersHorizontal className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" />
              <SelectValue placeholder="Cidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODAS}>Todas as cidades</SelectItem>
              {cidades.map(({ cidade, estado }) => (
                <SelectItem key={`${cidade}-${estado ?? ''}`} value={cidade}>
                  {estado ? `${cidade} — ${estado}` : cidade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isError ? (
          <div className="mt-10 rounded-xl border border-dashed bg-card p-12 text-center">
            <h2 className="mb-1 text-lg font-semibold">Não foi possível carregar o catálogo</h2>
            <p className="text-sm text-muted-foreground">
              {(error as Error)?.message || 'Erro desconhecido.'}
            </p>
          </div>
        ) : isLoading ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-56 w-full rounded-xl" />
            ))}
          </div>
        ) : barbearias.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed bg-card p-12 text-center">
            <h2 className="mb-1 text-lg font-semibold">Nenhuma barbearia encontrada</h2>
            <p className="mx-auto max-w-sm text-sm text-muted-foreground">
              {busca || cidadeSelecionada !== TODAS
                ? 'Tente outro nome ou remova o filtro de cidade.'
                : 'Ainda não há barbearias no catálogo.'}
            </p>
          </div>
        ) : (
          // Mais cards por linha em vez de cards gigantes: o espaco extra
          // mostra mais barbearia, que e o conteudo util desta tela.
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {barbearias.map((b) => (
              <article
                key={b.id}
                className="group relative overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg"
              >
                <Link to={`/b/${b.slug}`} className="block">
                  <CapaBarbearia
                    bannerUrl={b.banner_url}
                    corPrimaria={b.cor_primaria}
                    className="h-28"
                  />

                  <div className="p-5">
                    <div className="-mt-10 mb-3 flex items-end justify-between">
                      <LogoBarbearia
                        nome={b.nome ?? ''}
                        logoUrl={b.logo_url}
                        corPrimaria={b.cor_primaria}
                      />
                    </div>

                    <h2 className="truncate font-semibold">{b.nome}</h2>

                    {b.cidade && (
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        {b.estado ? `${b.cidade} — ${b.estado}` : b.cidade}
                      </p>
                    )}

                    <p className="mt-3 line-clamp-2 min-h-[2.5rem] text-sm text-muted-foreground">
                      {b.descricao || 'Esta barbearia ainda não escreveu uma descrição.'}
                    </p>
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
        )}
      </main>
    </div>
  );
}
