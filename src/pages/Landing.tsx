import { Link, Navigate } from 'react-router-dom';
import { CalendarDays, LineChart, Scissors, Users, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollReveal } from '@/components/ui/scroll-reveal';
import { ThemeToggle } from '@/components/tema/ThemeToggle';
import { useAuth } from '@/lib/auth/AuthContext';

const RECURSOS = [
  {
    icone: CalendarDays,
    titulo: 'Agenda que não deixa furo',
    descricao:
      'Seis visões da agenda — dia, semana, mês, ano, kanban e lista. O sistema recusa dois atendimentos no mesmo horário do mesmo profissional.',
  },
  {
    icone: Users,
    titulo: 'Clientes com histórico',
    descricao:
      'Cada cliente com seus dados, preferências e o histórico completo de atendimentos, sempre à mão na hora de atender.',
  },
  {
    icone: Scissors,
    titulo: 'Serviços e equipe',
    descricao:
      'Catálogo de serviços com preço e duração, jornada de trabalho por profissional e bloqueios de agenda.',
  },
  {
    icone: LineChart,
    titulo: 'Financeiro no lugar certo',
    descricao:
      'Entradas e saídas por período, atendimentos concluídos que ainda não viraram receita e o saldo do caixa.',
  },
];

/**
 * Agenda de mentira, só para dar forma ao hero. `aria-hidden` porque leitor de
 * tela anunciando horário e nome falsos como se fossem dados reais confunde
 * mais do que ajuda — é ilustração, não conteúdo.
 */
const AGENDA_ILUSTRATIVA = [
  { hora: '09:00', cliente: 'Renan A.', servico: 'Corte + barba' },
  { hora: '10:30', cliente: 'Diego M.', servico: 'Corte social' },
  { hora: '11:15', cliente: 'Vitor S.', servico: 'Barba' },
];

const DIFERENCIAIS = [
  'Cada barbearia enxerga só os próprios dados',
  'Funciona no celular, no tablet e no computador',
  'Tema claro e escuro',
];

/** Marca do produto — tesoura desenhada, sem depender de imagem externa. */
function Logo({ className = 'h-7 w-7' }: { className?: string }) {
  return <Scissors className={`${className} text-primary`} aria-hidden="true" />;
}

export default function Landing() {
  const { user, loading } = useAuth();

  // Quem já está autenticado não tem o que fazer na porta de entrada.
  // Enquanto a sessão carrega, a landing é renderizada: ela é conteúdo
  // público e prender o visitante anônimo numa tela em branco custaria mais
  // do que o piscar que o usuário logado vê antes do redirecionamento.
  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <span className="flex items-center gap-2 font-semibold tracking-tight">
            <Logo />
            <span className="font-display text-lg">CutHub</span>
          </span>

          <nav className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Entrar</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/cadastro">Criar conta</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        {/* ---------------------------------------------------------------- */}
        {/* Hero                                                              */}
        {/* ---------------------------------------------------------------- */}
        <section className="relative overflow-hidden">
          {/* Trama diagonal e um halo unico atras do texto. Substituiu duas
              bolhas de desfoque coloridas -- aquilo e o acabamento padrao de
              template, e nao dizia nada sobre barbearia. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <div
              className="absolute inset-0 opacity-[0.035]"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(45deg, currentColor 0 1px, transparent 1px 16px)',
              }}
            />
            <div className="absolute -top-40 left-[-10rem] h-[34rem] w-[34rem] rounded-full bg-primary/15 blur-3xl" />
          </div>

          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
            {/* Assimetrico de proposito: 7 colunas de texto contra 5 de
                ilustracao, alinhado a esquerda. O modelo "tudo centralizado"
                e o que fazia a pagina parecer qualquer SaaS. */}
            <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
              <div className="lg:col-span-7">
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Gestão completa para barbearias
                </span>

                {/* O headline nao pinta mais a segunda linha de dourado. Dois
                    motivos, e eles coincidem: no tema claro o dourado como
                    letra da 1.70 contra o creme (minimo 3.0 para texto grande),
                    e colorir uma frase solta do titulo e um dos tiques que a
                    `frontend-design` lista como marca de pagina generica. A
                    quebra de linha continua fazendo a enfase, sem cor. O
                    dourado segue brilhando onde ele se le: no painel escuro do
                    login e nos botoes preenchidos. */}
                <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
                  Sua barbearia inteira
                  <span className="mt-2 block">em um lugar só</span>
                </h1>

                <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
                  Agenda, clientes, equipe, serviços e caixa. O CutHub tira a
                  barbearia do caderno e do grupo de mensagens sem complicar o
                  dia a dia de quem atende.
                </p>

                <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                  <Button asChild size="lg" className="w-full sm:w-auto">
                    <Link to="/cadastro">
                      Criar conta da barbearia
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                    <Link to="/login">Já tenho conta</Link>
                  </Button>
                </div>

                <ul className="mt-10 flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-6">
                  {DIFERENCIAIS.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check className="h-4 w-4 shrink-0 text-primary-readable" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Some abaixo de lg: no celular a coluna vira empilhamento e a
                  ilustracao so empurraria o botao para fora da primeira tela. */}
              <div aria-hidden="true" className="hidden lg:col-span-5 lg:block">
                <div className="rotate-2 rounded-2xl bg-brand-ink p-6 text-brand-ink-foreground shadow-2xl ring-1 ring-white/10">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm font-semibold">Hoje</span>
                    <span className="text-xs text-brand-ink-foreground/50">3 atendimentos</span>
                  </div>
                  <div className="mt-5 space-y-3">
                    {AGENDA_ILUSTRATIVA.map(({ hora, cliente, servico }) => (
                      <div
                        key={hora}
                        className="flex items-center gap-3 rounded-lg bg-white/[0.04] p-3"
                      >
                        <span className="h-9 w-1 shrink-0 rounded-full bg-primary" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{cliente}</p>
                          <p className="truncate text-xs text-brand-ink-foreground/50">{servico}</p>
                        </div>
                        <span className="ml-auto font-display text-sm tabular-nums text-primary">
                          {hora}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Recursos                                                          */}
        {/* ---------------------------------------------------------------- */}
        <section className="border-t border-border/60 bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <ScrollReveal className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                O que você controla
              </h2>
              <p className="mt-4 text-muted-foreground">
                Quatro frentes que decidem se o mês fecha no azul.
              </p>
            </ScrollReveal>

            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {RECURSOS.map(({ icone: Icone, titulo, descricao }, i) => (
                // Escalonado em 90ms: os quatro entrando juntos viram um
                // salto de bloco; em sequencia o olho acompanha a leitura.
                <ScrollReveal key={titulo} atraso={i * 90}>
                  <article className="group h-full rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary-readable transition-colors group-hover:bg-primary/20">
                      <Icone className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className="mt-5 font-display font-semibold">{titulo}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {descricao}
                    </p>
                  </article>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Chamada final                                                     */}
        {/* ---------------------------------------------------------------- */}
        <section className="border-t border-border/60">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <ScrollReveal className="relative overflow-hidden rounded-2xl bg-brand-ink px-6 py-14 text-center text-brand-ink-foreground">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent"
              />
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Comece hoje, sem instalar nada
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-brand-ink-foreground/70">
                Crie a conta da sua barbearia e configure a agenda em poucos
                minutos.
              </p>
              <Button asChild size="lg" className="mt-8">
                <Link to="/cadastro">
                  Criar conta
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </ScrollReveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <span className="flex items-center gap-2">
            <Logo className="h-4 w-4" />
            <span className="font-medium text-foreground">CutHub</span>
          </span>
          <span>© {new Date().getFullYear()} CutHub. Todos os direitos reservados.</span>
        </div>
      </footer>
    </div>
  );
}
