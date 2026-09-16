import { parseISO, differenceInMinutes, setHours, setMinutes } from 'date-fns';
import { CLASSES_STATUS, resumirAgendamento } from '@/lib/agendamento';
import { formatarMoeda } from '@/lib/utils';
import type { AgendamentoComDetalhes } from '@/services/agendamentos.service';
import type { Database } from '@/types/database.types';

type ConfiguracaoBarbearia = Database['public']['Tables']['configuracao_barbearia']['Row'];

const PIXELS_PER_MINUTE = 1.5; // 1 hora = 90px de altura para dar espaço respirável

interface CalendarViewProps {
  currentDate: Date;
  onAppointmentClick: (id: string) => void;
  agendamentos: AgendamentoComDetalhes[];
  configuracao?: ConfiguracaoBarbearia | null;
}

export default function CalendarView({ onAppointmentClick, agendamentos, configuracao }: CalendarViewProps) {
  // Extrair profissionais únicos dos agendamentos (visto que o filtro superior já os limita)
  // Ou melhor, AgendaHome deveria passar os profissionais. 
  // Mas como CalendarView precisa renderizar as colunas, extraímos os profissionais que têm agendamentos
  // Para uma agenda completa, o ideal é passar todos os profissionais.
  // Vou derivar os profissionais únicos dos agendamentos por simplicidade, 
  // ou se não houver nenhum, mostrar vazio.
  const profissionaisMap = new Map();
  agendamentos.forEach(a => {
    if (a.profissional) {
      profissionaisMap.set(a.profissional.id, a.profissional);
    }
  });
  const profissionais = Array.from(profissionaisMap.values());

  // Horários configuráveis
  const START_HOUR = configuracao?.horario_abertura ? parseInt(configuracao.horario_abertura.split(':')[0], 10) : 8;
  const END_HOUR = configuracao?.horario_fechamento ? parseInt(configuracao.horario_fechamento.split(':')[0], 10) : 20;

  // Gera o array de horas
  const hours = Array.from({ length: Math.max(1, END_HOUR - START_HOUR + 1) }, (_, i) => START_HOUR + i);

  if (profissionais.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
        <p>Nenhum profissional com agendamentos neste dia.</p>
        <p className="text-sm">Tente selecionar outra data ou mudar os filtros.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      {/* Grade do Calendário */}
      <div className="flex-1 flex flex-col overflow-auto">
        {/* Cabeçalho das Colunas (Profissionais) */}
        <div className="flex border-b sticky top-0 z-10 bg-background">
          <div className="w-20 border-r flex-shrink-0 bg-muted/20"></div> {/* Canto superior esquerdo vazio (Horas) */}
          {profissionais.map(prof => (
            <div key={prof.id} className="flex-1 text-center py-3 border-r font-medium min-w-[200px]">
              {prof.nome}
            </div>
          ))}
        </div>

        {/* Corpo Principal: Eixo de horas (Vertical) e Grades */}
        <div className="flex relative">
          {/* Eixo Vertical (Horas) */}
          <div className="w-20 flex-shrink-0 border-r bg-muted/10 relative">
            {hours.map((hour) => (
              <div 
                key={hour} 
                className="relative flex justify-end pr-2 text-xs text-muted-foreground"
                style={{ height: 60 * PIXELS_PER_MINUTE }}
              >
                <span className="relative -top-2">{hour.toString().padStart(2, '0')}:00</span>
              </div>
            ))}
          </div>

          {/* Grades dos Profissionais (Colunas) */}
          <div className="flex flex-1 relative bg-[url('/grid-pattern.svg')]">
            {/* Linhas horizontais guia */}
            <div className="absolute inset-0 pointer-events-none">
               {hours.map((_hour) => (
                 <div key={_hour} className="w-full border-t border-muted/50" style={{ height: 60 * PIXELS_PER_MINUTE }}></div>
               ))}
            </div>

            {/* Colunas verticais e Cards */}
            {profissionais.map(prof => (
              <div key={prof.id} className="flex-1 border-r relative min-w-[200px]">
                {/* Renderizar agendamentos deste profissional */}
                {agendamentos
                  .filter(a => a.profissional?.id === prof.id)
                  .map(agendamento => {
                    const data = parseISO(agendamento.data_hora);
                    // Baseamos a contagem a partir de START_HOUR
                    const baseDate = setMinutes(setHours(data, START_HOUR), 0);
                    const diffMinutes = differenceInMinutes(data, baseDate);
                    
                    const { nomes, precoTotal, duracaoMinutos } = resumirAgendamento(agendamento);

                    // Se o agendamento for antes do horário de abertura, o card é cortado no topo
                    const topPos = Math.max(0, diffMinutes * PIXELS_PER_MINUTE);
                    const heightPos = duracaoMinutos * PIXELS_PER_MINUTE;
                    const statusColor = CLASSES_STATUS[agendamento.status];

                    return (
                      <div 
                        key={agendamento.id}
                        className={`absolute left-1 right-1 rounded-md border-l-4 p-2 text-xs overflow-hidden cursor-pointer hover:brightness-95 transition-all shadow-sm ${statusColor}`}
                        style={{
                          top: `${topPos}px`,
                          height: `${heightPos}px`,
                        }}
                        onClick={() => onAppointmentClick(agendamento.id)}
                      >
                        <div className="font-semibold truncate">{agendamento.cliente?.nome || 'Anônimo'}</div>
                        <div className="truncate opacity-80">{nomes}</div>
                        <div className="font-medium mt-1">{formatarMoeda(precoTotal)}</div>
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
