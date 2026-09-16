import { useMemo } from 'react';
import { 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isToday, 
  format,
  startOfWeek,
  endOfWeek
} from 'date-fns';
import { cn } from '@/lib/utils';
import type { AgendamentoComDetalhes } from '@/services/agendamentos.service';

interface MonthlyViewProps {
  currentDate: Date;
  onDateClick: (date: Date) => void;
  agendamentos: AgendamentoComDetalhes[];
}

export default function MonthlyView({ currentDate, onDateClick, agendamentos }: MonthlyViewProps) {
  // Define os dias que aparecerão no grid (incluindo dias vazios do começo/fim)
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  
  // startOfWeek para preencher os primeiros quadrados do grid com dias do mês passado (se necessário)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); 
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
  
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const counts = useMemo(() => {
    const newCounts: Record<string, number> = {};
    agendamentos.forEach((ag) => {
      // consideramos todos, ou só os não cancelados?
      if (ag.status !== 'cancelado') {
        const dStr = ag.data_hora.split('T')[0];
        newCounts[dStr] = (newCounts[dStr] || 0) + 1;
      }
    });
    return newCounts;
  }, [agendamentos]);

  /**
   * Referência de volume do mês: média e limiar de "dia cheio".
   *
   * Só a média não serve como corte. Com 0,7 agendamento/dia, qualquer dia com
   * um único atendimento já ficaria acima dela e a faixa intermediária
   * desapareceria. Por isso o limiar é média + 1 desvio padrão (nunca menor
   * que 2), o que mantém as três faixas significativas mesmo em meses fracos.
   *
   * Considera apenas os dias do mês exibido — os dias de preenchimento das
   * semanas vizinhas distorceriam a referência.
   */
  const { media, limiarAlto } = useMemo(() => {
    const diasDoMes = eachDayOfInterval({
      start: startOfMonth(currentDate),
      end: endOfMonth(currentDate),
    });
    if (diasDoMes.length === 0) return { media: 0, limiarAlto: 1 };

    const valores = diasDoMes.map((dia) => counts[format(dia, 'yyyy-MM-dd')] || 0);
    const media = valores.reduce((a, b) => a + b, 0) / valores.length;
    const variancia = valores.reduce((soma, v) => soma + (v - media) ** 2, 0) / valores.length;
    const desvio = Math.sqrt(variancia);

    return { media, limiarAlto: Math.max(2, media + desvio) };
  }, [counts, currentDate]);

  /**
   * Cor do dia por volume: vermelho sem movimento, amarelo dentro do esperado,
   * verde nos dias mais cheios que o normal do mês.
   */
  const corPorVolume = (count: number) => {
    if (count === 0) return 'bg-red-500/10 hover:bg-red-500/20';
    if (count >= limiarAlto) return 'bg-green-500/20 hover:bg-green-500/30';
    return 'bg-yellow-500/20 hover:bg-yellow-500/30';
  };

  const corDaBarra = (count: number) => {
    if (count === 0) return 'bg-red-500/30';
    if (count >= limiarAlto) return 'bg-green-500/70';
    return 'bg-yellow-500/70';
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-lg border shadow-sm overflow-hidden">
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {weekDays.map((wd) => (
          <div key={wd} className="py-3 text-center text-sm font-semibold text-muted-foreground">
            {wd}
          </div>
        ))}
      </div>
      
      <div className="flex-1 grid grid-cols-7 grid-rows-5 lg:grid-rows-6">
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const count = counts[dateStr] || 0;
          const isCurrentMonth = isSameMonth(day, monthStart);
          const today = isToday(day);

          return (
            <div 
              key={day.toString()}
              onClick={() => onDateClick(day)}
              className={cn(
                "min-h-[100px] border-b border-r p-2 flex flex-col cursor-pointer transition-all relative group",
                isCurrentMonth ? corPorVolume(count) : "bg-muted/10 opacity-50",
                today && "ring-2 ring-primary ring-inset z-10"
              )}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={cn(
                  "h-7 w-7 flex items-center justify-center rounded-full text-sm font-medium",
                  today ? "bg-primary text-primary-foreground" : "text-foreground"
                )}>
                  {format(day, 'd')}
                </span>
                
                {count > 0 && (
                  <span className="text-[10px] font-bold text-muted-foreground group-hover:text-foreground bg-muted px-2 py-0.5 rounded-full">
                    {count}
                  </span>
                )}
              </div>
              
              <div className="flex-1 w-full flex items-end">
                {count > 0 && (
                  <div 
                    className={cn("w-full h-2 rounded-full transition-colors", corDaBarra(count))}
                    title={`${count} agendamento(s)`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legenda das cores por volume */}
      <div className="flex flex-wrap items-center gap-4 border-t bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" aria-hidden="true" />
          Dia cheio ({Math.ceil(limiarAlto)}+ agendamentos)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" aria-hidden="true" />
          Movimento normal
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/40" aria-hidden="true" />
          Sem agendamentos
        </span>
        <span className="ml-auto">
          Média do mês: <strong className="text-foreground">{media.toFixed(1)}</strong> por dia
        </span>
      </div>
    </div>
  );
}
