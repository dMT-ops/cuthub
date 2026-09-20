import { useMemo } from 'react';
import { 
  startOfYear, 
  endOfYear, 
  eachMonthOfInterval,
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isToday, 
  format,
  startOfWeek,
  endOfWeek
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { AgendamentoComDetalhes } from '@/services/agendamentos.service';

interface YearlyViewProps {
  currentDate: Date;
  onDateClick: (date: Date) => void;
  agendamentos: AgendamentoComDetalhes[];
}

export default function YearlyView({ currentDate, onDateClick, agendamentos }: YearlyViewProps) {
  const yearStart = startOfYear(currentDate);
  const yearEnd = endOfYear(currentDate);
  const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });
  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  const counts = useMemo(() => {
    const newCounts: Record<string, number> = {};
    agendamentos.forEach((ag) => {
      if (ag.status !== 'cancelado') {
        const dStr = ag.data_hora.split('T')[0];
        newCounts[dStr] = (newCounts[dStr] || 0) + 1;
      }
    });
    return newCounts;
  }, [agendamentos]);

  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'text-foreground hover:bg-muted';
    if (count <= 2) return 'bg-primary/30 text-primary-foreground font-bold hover:bg-primary/40';
    if (count <= 5) return 'bg-primary/60 text-primary-foreground font-bold hover:bg-primary/70';
    return 'bg-primary text-primary-foreground font-bold shadow-md hover:bg-primary/90';
  };

  return (
    <div className="h-full overflow-y-auto pr-2 pb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {months.map((month) => {
          const monthStartDay = startOfMonth(month);
          const monthEndDay = endOfMonth(month);
          const startDate = startOfWeek(monthStartDay, { weekStartsOn: 0 }); 
          const endDate = endOfWeek(monthEndDay, { weekStartsOn: 0 });
          const days = eachDayOfInterval({ start: startDate, end: endDate });

          return (
            <div key={month.toString()} className="bg-card rounded-xl border p-4 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-lg font-bold mb-4 capitalize px-2 flex justify-between items-center">
                {format(month, 'MMMM', { locale: ptBR })}
                <span className="text-xs text-muted-foreground font-normal">
                  {days.filter(d => isSameMonth(d, month) && (counts[format(d, 'yyyy-MM-dd')] || 0) > 0).length} dias ativos
                </span>
              </h3>
              
              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map((wd, i) => (
                  <div key={`${month}-${i}`} className="text-center text-xs font-semibold text-muted-foreground">
                    {wd}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1">
                {days.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const count = counts[dateStr] || 0;
                  const isCurrentMonth = isSameMonth(day, monthStartDay);
                  const today = isToday(day);

                  if (!isCurrentMonth) {
                    return <div key={`empty-${day}`} className="h-8 w-8" />;
                  }

                  return (
                    <div 
                      key={day.toString()}
                      onClick={() => onDateClick(day)}
                      title={`${format(day, "dd 'de' MMMM", { locale: ptBR })}: ${count} agendamentos`}
                      className={cn(
                        "h-8 w-8 mx-auto flex items-center justify-center rounded-md text-sm cursor-pointer transition-colors",
                        getHeatmapColor(count),
                        today && "ring-2 ring-primary ring-offset-1 ring-offset-background"
                      )}
                    >
                      {format(day, 'd')}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
