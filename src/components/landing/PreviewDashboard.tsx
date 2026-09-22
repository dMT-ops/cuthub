/**
 * Retrato ESTÁTICO do painel, para o hero da landing.
 *
 * Nada aqui fala com o Supabase, com o roteador ou com o estado do app — é
 * propositalmente uma maquete, não o dashboard de verdade reaproveitado. Dois
 * motivos: o painel real exige sessão e dados, e a landing é pública; e um
 * componente real numa vitrine acaba puxando metade da aplicação para dentro
 * do bundle da porta de entrada.
 *
 * Todos os números são falsos e fixos. O bloco inteiro é `aria-hidden`: um
 * leitor de tela anunciando "R$ 2.480" como se fosse faturamento real
 * confunde mais do que ajuda — é ilustração, não conteúdo.
 */

const MENU = [
  'Dashboard',
  'Agenda',
  'Clientes',
  'Profissionais',
  'Serviços',
  'Financeiro',
];

const ESTATISTICAS = [
  { rotulo: 'Faturamento (Hoje)', valor: 'R$ 2.480' },
  { rotulo: 'Atendimentos', valor: '18' },
  { rotulo: 'Novos Clientes', valor: '+45' },
  { rotulo: 'Ticket Médio', valor: 'R$ 138' },
];

/** Alturas da coluna do gráfico, em porcentagem. Desenhadas, não calculadas. */
const FATURAMENTO = [38, 52, 44, 67, 58, 81, 72];
const DIAS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

const AGENDAMENTOS = [
  { hora: '09:00', cliente: 'Renan A.' },
  { hora: '10:30', cliente: 'Diego M.' },
  { hora: '11:15', cliente: 'Vitor S.' },
];

export function PreviewDashboard() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-xl border border-brand-ink-foreground/12 bg-brand-ink-elevated shadow-2xl"
    >
      <div className="flex">
        {/* A barra lateral some abaixo de sm: em 375px ela comeria metade da
            largura e o miolo — que é o que interessa — ficaria ilegível. */}
        <aside className="hidden w-36 shrink-0 border-r border-brand-ink-foreground/10 p-3 sm:block lg:w-40">
          <p className="truncate font-display text-[11px] font-semibold text-brand-ink-foreground">
            CutHub barbearia
          </p>
          <ul className="mt-4 space-y-1.5">
            {MENU.map((item, i) => (
              <li
                key={item}
                className={`truncate rounded px-2 py-1 text-[10px] ${
                  i === 0
                    ? 'bg-primary/15 text-primary'
                    : 'text-brand-ink-foreground/50'
                }`}
              >
                {item}
              </li>
            ))}
          </ul>
        </aside>

        <div className="min-w-0 flex-1 p-3 sm:p-4">
          <p className="font-display text-xs font-semibold text-brand-ink-foreground sm:text-sm">
            Olá, CutHub barbearia
          </p>
          <p className="text-[10px] text-brand-ink-foreground/50">
            terça-feira, 22 de setembro
          </p>

          {/* 2x2, e nao 4 numa linha: medido em 1440, o preview tem 524px de
              largura, e a 4 colunas o rotulo "Faturamento (Hoje)" recebia 59px
              para 82 de que precisa -- saia cortado. Continuam quatro cartoes. */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            {ESTATISTICAS.map(({ rotulo, valor }) => (
              <div
                key={rotulo}
                className="rounded-lg border border-brand-ink-foreground/10 p-2"
              >
                <p className="truncate text-[9px] text-brand-ink-foreground/50">
                  {rotulo}
                </p>
                <p className="mt-0.5 font-display text-sm font-bold text-brand-ink-foreground">
                  {valor}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-2 grid gap-2 lg:grid-cols-5">
            <div className="rounded-lg border border-brand-ink-foreground/10 p-2.5 lg:col-span-3">
              <p className="text-[10px] font-medium text-brand-ink-foreground/70">
                Visão Geral De Faturamento
              </p>
              {/* Barras em div, não em biblioteca de gráfico: é um desenho
                  fixo, e puxar o recharts para a landing custaria o bundle de
                  uma tela que o visitante nem vai usar. */}
              <div className="mt-3 flex h-16 items-end gap-1.5">
                {FATURAMENTO.map((altura, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-sm bg-primary/70"
                      style={{ height: `${altura}%` }}
                    />
                    {/* /60 e não /40: a 8px o rótulo do dia ficava em 3.52 de
                        contraste, abaixo dos 4.5. `aria-hidden` esconde do
                        leitor de tela, não de quem enxerga pouco. */}
                    <span className="text-[8px] text-brand-ink-foreground/60">
                      {DIAS[i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 lg:col-span-2">
              <div className="rounded-lg border border-brand-ink-foreground/10 p-2.5">
                <p className="text-[10px] font-medium text-brand-ink-foreground/70">
                  Próximos Agendamentos
                </p>
                <ul className="mt-2 space-y-1.5">
                  {AGENDAMENTOS.map(({ hora, cliente }) => (
                    <li key={hora} className="flex items-center gap-2">
                      <span className="font-display text-[9px] tabular-nums text-primary">
                        {hora}
                      </span>
                      {/* Só a hora e o nome. O serviço saiu porque nao cabe:
                          medido, ele empurrava "Renan A." para 6px de largura
                          numa coluna que nunca passa de 200px. */}
                      <span className="min-w-0 flex-1 truncate text-[9px] text-brand-ink-foreground">
                        {cliente}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border border-brand-ink-foreground/10 p-2.5">
                <p className="text-[10px] font-medium text-brand-ink-foreground/70">
                  Próximo Da Fila
                </p>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="font-display text-base font-bold text-primary">
                    09:00
                  </span>
                  <span className="truncate text-[10px] text-brand-ink-foreground">
                    Renan A.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
