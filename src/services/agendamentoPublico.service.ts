import { supabase } from '@/lib/supabase';
import type { Intervalo } from '@/lib/disponibilidade';

export interface OcupacaoDoDia {
  jornada: { hora_inicio: string; hora_fim: string }[];
  ocupados: Intervalo[];
}

export interface PedidoDeAgendamento {
  barbeariaId: string;
  profissionalId: string;
  servicoIds: string[];
  dataHora: Date;
  observacoes?: string | null;
}

/**
 * O agendamento pelo lado de fora passa inteiro por RPC, e não pelas tabelas.
 *
 * Não é preferência de estilo: o cliente **não consegue** ler `horario_trabalho`,
 * `bloqueio` nem `servico`, e **não consegue** inserir em `agendamento` — todas
 * as policies são `barbearia_id = get_barbearia_do_usuario()` e ele não pertence
 * a barbearia nenhuma. Medido antes de escrever (ver `00019`).
 *
 * As duas funções do banco são a fronteira: elas validam catálogo, profissional,
 * serviços, jornada e bloqueio antes de gravar qualquer coisa.
 */
export const agendamentoPublicoService = {
  /**
   * Jornada e intervalos ocupados de um profissional no dia.
   *
   * Devolve o mesmo formato de `disponibilidade.service.obterOcupacaoDoDia`, o
   * que permite reaproveitar `gerarHorariosDisponiveis` — função pura já usada
   * pelo painel — em vez de reimplementar a geração de horários.
   */
  async obterOcupacao(profissionalId: string, dia: Date): Promise<OcupacaoDoDia> {
    const inicio = new Date(dia);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(dia);
    fim.setHours(23, 59, 59, 999);

    const { data, error } = await supabase.rpc('ocupacao_publica', {
      p_profissional_id: profissionalId,
      // O dia da semana sai do fuso do navegador, como o painel já faz.
      p_dia_semana: dia.getDay(),
      p_inicio: inicio.toISOString(),
      p_fim: fim.toISOString(),
    });

    if (error) throw new Error(`Falha ao consultar os horários: ${error.message}`);

    const bruto = (data ?? {}) as {
      jornada?: { hora_inicio: string; hora_fim: string }[];
      ocupados?: { inicio: string; fim: string }[];
    };

    return {
      jornada: bruto.jornada ?? [],
      ocupados: (bruto.ocupados ?? []).map((o) => ({
        inicio: new Date(o.inicio),
        fim: new Date(o.fim),
      })),
    };
  },

  async agendar(pedido: PedidoDeAgendamento): Promise<string> {
    const { data, error } = await supabase.rpc('agendar_como_cliente', {
      p_barbearia_id: pedido.barbeariaId,
      p_profissional_id: pedido.profissionalId,
      p_servico_ids: pedido.servicoIds,
      p_data_hora: pedido.dataHora.toISOString(),
      p_observacoes: pedido.observacoes ?? undefined,
    });

    if (error) throw new Error(traduzir(error.message));
    return data as string;
  },
};

/**
 * As mensagens vêm do `RAISE EXCEPTION` do Postgres, sem acentuação para não
 * depender do encoding do banco. Aqui viram texto de produto — mesmo padrão de
 * `acessos.service.ts` e do tratamento da constraint em `agendamentos.service.ts`.
 */
const MENSAGENS: Array<[string, string]> = [
  ['agendamento_sem_sobreposicao', 'Este horário acabou de ser ocupado. Escolha outro.'],
  ['Escolha um horario no futuro', 'Escolha um horário no futuro.'],
  ['Selecione ao menos um servico', 'Selecione ao menos um serviço.'],
  ['Algum servico selecionado nao esta disponivel', 'Algum serviço escolhido não está mais disponível.'],
  ['Horario fora da jornada', 'Este profissional não atende nesse horário.'],
  ['Horario indisponivel nesta barbearia', 'Este horário não está disponível.'],
  ['Profissional indisponivel', 'Este profissional não está disponível nesta barbearia.'],
  ['Esta barbearia nao esta aceitando agendamentos', 'Esta barbearia não está aceitando agendamentos pelo site.'],
  ['Autenticacao obrigatoria', 'Entre na sua conta para agendar.'],
  ['permission denied', 'Entre na sua conta para agendar.'],
];

function traduzir(mensagem: string): string {
  const achado = MENSAGENS.find(([trecho]) => mensagem.includes(trecho));
  return achado ? achado[1] : mensagem;
}
