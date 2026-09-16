import { addMinutes, isBefore, setHours, setMinutes, setSeconds, startOfDay } from 'date-fns';

export interface Intervalo {
  inicio: Date;
  fim: Date;
}

/** Converte "HH:MM:SS" (coluna TIME do Postgres) para um Date no dia informado. */
export function horaParaData(dia: Date, hora: string): Date {
  const [h, m, s] = hora.split(':').map(Number);
  return setSeconds(setMinutes(setHours(startOfDay(dia), h || 0), m || 0), s || 0);
}

function haSobreposicao(a: Intervalo, b: Intervalo): boolean {
  // Mesma regra do constraint agendamento_sem_sobreposicao: intervalos que se tocam
  // nas pontas (fim de um == início do outro) não conflitam.
  return a.inicio < b.fim && b.inicio < a.fim;
}

/**
 * Calcula os horários em que um atendimento de `duracaoMinutos` cabe na jornada do
 * profissional sem colidir com agendamentos ou bloqueios já existentes.
 *
 * Função pura: toda a entrada vem por parâmetro, o que a torna testável sem banco.
 */
export function gerarHorariosDisponiveis({
  dia,
  jornada,
  ocupados,
  duracaoMinutos,
  passoMinutos = 15,
  agora = new Date(),
}: {
  dia: Date;
  jornada: { hora_inicio: string; hora_fim: string }[];
  ocupados: Intervalo[];
  duracaoMinutos: number;
  passoMinutos?: number;
  agora?: Date;
}): Date[] {
  if (duracaoMinutos <= 0 || jornada.length === 0) return [];

  const horarios: Date[] = [];

  for (const faixa of jornada) {
    const inicioFaixa = horaParaData(dia, faixa.hora_inicio);
    const fimFaixa = horaParaData(dia, faixa.hora_fim);

    for (let candidato = inicioFaixa; ; candidato = addMinutes(candidato, passoMinutos)) {
      const termino = addMinutes(candidato, duracaoMinutos);
      if (termino > fimFaixa) break;

      // Não oferecer horário que já passou
      if (isBefore(candidato, agora)) continue;

      const livre = !ocupados.some((ocupado) => haSobreposicao({ inicio: candidato, fim: termino }, ocupado));
      if (livre) horarios.push(candidato);
    }
  }

  return horarios.sort((a, b) => a.getTime() - b.getTime());
}
