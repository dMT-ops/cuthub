import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { endOfDay } from 'date-fns';
import { dashboardService } from '@/services/dashboard.service';
import type { PontoFaturamento } from '@/services/dashboard.service';
import { agendamentosService } from '@/services/agendamentos.service';

const DIAS_NO_GRAFICO = 30;
const LIMITE_PROXIMOS = 5;

/**
 * Referência estável para a lista ainda não carregada. Ver useHorarios.ts:
 * `query.data || []` cria um array novo a cada render enquanto `data` for
 * undefined, e uma dep instável em useEffect vira laço de renderização.
 */
const FATURAMENTO_VAZIO: PontoFaturamento[] = [];

export function useDashboard(barbeariaId: string | null | undefined) {
  // Congela o instante da montagem: sem isso, cada render geraria uma queryKey nova
  const janela = useMemo(() => {
    const agora = new Date();
    return { agora: agora.toISOString(), fimDoDia: endOfDay(agora).toISOString() };
  }, []);

  const indicadores = useQuery({
    queryKey: ['dashboard_indicadores', barbeariaId],
    queryFn: () => dashboardService.obterIndicadores(barbeariaId!),
    enabled: !!barbeariaId,
  });

  const faturamento = useQuery({
    queryKey: ['dashboard_faturamento', barbeariaId, DIAS_NO_GRAFICO],
    queryFn: () => dashboardService.obterFaturamentoDiario(barbeariaId!, DIAS_NO_GRAFICO),
    enabled: !!barbeariaId,
  });

  // Reaproveita a mesma consulta da Agenda, com os joins de cliente, profissional e serviços
  const proximos = useQuery({
    queryKey: ['dashboard_proximos', barbeariaId, janela.agora],
    queryFn: () => agendamentosService.listarPorPeriodo(barbeariaId!, janela.agora, janela.fimDoDia),
    enabled: !!barbeariaId,
  });

  const proximosAgendamentos = useMemo(() => {
    return (proximos.data ?? [])
      .filter((a) => a.status === 'pendente' || a.status === 'confirmado' || a.status === 'em_atendimento')
      .slice(0, LIMITE_PROXIMOS);
  }, [proximos.data]);

  return {
    indicadores: indicadores.data,
    faturamentoDiario: faturamento.data ?? FATURAMENTO_VAZIO,
    proximosAgendamentos,
    diasNoGrafico: DIAS_NO_GRAFICO,
    isLoading: indicadores.isLoading || faturamento.isLoading || proximos.isLoading,
    isError: indicadores.isError || faturamento.isError || proximos.isError,
    error: indicadores.error || faturamento.error || proximos.error,
  };
}
