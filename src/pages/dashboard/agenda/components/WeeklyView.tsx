import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { format, parseISO, setHours, setMinutes, differenceInMinutes, startOfWeek, addDays, isSameDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface WeeklyViewProps {
  currentDate: Date;
  onAppointmentClick: (id: string) => void;
  profissionalId?: string | null;
}

// Configurações da grade de horários
const START_HOUR = 8;
const END_HOUR = 20;
const PIXELS_PER_MINUTE = 1.5; // Ajuste para altura dos slots

export default function WeeklyView({ currentDate, onAppointmentClick, profissionalId }: WeeklyViewProps) {
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Calcula os dias da semana (começando no domingo = 0)
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }).map((_, i) => START_HOUR + i);

  useEffect(() => {
    async function fetchAgenda() {
      setLoading(true);
      const startStr = format(weekDays[0], 'yyyy-MM-dd');
      const endStr = format(weekDays[6], 'yyyy-MM-dd');
      
      let query = supabase
        .from('agendamento')
        .select(`
          id, status, data_hora,
          cliente:cliente_id(nome),
          servico:servico_id(nome, duracao, preco),
          profissional:profissional_id(nome)
        `)
        .gte('data_hora', startStr)
        .lte('data_hora', endStr + 'T23:59:59');

      if (profissionalId) {
        query = query.eq('profissional_id', profissionalId);
      }

      const { data, error } = await query;

      if (!error && data) {
        setAgendamentos(data);
      }
      setLoading(false);
    }

    fetchAgenda();
  }, [currentDate, profissionalId]);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Carregando semana...</div>;
  }

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
                    
                    const topPos = Math.max(0, diffMinutes * PIXELS_PER_MINUTE);
                    const heightPos = agendamento.servico.duracao * PIXELS_PER_MINUTE;

                    let statusColor = 'bg-primary/20 border-primary text-amber-900 dark:text-primary';
                    if (agendamento.status === 'confirmado') statusColor = 'bg-blue-500/20 border-blue-500 text-blue-700 dark:text-blue-300';
                    if (agendamento.status === 'concluido') statusColor = 'bg-green-500/20 border-green-500 text-green-700 dark:text-green-300';
                    if (agendamento.status === 'cancelado') statusColor = 'bg-red-500/20 border-red-500 text-red-700 dark:text-red-300 opacity-60';

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
                        <div className="truncate opacity-80 hidden sm:block">{agendamento.servico.nome}</div>
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
