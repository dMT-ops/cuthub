import { Link, Navigate } from 'react-router-dom';
import { Scissors } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollReveal } from '@/components/ui/scroll-reveal';
import { ThemeToggle } from '@/components/tema/ThemeToggle';
import { useAuth } from '@/lib/auth/AuthContext';

/**
 * A FOLHA DO DIA
 *
 * O cliente desta página é o dono de barbearia que hoje toca o dia num caderno
 * de agenda e num grupo de mensagens — está dito na própria copy. O artefato
 * mais característico desse mundo não é um painel de métricas: é a folha do
 * dia, com a hora na margem esquerda e o nome escrito ao lado.
 *
 * Então a página **é** a folha. A coluna de horas pautada não é ilustração
 * dentro de um cartão flutuante; é o esqueleto do layout, e a mesma pauta
 * separa as seções mais abaixo.
 *
 * O que saiu daqui, e por quê (auditoria da skill `frontend-design`, 22/09):
 *
 *   - os quatro cartões de recurso, identicos em raio, borda, sombra e
 *     `hover:-translate-y-1` -- é o kit de cartão de SaaS, que aparece igual em
 *     qualquer produto. Viraram linhas da mesma folha;
 *   - as sete revelações de scroll: viraram UMA, na carga do hero;
 *   - a bolha de desfoque e o filete em degradê -- decoração por degradê;
 *   - as setas coladas no texto dos botões;
 *   - a pílula de rótulo acima do headline, que repetia o que o headline diz.
 */

/** Marca do produto. Latão aqui é permitido: logotipo não tem mínimo de contraste (WCAG 1.4.11). */
function Logo({ className = 'h-7 w-7' }: { className?: string }) {
  return <Scissors className={`${className} text-primary`} aria-hidden="true" />;
}

/**
 * A folha de um dia qualquer.
 *
 * A linha vazia das 12:00 é de propósito: folha de verdade tem buraco, e é o
 * buraco que o dono reconhece. Continua `aria-hidden` — hora e nome falsos
 * anunciados como dado real confundem mais do que ajudam.
 */
const FOLHA = [
  { hora: '09:00', cliente: 'Renan A.', servico: 'Corte + barba' },
  { hora: '10:30', cliente: 'Diego M.', servico: 'Corte social' },
  { hora: '11:15', cliente: 'Vitor S.', servico: 'Barba' },
  { hora: '12:00', cliente: null, servico: null },
  { hora: '14:00', cliente: 'Caio F.', servico: 'Degradê' },
];

/**
 * Quatro frentes, não quatro etapas.
 *
 * Sem numeração de propósito: `01/02/03` diria que há uma sequência, e não há —
 * agenda, clientes, serviços e caixa acontecem ao mesmo tempo, todo dia.
 */
const FRENTES = [
  {
    titulo: 'Agenda que não deixa furo',
    descricao:
      'Seis visões do mesmo dia. O sistema recusa dois atendimentos no mesmo horário do mesmo profissional.',
  },
  {
    titulo: 'Clientes com histórico',
    descricao:
      'Os dados, as preferências e os atendimentos anteriores à mão na hora de atender.',
  },
  {
    titulo: 'Serviços e equipe',
    descricao:
      'Preço e duração por serviço, jornada de trabalho por profissional e folgas que passam pela sua aprovação.',
  },
  {
    titulo: 'Financeiro no lugar certo',
    descricao:
      'Entradas e saídas por período, o que já foi atendido e ainda não virou receita, e o saldo do caixa.',
  },
];

const GARANTIAS = [
  'Cada barbearia enxerga só os próprios dados',
  'Funciona no celular, no tablet e no computador',
  'Tema claro e escuro',
];

export default function Landing() {
  const { user, loading } = useAuth();

  // Quem já está autenticado não tem o que fazer na porta de entrada.
  // Enquanto a sessão carrega, a landing é renderizada: ela é conteúdo público
  // e prender o visitante anônimo numa tela em branco custaria mais do que o
  // piscar que o usuário logado vê antes do redirecionamento.
  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5 sm:px-6">
          <span className="flex items-center gap-2 font-semibold tracking-tight">
            <Logo className="h-6 w-6" />
            <span className="font-display text-lg">CutHub</span>
          </span>

          <nav className="flex items-center gap-1 sm:gap-2">
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
        {/* ------------------------------------------------------------- */}
        {/* Hero — o texto, e logo abaixo a folha                          */}
        {/* ------------------------------------------------------------- */}
        <section className="mx-auto max-w-5xl px-5 pt-16 sm:px-6 sm:pt-24">
          {/* Medida curta de propósito: título longo demais em uma linha
              cansa antes de informar. */}
          <h1 className="max-w-[13ch] font-display text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-7xl">
            Sua barbearia inteira em um lugar só
          </h1>

          {/* ≤66 caracteres por linha, que é o limite de leitura confortável.
              O `max-w-xl` anterior passava de 75. */}
          <p className="mt-7 max-w-[54ch] text-lg leading-relaxed text-muted-foreground">
            Agenda, clientes, equipe, serviços e caixa. O CutHub tira a
            barbearia do caderno e do grupo de mensagens sem complicar o dia a
            dia de quem atende.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link to="/cadastro">Criar conta da barbearia</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <Link to="/login">Já tenho conta</Link>
            </Button>
          </div>
        </section>

        {/* ------------------------------------------------------------- */}
        {/* A folha do dia                                                 */}
        {/* ------------------------------------------------------------- */}
        {/* Atravessa a largura inteira, sem moldura, sem sombra e sem
            inclinação — não é o print de um app flutuando, é a folha. E
            aparece no CELULAR: antes era `hidden lg:block`, ou seja, o dono
            que abrisse no telefone nunca via o que o produto faz. */}
        <section aria-hidden="true" className="mt-16 border-y border-border sm:mt-24">
          <div className="mx-auto max-w-5xl px-5 sm:px-6">
            <p className="flex items-baseline gap-3 border-b border-border py-4 font-display text-sm font-semibold">
              Hoje
              <span className="text-xs font-normal text-muted-foreground">
                terça-feira
              </span>
            </p>

            <ul>
              {FOLHA.map(({ hora, cliente, servico }, i) => (
                // O único momento de movimento da página: as linhas se
                // escrevendo de cima para baixo, como quem preenche a folha.
                // 80ms entre elas. `ScrollReveal` respeita quem pede menos
                // movimento -- nesse caso não anima e nem cria o observer.
                <ScrollReveal key={hora} atraso={i * 80}>
                  <li className="flex items-baseline gap-4 border-b border-border py-4 sm:gap-6">
                    <span className="w-14 shrink-0 text-right font-display text-sm tabular-nums text-muted-foreground sm:w-16 sm:text-base">
                      {hora}
                    </span>
                    {cliente ? (
                      <>
                        {/* O tique de latão: superfície, não letra. */}
                        <span className="h-4 w-0.5 shrink-0 self-center bg-primary" />
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {cliente}
                        </span>
                        <span className="shrink-0 text-sm text-muted-foreground">
                          {servico}
                        </span>
                      </>
                    ) : (
                      <span className="flex-1 text-sm text-muted-foreground">
                        livre
                      </span>
                    )}
                  </li>
                </ScrollReveal>
              ))}
            </ul>
          </div>
        </section>

        {/* ------------------------------------------------------------- */}
        {/* As quatro frentes — linhas da mesma folha, não cartões          */}
        {/* ------------------------------------------------------------- */}
        <section className="mx-auto max-w-5xl px-5 py-20 sm:px-6 sm:py-28">
          <h2 className="max-w-[20ch] font-display text-3xl font-bold tracking-tight sm:text-4xl">
            O que você passa a controlar
          </h2>

          <dl className="mt-12">
            {FRENTES.map(({ titulo, descricao }) => (
              <div
                key={titulo}
                className="grid gap-x-10 gap-y-2 border-t border-border py-7 sm:grid-cols-12"
              >
                <dt className="font-display text-lg font-semibold sm:col-span-5">
                  {titulo}
                </dt>
                <dd className="max-w-[60ch] leading-relaxed text-muted-foreground sm:col-span-7">
                  {descricao}
                </dd>
              </div>
            ))}
          </dl>

          <ul className="mt-12 flex flex-col gap-2 border-t border-border pt-7 text-sm text-muted-foreground">
            {GARANTIAS.map((item) => (
              <li key={item} className="flex items-baseline gap-3">
                <span
                  aria-hidden="true"
                  className="h-1 w-1 shrink-0 translate-y-[-0.15em] rounded-full bg-primary"
                />
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* ------------------------------------------------------------- */}
        {/* Chamada final                                                  */}
        {/* ------------------------------------------------------------- */}
        {/* A única superfície escura do tema claro, e o lugar onde a marca
            aparece inteira. Alinhada à esquerda como o resto da folha — o
            painel centralizado era o fecho padrão de qualquer landing. */}
        <section className="mx-auto max-w-5xl px-5 pb-20 sm:px-6 sm:pb-28">
          <div className="rounded-lg bg-brand-ink px-6 py-14 text-brand-ink-foreground sm:px-12">
            <h2 className="max-w-[18ch] font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Comece hoje, sem instalar nada
            </h2>
            <p className="mt-4 max-w-[52ch] text-brand-ink-foreground/70">
              Crie a conta da sua barbearia e configure a agenda em poucos
              minutos.
            </p>
            <Button asChild size="lg" className="mt-9">
              <Link to="/cadastro">Criar conta da barbearia</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="flex items-center gap-2">
            <Logo className="h-4 w-4" />
            <span className="font-medium text-foreground">CutHub</span>
          </span>
          <span>© {new Date().getFullYear()} CutHub</span>
        </div>
      </footer>
    </div>
  );
}
