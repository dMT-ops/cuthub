import { useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, MapPin, PackageOpen, Scissors } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePerfilPublico } from '@/hooks/useCatalogo';
import { CapaBarbearia, LogoBarbearia } from '@/components/publico/CapaBarbearia';
import { TRANSICAO } from '@/lib/ui/movimento';
import { GRADE_DO_CLIENTE } from '@/lib/ui/grade';
import { BotaoFavorito } from '@/components/publico/BotaoFavorito';
import { CardPromocao } from '@/components/publico/CardPromocao';
import { usePromocoesVigentes } from '@/hooks/usePromocoes';
import { CLASSE_BOTAO_DA_MARCA, estiloDeBotaoDaMarca, marcaVisivel } from '@/lib/marca';
import { cn } from '@/lib/utils';

const MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export default function PerfilBarbearia() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { perfil, naoEncontrada, isLoading, isError, error } = usePerfilPublico(slug);
  // Id extraído antes do useMemo para a dependência ser exatamente o que a
  // memoização usa. A lista precisa de identidade estável: array literal novo a
  // cada render viraria queryKey nova e refetch em loop.
  const barbeariaId = perfil?.barbearia.id ?? null;
  const idsParaPromocao = useMemo(() => (barbeariaId ? [barbeariaId] : []), [barbeariaId]);
  const { promocoes } = usePromocoesVigentes(idsParaPromocao);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Skeleton className="h-48 w-full" />
        <div className={`${GRADE_DO_CLIENTE} space-y-4 py-8`}>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full max-w-md" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (isError || naoEncontrada || !perfil) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4 rounded-lg border bg-card p-6 text-center">
          <h1 className="text-xl font-semibold">Barbearia não encontrada</h1>
          <p className="text-sm text-muted-foreground">
            {isError
              ? (error as Error)?.message
              : 'O endereço não existe ou esta barbearia não está no catálogo público.'}
          </p>
          <Button asChild>
            <Link to="/barbearias" viewTransition>Ver o catálogo</Link>
          </Button>
        </div>
      </div>
    );
  }

  const { barbearia, servicos, profissionais, produtos } = perfil;
  const cor = barbearia.cor_primaria ?? undefined;
  // A cor da barbearia só vira fundo de CTA quando dá para ler o rótulo em
  // cima dela. `#008000` (a cor real de uma barbearia do banco) dava 3.85 de
  // contraste e o botão parecia desabilitado. `undefined` devolve o botão para
  // a variante primária do design system, que é legível por construção.
  const estiloCta = estiloDeBotaoDaMarca(cor);
  const corDetalhe = marcaVisivel(cor) ? cor : undefined;

  return (
    <div className="min-h-screen bg-background">
      <div className="relative">
        {/* O MESMO nome da capa do cartão no catálogo: é por ele que o banner
            atravessa a navegação em vez de ser trocado. Fixo e não derivado do
            slug porque aqui só existe uma barbearia na tela. */}
        <CapaBarbearia
          bannerUrl={barbearia.banner_url}
          corPrimaria={corDetalhe}
          className="h-40 sm:h-56"
          nomeDeTransicao={TRANSICAO.capa}
        />
        <Button
          variant="secondary"
          size="sm"
          className="absolute left-4 top-4 gap-2"
          // `viewTransition` na volta também: o banner encolhe de volta para o
          // cartão em vez de a tela trocar seca.
          onClick={() => navigate('/barbearias', { viewTransition: true })}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Catálogo
        </Button>
      </div>

      {/* A MESMA grade da area do cliente, inclusive o degrau `2xl`. Ate 05/10
          esta pagina parava em `xl:max-w-7xl`, e em 1920 o miolo caia de 1600
          para 1280 um clique depois do catalogo -- a "quarta grade" que o log
          registrava. Agora vem da constante, que e o que impede de divergir de
          novo. */}
      <div className={GRADE_DO_CLIENTE}>
        {/* `relative z-10` nao e enfeite: o banner esta num wrapper
            `position: relative` e, na ordem de pintura do CSS, elemento
            posicionado cobre conteudo estatico independentemente da ordem no
            DOM. Sem isto os 40px de cima do avatar ficam ATRAS do banner --
            confirmado por elementFromPoint na faixa de sobreposicao. */}
        <header className="relative z-10 -mt-10 flex flex-wrap items-end gap-4 pb-6">
          <LogoBarbearia
            nome={barbearia.nome ?? ''}
            logoUrl={barbearia.logo_url}
            corPrimaria={corDetalhe}
            className="h-20 w-20"
            nomeDeTransicao={TRANSICAO.logo}
          />

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">
              {barbearia.nome}
            </h1>
            {barbearia.cidade && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {barbearia.estado ? `${barbearia.cidade} — ${barbearia.estado}` : barbearia.cidade}
              </p>
            )}
          </div>

          {/* `w-full` abaixo de sm: com as acoes na mesma linha, o bloco do
              nome (flex-1 min-w-0) encolhia ate o titulo virar "Barb..." em
              390px. Empurrando as acoes para a linha de baixo o nome recupera
              a largura, e o CTA ocupa a linha inteira -- que e o padrao de
              acao primaria em mobile. */}
          <div className="flex w-full items-center gap-2 sm:w-auto">
            {barbearia.id && barbearia.nome && (
              <BotaoFavorito
                alvo={{ tipo: 'barbearia', barbeariaId: barbearia.id }}
                rotulo={barbearia.nome}
              />
            )}
            {/* A identidade da barbearia manda na cor do CTA quando ela é
                legível; quando não é, a variante primária assume. */}
            <Button
              size="lg"
              style={estiloCta}
              // A borda só entra quando o botao esta pintado com a marca: a
              // variante primaria do design system ja tem contraste proprio.
              className={cn('flex-1 sm:flex-none', estiloCta && CLASSE_BOTAO_DA_MARCA)}
              onClick={() => navigate(`/b/${barbearia.slug}/agendar`)}
            >
              Agendar
            </Button>
          </div>
        </header>

        {barbearia.descricao && (
          <p className="max-w-2xl pb-6 text-muted-foreground">{barbearia.descricao}</p>
        )}

        {/* Em tela larga o conteudo vira duas colunas em vez de uma faixa
            central estreita: servicos e equipe ocupam a principal, e as
            promocoes -- que antes empurravam tudo para baixo -- passam a ocupar
            a lateral, que estava vazia. Abaixo de `lg` continua empilhado,
            exatamente como foi validado no mobile. */}
        <div className="grid gap-8 pb-16 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* Coluna lateral: em `lg` ela vai para a direita; abaixo disso o
              `order` some e as promoções voltam a aparecer antes das abas,
              como no mobile já validado. */}
          {promocoes.length > 0 && (
            <aside className="min-w-0 space-y-3 lg:order-1">
              <h2 className="text-sm font-medium text-muted-foreground">
                {promocoes.length === 1 ? 'Promoção no ar' : 'Promoções no ar'}
              </h2>
              {promocoes.map((p) => (
                <CardPromocao
                  key={p.id}
                  titulo={p.titulo}
                  descricao={p.descricao}
                  regras={p.regras}
                  desconto={p.desconto_percentual}
                  dataFim={p.data_fim}
                  cor={corDetalhe}
                />
              ))}
            </aside>
          )}

          <div className="min-w-0">
        <Tabs defaultValue="servicos">
          <TabsList>
            <TabsTrigger value="servicos">Serviços</TabsTrigger>
            <TabsTrigger value="equipe">Equipe</TabsTrigger>
            <TabsTrigger value="produtos">Produtos</TabsTrigger>
          </TabsList>

          <TabsContent value="servicos" className="mt-6">
            {servicos.length === 0 ? (
              <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                Esta barbearia ainda não publicou serviços.
              </p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {servicos.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{s.nome}</p>
                      {s.descricao && (
                        <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                          {s.descricao}
                        </p>
                      )}
                      {s.duracao_minutos != null && (
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" aria-hidden="true" />
                          {s.duracao_minutos} min
                        </p>
                      )}
                    </div>
                    <span className="font-medium tabular-nums">
                      {s.preco != null ? MOEDA.format(Number(s.preco)) : '—'}
                    </span>
                    {barbearia.id && s.id && s.nome && (
                      <BotaoFavorito
                        alvo={{
                          tipo: 'servico_profissional',
                          barbeariaId: barbearia.id,
                          servicoId: s.id,
                        }}
                        rotulo={s.nome}
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="equipe" className="mt-6">
            {profissionais.length === 0 ? (
              <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                Esta barbearia ainda não publicou a equipe.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {profissionais.map((p) => (
                  <article key={p.id} className="flex items-start gap-3 rounded-lg border p-4">
                    {p.avatar_url ? (
                      <img
                        src={p.avatar_url}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Scissors className="h-5 w-5" aria-hidden="true" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium">{p.nome}</p>
                      {p.especialidade && (
                        <p className="text-sm text-muted-foreground">{p.especialidade}</p>
                      )}
                      {p.bio && (
                        <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{p.bio}</p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="produtos" className="mt-6">
            {produtos.length === 0 ? (
              <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                Esta barbearia ainda não publicou produtos.
              </p>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {produtos.map((p) => (
                    <article key={p.id} className="overflow-hidden rounded-lg border">
                      <div className="aspect-square bg-muted/30">
                        {p.imagem_url ? (
                          <img src={p.imagem_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <PackageOpen className="h-8 w-8" aria-hidden="true" />
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <p className="truncate font-medium">{p.nome}</p>
                        {p.descricao && (
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                            {p.descricao}
                          </p>
                        )}
                        <p className="mt-2 font-medium tabular-nums">
                          {p.preco != null ? MOEDA.format(Number(p.preco)) : '—'}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
                {/* Decisão do Chefe: "somente vitrine para testarmos se a
                    visualização está correta" — sem carrinho, sem pedido. */}
                <p className="mt-4 text-center text-xs text-muted-foreground">
                  Os produtos são vendidos na barbearia. Aqui é só a vitrine.
                </p>
              </>
            )}
          </TabsContent>
        </Tabs>
        </div>
        </div>
      </div>
    </div>
  );
}
