import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { disponibilidadeService } from '@/services/disponibilidade.service';
import { gerarHorariosDisponiveis } from '@/lib/disponibilidade';

/**
 * Horários livres de um profissional em um dia, para um atendimento de duração conhecida.
 *
 * A consulta é indexada por profissional + dia (a duração não entra na queryKey porque
 * o cálculo dos slots acontece em memória sobre a mesma ocupação).
 */
export function useDisponibilidade(
  barbeariaId: string | null | undefined,
  profissionalId: string | null | undefined,
  dia: Date | null,
  duracaoMinutos: number
) {
  const diaChave = dia ? format(dia, 'yyyy-MM-dd') : null;

  const query = useQuery({
    queryKey: ['disponibilidade', barbeariaId, profissionalId, diaChave],
    queryFn: () => disponibilidadeService.obterOcupacaoDoDia(barbeariaId!, profissionalId!, dia!),
    enabled: !!barbeariaId && !!profissionalId && !!dia,
  });

  const horarios = useMemo(() => {
    if (!query.data || !dia || duracaoMinutos <= 0) return [];
    return gerarHorariosDisponiveis({
      dia,
      jornada: query.data.jornada,
      ocupados: query.data.ocupados,
      duracaoMinutos,
    });
  }, [query.data, dia, duracaoMinutos]);

  return {
    horarios,
    /** Sem faixa de trabalho cadastrada para este dia da semana */
    semJornada: !!query.data && query.data.jornada.length === 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
