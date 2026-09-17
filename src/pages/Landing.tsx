import { Link, Navigate } from 'react-router-dom';
import { CalendarDays, LineChart, Scissors, Users, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
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
            <span className="text-lg">CutHub</span>
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
          {/* Brilho decorativo: só cor, sem imagem, e invisível para leitores de tela */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10"
          >
            <div className="absolute left-1/2 top-[-10rem] h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute bottom-[-12rem] right-[-6rem] h-[24rem] w-[24rem] rounded-full bg-primary/10 blur-3xl" />
          </div>

          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex animate-in fade-in slide-in-from-bottom-2 items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground duration-700">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Gestão completa para barbearias
              </span>

              <h1 className="mt-6 animate-in fade-in slide-in-from-bottom-3 text-4xl font-bold tracking-tight duration-700 sm:text-6xl">
                Sua barbearia inteira{' '}
                <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  em um lugar só
                </span>
              </h1>

              <p className="mx-auto mt-6 max-w-2xl animate-in fade-in slide-in-from-bottom-4 text-lg text-muted-foreground duration-1000">
                Agenda, clientes, equipe, serviços e caixa. O CutHub tira a
                barbearia do caderno e do grupo de mensagens sem complicar o
                dia a dia de quem atende.
              </p>

              <div className="mt-10 flex animate-in fade-in slide-in-from-bottom-4 flex-col items-center justify-center gap-3 duration-1000 sm:flex-row">
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

              <ul className="mt-10 flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground sm:flex-row sm:gap-6">
                {DIFERENCIAIS.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Recursos                                                          */}
        {/* ---------------------------------------------------------------- */}
        <section className="border-t border-border/60 bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                O que você controla
              </h2>
              <p className="mt-4 text-muted-foreground">
                Quatro frentes que decidem se o mês fecha no azul.
              </p>
            </div>

            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {RECURSOS.map(({ icone: Icone, titulo, descricao }) => (
                <article
                  key={titulo}
                  className="group rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg"
                >
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                    <Icone className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 font-semibold">{titulo}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {descricao}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Chamada final                                                     */}
        {/* ---------------------------------------------------------------- */}
        <section className="border-t border-border/60">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card px-6 py-14 text-center">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent"
              />
              <h2 className="text-3xl font-bold tracking-tight">
                Comece hoje, sem instalar nada
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                Crie a conta da sua barbearia e configure a agenda em poucos
                minutos.
              </p>
              <Button asChild size="lg" className="mt-8">
                <Link to="/cadastro">
                  Criar conta
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
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
