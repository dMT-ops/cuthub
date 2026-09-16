import { format, parseISO, setHours, setMinutes, differenceInMinutes, startOfWeek, addDays, isSameDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { CLASSES_STATUS, resumirAgendamento } from '@/lib/agendamento';
import type { AgendamentoComDetalhes } from '@/services/agendamentos.service';
import type { Database } from '@/types/database.types';

type ConfiguracaoBarbearia = Database['public']['Tables']['configuracao_barbearia']['Row'];

interface WeeklyViewProps {
  currentDate: Date;
  onAppointmentClick: (id: string) => void;
  agendamentos: AgendamentoComDetalhes[];
  configuracao?: ConfiguracaoBarbearia | null;
}

const PIXELS_PER_MINUTE = 1.5; // Ajuste para altura dos slots

export default function WeeklyView({ currentDate, onAppointmentClick, agendamentos, configuracao }: WeeklyViewProps) {
  // Calcula os dias da semana (começando no domingo = 0)
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // 1 = Segunda
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  // Horários configuráveis
  const START_HOUR = configuracao?.horario_abertura ? parseInt(configuracao.horario_abertura.split(':')[0], 10) : 8;
  const END_HOUR = configuracao?.horario_fechamento ? parseInt(configuracao.horario_fechamento.split(':')[0], 10) : 20;
  
  const hours = Array.from({ length: Math.max(1, END_HOUR - START_HOUR + 1) }).map((_, i) => START_HOUR + i);

  return (
    <div className="flex flex-col h-full bg-card rounded-lg overflow-hidden shadow-sm border">
      {/* HEADER: Dias da Semana */}
      <div className="flex border-b bg-muted/30">
        <div className="w-16 flex-shrink-0 border-r" /> {/* Espaço para coluna de horários */}
        <div className="flex-1 grid grid-cols-7 divide-x">
          {weekDays.map(day => (
            <div key={day.toString()} className={cn(
              "py-3 text-center flex flex-col items-center justify-center",
              isToday(day) && "bg-primary/5"
            )}>
              <span className="text-xs font-semibold text-muted-foreground uppercase">
                {format(day, 'eee', { locale: ptBR })}
              </span>
              <span className={cn(
                "text-lg font-bold mt-0.5 h-8 w-8 flex items-center justify-center rounded-full",
                isToday(day) ? "bg-primary text-primary-foreground" : "text-foreground"
              )}>
                {format(day, 'd')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* BODY: Grade de Horários */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex min-w-max md:min-w-0">
          {/* Coluna Horários */}
          <div className="w-16 flex-shrink-0 border-r bg-muted/10 relative">
            {hours.map((hour) => (
              <div 
                key={hour} 
                className="text-right pr-2 text-xs font-medium text-muted-foreground"
                style={{ height: `${60 * PIXELS_PER_MINUTE}px` }}
              >
                <div className="-mt-2.5">{`${hour.toString().padStart(2, '0')}:00`}</div>
              </div>
            ))}
          </div>

          {/* Colunas dos Dias */}
          <div className="flex-1 grid grid-cols-7 divide-x relative">
            {/* Linhas horizontais de hora em hora (renderizadas por baixo das colunas) */}
            <div className="absolute inset-0 pointer-events-none flex flex-col">
              {hours.map((hour) => (
                <div 
                  key={`line-${hour}`} 
                  className="w-full border-b border-muted/50"
                  style={{ height: `${60 * PIXELS_PER_MINUTE}px` }}
                />
              ))}
            </div>

            {/* Conteúdo de cada dia */}
            {weekDays.map((day) => {
              const dayAppointments = agendamentos.filter(ag => isSameDay(parseISO(ag.data_hora), day));

              return (
                <div key={day.toString()} className="relative" style={{ height: `${hours.length * 60 * PIXELS_PER_MINUTE}px` }}>
                  {dayAppointments.map(agendamento => {
                    const data = parseISO(agendamento.data_hora);
                    const baseDate = setMinutes(setHours(data, START_HOUR), 0);
                    const diffMinutes = differenceInMinutes(data, baseDate);
                    
                    const { nomes, duracaoMinutos } = resumirAgendamento(agendamento);

                    const topPos = Math.max(0, diffMinutes * PIXELS_PER_MINUTE);
                    const heightPos = duracaoMinutos * PIXELS_PER_MINUTE;
                    const statusColor = CLASSES_STATUS[agendamento.status];

                    return (
                      <div 
                        key={agendamento.id}
                        className={`absolute left-0.5 right-0.5 rounded border-l-2 p-1 text-[10px] sm:text-xs overflow-hidden cursor-pointer hover:brightness-95 transition-all shadow-sm ${statusColor}`}
                        style={{
                          top: `${topPos}px`,
                          height: `${heightPos}px`,
                        }}
                        onClick={() => onAppointmentClick(agendamento.id)}
                      >
                        <div className="font-semibold truncate">{agendamento.cliente?.nome || 'Anônimo'}</div>
                        <div className="truncate opacity-80 hidden sm:block">{nomes}</div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
