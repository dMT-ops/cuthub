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

  // Função para determinar a cor do Heatmap
  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-transparent hover:bg-muted/50';
    if (count <= 2) return 'bg-primary/20 hover:bg-primary/30';
    if (count <= 5) return 'bg-primary/60 hover:bg-primary/70';
    return 'bg-primary hover:bg-primary/90 shadow-md';
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
                !isCurrentMonth && "bg-muted/10 opacity-50",
                today && "ring-2 ring-primary ring-inset z-10",
                "hover:bg-muted/30"
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
                    className={cn(
                      "w-full h-8 rounded-md transition-colors",
                      getHeatmapColor(count)
                    )}
                    title={`${count} agendamentos`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
