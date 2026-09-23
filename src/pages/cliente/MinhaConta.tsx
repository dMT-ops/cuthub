import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, Heart, Plus, Store } from 'lucide-react';

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
      {/* Faixa de abertura na superfície de marca do CutHub.
          `brand-ink` e NAO a cor de uma barbearia: o cliente e de varias ao
          mesmo tempo, e herdar a de uma delas seria arbitrario -- e a regra
          que o `ClienteLayout` ja documenta. Aqui a marca que fala e a do
          proprio produto, que e neutra entre as barbearias.
          A faixa nao segue o tema, como toda superficie `brand-ink`. */}
      <section className="overflow-hidden rounded-2xl bg-brand-ink px-6 py-8 text-brand-ink-foreground sm:px-10 sm:py-10 2xl:px-14 2xl:py-12">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl 2xl:text-5xl">
              {primeiroNome ? `Olá, ${primeiroNome}` : 'Olá'}
            </h1>
            <p className="mt-3 max-w-[52ch] text-brand-ink-foreground/70">
              {proximo
                ? 'Você já tem horário marcado. Quer garantir o próximo?'
                : 'Escolha a barbearia, o profissional e o horário. Leva menos de um minuto.'}
            </p>
          </div>

          {/* Só no celular. No desktop esta ação mora na linha das abas, no
              `ClienteLayout`; repeti-la aqui deixaria dois botões idênticos a
              poucos pixels um do outro. Abaixo de `md` aquela fileira não
              existe, e sem este botão o telefone — que é onde a área do
              cliente mais é usada — ficaria sem a ação principal. */}
          <Button asChild size="lg" className="w-full shrink-0 gap-2 md:hidden">
            <Link to="/barbearias">
              <Plus className="h-5 w-5" aria-hidden="true" />
              Novo agendamento
            </Link>
          </Button>
        </div>
      </section>

      {/* Em `lg` vira duas colunas; abaixo disso continua empilhado, como foi
          validado no mobile. */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] 2xl:gap-10 2xl:grid-cols-[minmax(0,1fr)_420px]">
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
          {promocoes.slice(0, 6).map((p) => {
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
