import { supabase } from '@/lib/supabase';
import { endOfDay, startOfDay } from 'date-fns';
import type { Intervalo } from '@/lib/disponibilidade';

export interface OcupacaoDoDia {
  /** Faixas de trabalho ativas do profissional no dia da semana informado */
  jornada: { hora_inicio: string; hora_fim: string }[];
  /** Agendamentos e bloqueios que impedem novos atendimentos */
  ocupados: Intervalo[];
}

export const disponibilidadeService = {
  /**
   * Reúne, em uma única chamada, tudo que restringe a agenda de um profissional em um dia:
   * a jornada de trabalho, os agendamentos vigentes e os bloqueios (do profissional ou de
   * toda a barbearia).
   */
  async obterOcupacaoDoDia(barbeariaId: string, profissionalId: string, dia: Date): Promise<OcupacaoDoDia> {
    const inicioDia = startOfDay(dia).toISOString();
    const fimDia = endOfDay(dia).toISOString();

    const [jornadaRes, agendamentosRes, bloqueiosRes] = await Promise.all([
      supabase
        .from('horario_trabalho')
        .select('hora_inicio, hora_fim')
        .eq('profissional_id', profissionalId)
        .eq('dia_semana', dia.getDay())
        .eq('ativo', true)
        // F9: escala pedida e nao aprovada nao vale. Sem isto o barbeiro
        // forjaria a propria jornada sem passar pelo dono.
        .eq('status_aprovacao', 'aprovado')
        .order('hora_inicio'),

      // Mesma condição do constraint agendamento_sem_sobreposicao:
      // cancelados e faltas liberam o horário.
      supabase
        .from('agendamento')
        .select('data_hora, data_hora_fim')
        .eq('profissional_id', profissionalId)
        .not('status', 'in', '(cancelado,faltou)')
        .lt('data_hora', fimDia)
        .gt('data_hora_fim', inicioDia),

      supabase
        .from('bloqueio')
        .select('data_hora_inicio, data_hora_fim')
        .eq('barbearia_id', barbeariaId)
        .or(`profissional_id.eq.${profissionalId},profissional_id.is.null`)
        .eq('status_aprovacao', 'aprovado')
        .lt('data_hora_inicio', fimDia)
        .gt('data_hora_fim', inicioDia),
    ]);

    if (jornadaRes.error) throw new Error(`Falha ao obter jornada do profissional: ${jornadaRes.error.message}`);
    if (agendamentosRes.error) throw new Error(`Falha ao obter agendamentos do dia: ${agendamentosRes.error.message}`);
    if (bloqueiosRes.error) throw new Error(`Falha ao obter bloqueios do dia: ${bloqueiosRes.error.message}`);

    const ocupados: Intervalo[] = [
      ...agendamentosRes.data.map((a) => ({
        inicio: new Date(a.data_hora),
        fim: new Date(a.data_hora_fim),
      })),
      ...bloqueiosRes.data.map((b) => ({
        inicio: new Date(b.data_hora_inicio),
        fim: new Date(b.data_hora_fim),
      })),
    ];

    return { jornada: jornadaRes.data, ocupados };
  },
};
