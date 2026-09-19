import { Suspense, lazy } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { CalendarClock, DollarSign, Scissors, TrendingUp, Users } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/AuthContext';
import { useDashboard } from '@/hooks/useDashboard';
import { ProximoAgendamentoPorBarbeiro } from '@/components/dashboard/ProximoAgendamentoPorBarbeiro';
import { resumirAgendamento } from '@/lib/agendamento';
import { formatarMoeda } from '@/lib/utils';
import { RequisicoesDaEquipe } from '@/components/dashboard/RequisicoesDaEquipe';

// O recharts responde por ~400 kB do bundle; carregado sob demanda, sai do caminho crítico
const FaturamentoChart = lazy(() =>
  import('@/components/dashboard/FaturamentoChart').then((m) => ({ default: m.FaturamentoChart }))
);

export default function DashboardHome() {
  const { barbeariaId } = useAuth();
  const navigate = useNavigate();
  const {
    indicadores,
    faturamentoDiario,
    proximosAgendamentos,
    diasNoGrafico,
    isLoading,
    isError,
    error,
  } = useDashboard(barbeariaId);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card p-12 text-center">
        <h3 className="mb-1 text-lg font-semibold">Não foi possível carregar o painel</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          {(error as Error)?.message || 'Erro desconhecido ao consultar os indicadores.'}
        </p>
      </div>
    );
  }

  const variacao = calcularVariacao(indicadores?.faturamentoHoje, indicadores?.faturamentoOntem);

  return (
    <div className="space-y-6">
      {/* Antes dos indicadores de proposito: pedido da equipe parado e coisa
          que custa dinheiro -- o barbeiro nao sabe se pode faltar. */}
      <RequisicoesDaEquipe />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <IndicadorCard
          titulo="Faturamento (Hoje)"
          icone={<DollarSign className="h-4 w-4 text-primary" />}
          isLoading={isLoading}
          valor={formatarMoeda(indicadores?.faturamentoHoje ?? 0)}
          detalhe={variacao}
          destino="/dashboard/financeiro"
        />

        <IndicadorCard
          titulo="Atendimentos Realizados"
          icone={<Scissors className="h-4 w-4 text-primary" />}
          isLoading={isLoading}
          valor={String(indicadores?.atendimentosConcluidosHoje ?? 0)}
          detalhe={`${indicadores?.atendimentosRestantesHoje ?? 0} ainda na agenda de hoje`}
          destino="/dashboard/agenda"
        />

        <IndicadorCard
          titulo="Novos Clientes"
          icone={<Users className="h-4 w-4 text-primary" />}
          isLoading={isLoading}
          valor={`+${indicadores?.novosClientes7Dias ?? 0}`}
          detalhe="Cadastrados nos últimos 7 dias"
          destino="/dashboard/clientes"
        />

        <IndicadorCard
          titulo="Taxa de Retorno"
          icone={<TrendingUp className="h-4 w-4 text-primary" />}
          isLoading={isLoading}
          valor={`${indicadores?.retorno.percentual ?? 0}%`}
          detalhe={
            indicadores && indicadores.retorno.clientesNoPeriodo > 0
              ? `${indicadores.retorno.clientesQueVoltaram} de ${indicadores.retorno.clientesNoPeriodo} clientes voltaram em 90 dias`
              : 'Sem atendimentos concluídos nos últimos 90 dias'
          }
          destino="/dashboard/clientes"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Visão Geral de Faturamento</CardTitle>
            <p className="text-xs text-muted-foreground">
              Entradas do caixa nos últimos {diasNoGrafico} dias
            </p>
          </CardHeader>
          <CardContent className="pl-2">
            {isLoading ? (
              <Skeleton className="h-[240px] w-full" />
            ) : (
              <Suspense fallback={<Skeleton className="h-[240px] w-full" />}>
                <FaturamentoChart
                  dados={faturamentoDiario}
                  onPontoClick={() => navigate('/dashboard/financeiro')}
                />
              </Suspense>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Próximos Agendamentos</CardTitle>
              <p className="text-xs text-muted-foreground">Ainda hoje</p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard/agenda">Ver agenda</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : proximosAgendamentos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CalendarClock className="mb-2 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Nenhum atendimento restante para hoje.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {proximosAgendamentos.map((agendamento) => {
                  const { nomes, precoTotal } = resumirAgendamento(agendamento);
                  return (
                    <div key={agendamento.id} className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                        {agendamento.cliente?.nome?.charAt(0)?.toUpperCase() ?? '?'}
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <p className="truncate text-sm font-medium leading-none">
                          {agendamento.cliente?.nome ?? 'Cliente não informado'}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {nomes} — {format(new Date(agendamento.data_hora), 'HH:mm')}
                        </p>
                      </div>
                      <div className="ml-auto whitespace-nowrap font-medium">
                        {formatarMoeda(precoTotal)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <ProximoAgendamentoPorBarbeiro />
        </div>
      </div>
    </div>
  );
}

function calcularVariacao(hoje?: number, ontem?: number): string {
  if (hoje === undefined || ontem === undefined) return '';
  if (ontem === 0) {
    return hoje > 0 ? 'Ontem não houve entradas' : 'Sem entradas hoje e ontem';
  }
  const variacao = Math.round(((hoje - ontem) / ontem) * 100);
  const sinal = variacao > 0 ? '+' : '';
  return `${sinal}${variacao}% em relação a ontem`;
}

function IndicadorCard({
  titulo,
  icone,
  valor,
  detalhe,
  isLoading,
  destino,
}: {
  titulo: string;
  icone: React.ReactNode;
  valor: string;
  detalhe: string;
  isLoading: boolean;
  /** Rota aberta ao clicar no cartão; sem ela o cartão é apenas informativo */
  destino?: string;
}) {
  const navigate = useNavigate();
  const clicavel = !!destino && !isLoading;

  return (
    <Card
      onClick={clicavel ? () => navigate(destino) : undefined}
      onKeyDown={
        clicavel
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate(destino);
              }
            }
          : undefined
      }
      role={clicavel ? 'link' : undefined}
      tabIndex={clicavel ? 0 : undefined}
      className={
        clicavel
          ? 'cursor-pointer transition-all hover:border-primary/30 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          : undefined
      }
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{titulo}</CardTitle>
        {icone}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <>
            <Skeleton className="h-8 w-28" />
            <Skeleton className="mt-2 h-3 w-40" />
          </>
        ) : (
          <>
            <div className="text-2xl font-bold">{valor}</div>
            <p className="text-xs text-muted-foreground">{detalhe}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
