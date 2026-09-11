import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { format, parseISO, startOfDay, endOfDay, differenceInMinutes, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Constantes da grade do calendário
const START_HOUR = 8;
const END_HOUR = 20;
const PIXELS_PER_MINUTE = 1.5; // 1 hora = 90px de altura para dar espaço respirável

type Profissional = {
  id: string;
  nome: string;
};

type Agendamento = {
  id: string;
  data_hora: string;
  status: string;
  cliente: { nome: string };
  profissional_id: string;
  servico: { nome: string; preco: number; duracao: number };
};

interface CalendarViewProps {
  currentDate: Date;
  onAppointmentClick: (id: string) => void;
  profissionalId?: string | null;
}

export default function CalendarView({ currentDate, onAppointmentClick, profissionalId }: CalendarViewProps) {
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [currentDate, profissionalId]);

  async function fetchData() {
    setLoading(true);
    try {
      // 1. Buscar profissionais da barbearia logada
      const { data: profs, error: profsError } = await supabase
        .from('profissional')
        .select('id, nome')
        .eq('status', 'ativo')
        .order('nome');
        
      if (profsError) throw profsError;
      setProfissionais(profs || []);

      // 2. Buscar agendamentos do dia atual
      let query = supabase
        .from('agendamento')
        .select(`
          id, status, data_hora, profissional_id,
          cliente ( nome ),
          agendamento_servico (
            preco_cobrado,
            servico ( nome, duracao_minutos )
          )
        `)
        .gte('data_hora', startOfDay(currentDate).toISOString())
        .lte('data_hora', endOfDay(currentDate).toISOString());

      if (profissionalId) {
        query = query.eq('profissional_id', profissionalId);
      }

      const { data: agend, error: agendError } = await query;

      if (agendError) throw agendError;

      // Transformar os dados
      const formattedAgendamentos = agend.map((a: any) => ({
        id: a.id,
        status: a.status,
        data_hora: a.data_hora,
        profissional_id: a.profissional_id,
        cliente: a.cliente,
        servico: {
          nome: a.agendamento_servico?.[0]?.servico?.nome || 'Serviço',
          preco: a.agendamento_servico?.[0]?.preco_cobrado || 0,
          duracao: a.agendamento_servico?.[0]?.servico?.duracao_minutos || 45
        }
      }));

      setAgendamentos(formattedAgendamentos);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // Gera o array de horas [8, 9, 10... 20]
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

  if (loading) return <div className="flex-1 flex items-center justify-center">Carregando calendário...</div>;

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
               {hours.map((hour, idx) => (
                 <div key={idx} className="w-full border-t border-muted/50" style={{ height: 60 * PIXELS_PER_MINUTE }}></div>
               ))}
            </div>

            {/* Colunas verticais e Cards */}
            {profissionais.map(prof => (
              <div key={prof.id} className="flex-1 border-r relative min-w-[200px]">
                {/* Renderizar agendamentos deste profissional */}
                {agendamentos
                  .filter(a => a.profissional_id === prof.id)
                  .map(agendamento => {
                    const data = parseISO(agendamento.data_hora);
                    // Baseamos a contagem a partir das 08:00 (START_HOUR)
                    const baseDate = setMinutes(setHours(data, START_HOUR), 0);
                    const diffMinutes = differenceInMinutes(data, baseDate);
                    
                    // Se o agendamento for antes das 08:00, cortamos ou ajustamos
                    const topPos = Math.max(0, diffMinutes * PIXELS_PER_MINUTE);
                    const heightPos = agendamento.servico.duracao * PIXELS_PER_MINUTE;

                    // Cor baseada no status
                    let statusColor = 'bg-primary/20 border-primary text-amber-900 dark:text-primary'; // pendente/padrão
                    if (agendamento.status === 'confirmado') statusColor = 'bg-blue-500/20 border-blue-500 text-blue-700 dark:text-blue-300';
                    if (agendamento.status === 'concluido') statusColor = 'bg-green-500/20 border-green-500 text-green-700 dark:text-green-300';
                    if (agendamento.status === 'cancelado') statusColor = 'bg-red-500/20 border-red-500 text-red-700 dark:text-red-300 opacity-60';

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
                        <div className="truncate opacity-80">{agendamento.servico.nome}</div>
                        <div className="font-medium mt-1">R$ {agendamento.servico.preco}</div>
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
