import { supabase } from '@/lib/supabase';
import { endOfDay, format, startOfDay, subDays } from 'date-fns';

export interface IndicadoresDashboard {
  faturamentoHoje: number;
  faturamentoOntem: number;
  atendimentosConcluidosHoje: number;
  atendimentosRestantesHoje: number;
  novosClientes7Dias: number;
  /** Clientes atendidos nos últimos 90 dias que voltaram mais de uma vez */
  retorno: { percentual: number; clientesNoPeriodo: number; clientesQueVoltaram: number };
}

export interface PontoFaturamento {
  /** Rótulo curto para o eixo X (dd/MM) */
  dia: string;
  valor: number;
}

const DIAS_RETENCAO = 90;

export const dashboardService = {
  async obterIndicadores(barbeariaId: string): Promise<IndicadoresDashboard> {
    const agora = new Date();
    const inicioHoje = startOfDay(agora);
    const inicioOntem = startOfDay(subDays(agora, 1));
    const fimHoje = endOfDay(agora);

    const [caixaRes, agendamentosRes, clientesRes, retencaoRes] = await Promise.all([
      // Entradas de ontem e de hoje em uma consulta só
      supabase
        .from('lancamento_financeiro')
        .select('valor, data_lancamento')
        .eq('barbearia_id', barbeariaId)
        .eq('tipo', 'entrada')
        .gte('data_lancamento', inicioOntem.toISOString())
        .lte('data_lancamento', fimHoje.toISOString()),

      supabase
        .from('agendamento')
        .select('status, data_hora')
        .eq('barbearia_id', barbeariaId)
        .gte('data_hora', inicioHoje.toISOString())
        .lte('data_hora', fimHoje.toISOString()),

      supabase
        .from('cliente')
        .select('id', { count: 'exact', head: true })
        .eq('barbearia_id', barbeariaId)
        .gte('criado_em', startOfDay(subDays(agora, 6)).toISOString()),

      supabase
        .from('agendamento')
        .select('cliente_id')
        .eq('barbearia_id', barbeariaId)
        .eq('status', 'concluido')
        .gte('data_hora', startOfDay(subDays(agora, DIAS_RETENCAO)).toISOString()),
    ]);

    if (caixaRes.error) throw new Error(`Falha ao obter faturamento: ${caixaRes.error.message}`);
    if (agendamentosRes.error) throw new Error(`Falha ao obter agendamentos do dia: ${agendamentosRes.error.message}`);
    if (clientesRes.error) throw new Error(`Falha ao contar novos clientes: ${clientesRes.error.message}`);
    if (retencaoRes.error) throw new Error(`Falha ao calcular a taxa de retorno: ${retencaoRes.error.message}`);

    const faturamento = caixaRes.data.reduce(
      (acc, lancamento) => {
        if (!lancamento.data_lancamento) return acc;
        const data = new Date(lancamento.data_lancamento);
        if (data >= inicioHoje) acc.hoje += Number(lancamento.valor);
        else acc.ontem += Number(lancamento.valor);
        return acc;
      },
      { hoje: 0, ontem: 0 }
    );

    const agendamentos = agendamentosRes.data.reduce(
      (acc, agendamento) => {
        if (agendamento.status === 'concluido') acc.concluidos += 1;
        else if (agendamento.status === 'pendente' || agendamento.status === 'confirmado' || agendamento.status === 'em_atendimento') {
          acc.restantes += 1;
        }
        return acc;
      },
      { concluidos: 0, restantes: 0 }
    );

    // Taxa de retorno = clientes com mais de um atendimento concluído / clientes atendidos
    const atendimentosPorCliente = new Map<string, number>();
    for (const { cliente_id } of retencaoRes.data) {
      atendimentosPorCliente.set(cliente_id, (atendimentosPorCliente.get(cliente_id) ?? 0) + 1);
    }
    const clientesNoPeriodo = atendimentosPorCliente.size;
    const clientesQueVoltaram = [...atendimentosPorCliente.values()].filter((n) => n > 1).length;

    return {
      faturamentoHoje: faturamento.hoje,
      faturamentoOntem: faturamento.ontem,
      atendimentosConcluidosHoje: agendamentos.concluidos,
      atendimentosRestantesHoje: agendamentos.restantes,
      novosClientes7Dias: clientesRes.count ?? 0,
      retorno: {
        percentual: clientesNoPeriodo === 0 ? 0 : Math.round((clientesQueVoltaram / clientesNoPeriodo) * 100),
        clientesNoPeriodo,
        clientesQueVoltaram,
      },
    };
  },

  /** Entradas do caixa agregadas por dia, incluindo os dias sem movimento */
  async obterFaturamentoDiario(barbeariaId: string, dias: number): Promise<PontoFaturamento[]> {
    const agora = new Date();
    const inicio = startOfDay(subDays(agora, dias - 1));

    const { data, error } = await supabase
      .from('lancamento_financeiro')
      .select('valor, data_lancamento')
      .eq('barbearia_id', barbeariaId)
      .eq('tipo', 'entrada')
      .gte('data_lancamento', inicio.toISOString())
      .lte('data_lancamento', endOfDay(agora).toISOString());

    if (error) throw new Error(`Falha ao obter o faturamento diário: ${error.message}`);

    const porDia = new Map<string, number>();
    for (let i = 0; i < dias; i++) {
      porDia.set(format(subDays(agora, dias - 1 - i), 'dd/MM'), 0);
    }

    for (const lancamento of data) {
      if (!lancamento.data_lancamento) continue;
      const chave = format(new Date(lancamento.data_lancamento), 'dd/MM');
      if (porDia.has(chave)) {
        porDia.set(chave, porDia.get(chave)! + Number(lancamento.valor));
      }
    }

    return [...porDia.entries()].map(([dia, valor]) => ({ dia, valor }));
  },
};
