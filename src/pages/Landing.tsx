import { Link, Navigate } from 'react-router-dom';
import { Scissors } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PreviewDashboard } from '@/components/landing/PreviewDashboard';
import { useAuth } from '@/lib/auth/AuthContext';

/**
 * LANDING DA F13.4 — a referência preta e dourada.
 *
 * A página inteira vive sobre `brand-ink`, a superfície que **não segue o
 * tema** (ver `index.css`). É assim, e não trocando `--background`, que a
 * referência de fundo #0A0A0A entra sem derrubar o tema claro do app nem
 * desalinhar o espelho `FUNDO` do `paleta.ts`.
 *
 * Consequência assumida: a landing não tem mais o alternador de tema. A
 * referência não o prevê no nav, e numa página que é preta nos dois temas ele
 * não teria o que alternar. Login, cadastro e painel continuam com os dois
 * temas normalmente.
 *
 * Contrastes medidos sobre #0A0A0A antes de escrever isto: creme 17.57,
 * dourado 9.87, creme a 70% 8.74, creme a 50% 4.89, e o rótulo escuro sobre o
 * botão dourado 9.87. Texto branco sobre o dourado daria 2.01 — por isso o
 * rótulo do botão é escuro, e a referência está certa nesse ponto.
 */

/** Marca: o componente de logo que já existia, com o wordmark ao lado. */
function Logo({ className = 'h-5 w-5' }: { className?: string }) {
  return <Scissors className={`${className} text-primary`} aria-hidden="true" />;
}

function Marca({ tamanho = 'h-5 w-5' }: { tamanho?: string }) {
  return (
    <span className="flex items-center gap-2">
      <Logo className={tamanho} />
      <span className="font-display text-base font-semibold tracking-tight">
        CutHub
      </span>
    </span>
  );
}

const NUMEROS = [
  { valor: '30%', texto: 'MENOS TEMPO ORGANIZANDO HORÁRIOS' },
  { valor: '+45%', texto: 'MAIS CLIENTES RECORRENTES' },
  { valor: '22%', texto: 'DE CRESCIMENTO MÉDIO NO SEMESTRE' },
  { valor: '100%', texto: 'DE CLAREZA NAS COMISSÕES' },
];

/**
 * Aqui a numeração 01/02/03 é legítima, e vale registrar por quê: ela desenha
 * o caminho do atendimento — a mensagem chega, o cliente é lembrado, o caixa
 * fecha. É sequência de verdade, diferente das quatro frentes da versão
 * anterior, que aconteciam ao mesmo tempo e por isso não podiam ser numeradas.
 */
const ETAPAS = [
  {
    n: '01',
    titulo: 'Agenda sem ruído',
    texto:
      'Horários, folgas e encaixes num lugar só. O sistema recusa dois atendimentos na mesma cadeira.',
  },
  {
    n: '02',
    titulo: 'Cliente lembrado',
    texto:
      'Aviso automático antes do horário. Menos falta, menos cadeira parada no meio da tarde.',
  },
  {
    n: '03',
    titulo: 'Caixa sob controle',
    texto:
      'Entradas, saídas e comissões fechando sozinhas no fim do dia, sem planilha paralela.',
  },
];

export default function Landing() {
  const { user, loading } = useAuth();

  // Quem já está autenticado não tem o que fazer na porta de entrada.
  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-brand-ink text-brand-ink-foreground">
      {/* ----------------------------------------------------------------- */}
      {/* Nav                                                                */}
      {/* ----------------------------------------------------------------- */}
      <header className="border-b border-brand-ink-foreground/10">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8 2xl:max-w-[1600px] 2xl:px-16">
          <Marca />

          {/* Some abaixo de lg: entre a marca e o botão de conta, este
              distintivo é o que menos informa. */}
          <span className="hidden items-center gap-2 text-[11px] font-medium tracking-[0.18em] text-brand-ink-foreground/60 lg:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
            SISTEMA PARA BARBEARIAS
          </span>

          <nav className="flex items-center gap-2 sm:gap-4">
            <Link
              to="/login"
              className="text-sm text-brand-ink-foreground/80 underline-offset-4 hover:underline"
            >
              Entrar
            </Link>
            <Button asChild size="sm" className="tracking-[0.12em]">
              <Link to="/cadastro">CRIAR CONTA</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        {/* --------------------------------------------------------------- */}
        {/* Hero                                                             */}
        {/* --------------------------------------------------------------- */}
        {/* Em 2xl o hero passa a ocupar a primeira tela inteira: medido em
            1920x1080 ele terminava em 649px e deixava 40% da dobra para a
            secao seguinte, o que fazia a pagina comecar apertada no alto.
            `min-h` e nao `h`: se o conteudo crescer, ele empurra em vez de
            vazar. 65px e a altura real do cabecalho. */}
        <section className="mx-auto flex max-w-6xl px-5 py-16 sm:px-8 sm:py-24 2xl:min-h-[calc(100vh-65px)] 2xl:max-w-[1600px] 2xl:items-center 2xl:px-16 2xl:py-20">
          <div className="grid w-full gap-12 lg:grid-cols-12 lg:items-center lg:gap-10 2xl:gap-16">
            <div className="lg:col-span-6">
              <p className="text-[11px] font-medium tracking-[0.22em] text-brand-ink-foreground/50">
                — GESTÃO DE ALTA PRECISÃO
              </p>

              <h1 className="mt-6 font-display text-4xl font-extrabold uppercase leading-[0.95] tracking-tight sm:text-5xl lg:text-6xl 2xl:text-7xl">
                Domine cada{' '}
                {/* Aqui o dourado é letra, e pode ser: sobre o preto ele tem
                    9.87, muito acima dos 3.0 que texto grande exige. A regra
                    do `index.css` proíbe isso sobre o CREME, não sobre a
                    superfície da marca. */}
                <span className="text-primary">centímetro</span> da operação.
              </h1>

              <p className="mt-7 max-w-[52ch] text-base leading-relaxed text-brand-ink-foreground/70 sm:text-lg 2xl:text-xl">
                Agenda, clientes, equipe e caixa trabalhando juntos. Menos
                mensagens perdidas, mais cadeiras ocupadas.
              </p>

              <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                <Button asChild size="lg" className="w-full tracking-[0.12em] sm:w-auto">
                  <Link to="/cadastro">COMEÇAR AGORA</Link>
                </Button>
                <p className="text-[11px] font-medium tracking-[0.16em] text-brand-ink-foreground/50">
                  +800 BARBEARIAS ORGANIZADAS
                </p>
              </div>
            </div>

            <div className="lg:col-span-6">
              <PreviewDashboard />
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------------- */}
        {/* 01 — Resultado na rotina                                          */}
        {/* --------------------------------------------------------------- */}
        <section className="border-t border-brand-ink-foreground/10">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20 2xl:max-w-[1600px] 2xl:px-16 2xl:py-24">
            <p className="text-[11px] font-medium tracking-[0.22em] text-brand-ink-foreground/50">
              01 / RESULTADO NA ROTINA
            </p>

            {/* As divisórias entram por `divide-*`, e só a partir de sm: em
                375px as colunas viram empilhamento e uma linha vertical entre
                blocos empilhados não separaria nada. */}
            <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 sm:divide-x sm:divide-brand-ink-foreground/10 lg:grid-cols-4">
              {NUMEROS.map(({ valor, texto }) => (
                <div key={texto} className="sm:px-6 sm:first:pl-0 lg:px-8">
                  <dt className="font-display text-4xl font-extrabold tracking-tight text-primary sm:text-5xl 2xl:text-6xl">
                    {valor}
                  </dt>
                  <dd className="mt-3 text-[11px] font-medium leading-relaxed tracking-[0.12em] text-brand-ink-foreground/60">
                    {texto}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* --------------------------------------------------------------- */}
        {/* 02 — Tudo conectado                                               */}
        {/* --------------------------------------------------------------- */}
        <section className="border-t border-brand-ink-foreground/10">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24 2xl:max-w-[1600px] 2xl:px-16 2xl:py-28">
            <p className="text-[11px] font-medium tracking-[0.22em] text-brand-ink-foreground/50">
              02 / TUDO CONECTADO
            </p>

            <div className="mt-10 grid gap-12 lg:grid-cols-12 lg:gap-16">
              <div className="lg:col-span-5">
                <h2 className="font-display text-3xl font-extrabold uppercase leading-[1] tracking-tight sm:text-4xl 2xl:text-5xl">
                  Da primeira mensagem ao fechamento do caixa.
                </h2>
                <p className="mt-6 max-w-[46ch] leading-relaxed text-brand-ink-foreground/70">
                  O CutHub organiza a rotina sem mudar o jeito que sua equipe
                  trabalha.
                </p>
              </div>

              <ol className="lg:col-span-7">
                {ETAPAS.map(({ n, titulo, texto }) => (
                  <li
                    key={n}
                    className="grid grid-cols-[auto_1fr] gap-x-5 border-t border-brand-ink-foreground/10 py-7 first:border-t-0 first:pt-0 sm:gap-x-8"
                  >
                    <span className="font-display text-sm font-bold tabular-nums text-primary">
                      {n}
                    </span>
                    <div>
                      <h3 className="font-display text-lg font-semibold">
                        {titulo}
                      </h3>
                      <p className="mt-2 max-w-[56ch] text-sm leading-relaxed text-brand-ink-foreground/60">
                        {texto}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------------- */}
        {/* Chamada final                                                     */}
        {/* --------------------------------------------------------------- */}
        <section className="border-t border-brand-ink-foreground/10 bg-brand-ink-elevated">
          <div className="mx-auto max-w-6xl px-5 py-20 text-center sm:px-8 sm:py-28 2xl:max-w-[1600px] 2xl:px-16 2xl:py-32">
            <p className="text-[11px] font-medium tracking-[0.22em] text-brand-ink-foreground/50">
              — PRÓXIMO ATENDIMENTO
            </p>
            <h2 className="mx-auto mt-6 max-w-[16ch] font-display text-3xl font-extrabold uppercase leading-[1] tracking-tight sm:text-5xl 2xl:text-6xl">
              Coloque sua barbearia no controle.
            </h2>
            <p className="mt-6 text-brand-ink-foreground/70">
              Comece agora. Sem cartão de crédito.
            </p>
            <Button asChild size="lg" className="mt-10 tracking-[0.12em]">
              <Link to="/cadastro">CRIAR CONTA DA BARBEARIA</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-brand-ink-foreground/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-5 py-10 text-sm sm:flex-row sm:justify-between sm:px-8 2xl:max-w-[1600px] 2xl:px-16">
          <Marca tamanho="h-4 w-4" />
          <p className="text-brand-ink-foreground/50">
            Operação afiada. Gestão no lugar.
          </p>
          <nav className="flex items-center gap-6 text-brand-ink-foreground/70">
            <Link to="/login" className="underline-offset-4 hover:underline">
              Entrar
            </Link>
            <a
              href="mailto:contato@cuthub.com.br"
              className="underline-offset-4 hover:underline"
            >
              Contato
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
