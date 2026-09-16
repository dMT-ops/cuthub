import { differenceInMinutes } from 'date-fns';
import type { AgendamentoComDetalhes } from '@/services/agendamentos.service';
import type { Database } from '@/types/database.types';

type StatusAgendamento = Database['public']['Enums']['status_agendamento'];

/**
 * Um agendamento pode ter vários serviços (tabela agendamento_servico).
 * Este resumo evita que cada tela leia apenas o primeiro item da lista e
 * mostre preço e duração incorretos.
 */
export function resumirAgendamento(agendamento: AgendamentoComDetalhes) {
  const itens = agendamento.agendamento_servico ?? [];

  return {
    nomes: itens.map((i) => i.servico?.nome).filter(Boolean).join(' + ') || 'Serviço não informado',
    precoTotal: itens.reduce((total, item) => total + Number(item.preco_cobrado ?? 0), 0),
    // A duração real vem de data_hora_fim, coluna mantida pelo banco justamente
    // para não depender da soma dos serviços em toda leitura.
    duracaoMinutos: differenceInMinutes(new Date(agendamento.data_hora_fim), new Date(agendamento.data_hora)),
  };
}

export const ROTULO_STATUS: Record<StatusAgendamento, string> = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  em_atendimento: 'Em atendimento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
  faltou: 'Faltou',
};

/** Classes de cor por status, compartilhadas pelas visões da agenda. */
export const CLASSES_STATUS: Record<StatusAgendamento, string> = {
  pendente: 'bg-primary/20 border-primary text-amber-900 dark:text-primary',
  confirmado: 'bg-blue-500/20 border-blue-500 text-blue-700 dark:text-blue-300',
  em_atendimento: 'bg-orange-500/20 border-orange-500 text-orange-700 dark:text-orange-300',
  concluido: 'bg-green-500/20 border-green-500 text-green-700 dark:text-green-300',
  cancelado: 'bg-red-500/20 border-red-500 text-red-700 dark:text-red-300 opacity-60',
  faltou: 'bg-red-500/20 border-red-500 text-red-700 dark:text-red-300 opacity-60',
};
