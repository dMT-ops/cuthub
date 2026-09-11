import { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  LayoutTemplate, 
  List, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Search,
  Filter,
  CalendarDays,
  CalendarRange
} from 'lucide-react';
import { 
  format, 
  addDays, subDays, 
  addWeeks, subWeeks, 
  addMonths, subMonths, 
  addYears, subYears 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

import CalendarView from './components/CalendarView';
import KanbanView from './components/KanbanView';
import MonthlyView from './components/MonthlyView';
import YearlyView from './components/YearlyView';
import WeeklyView from './components/WeeklyView';
import { AppointmentDetailsDrawer } from './components/AppointmentDetailsDrawer';
import { NewAppointmentModal } from './components/NewAppointmentModal';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuCheckboxItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

type ViewMode = 'calendar' | 'weekly' | 'monthly' | 'yearly' | 'list' | 'kanban';

export default function AgendaHome() {
  const [view, setView] = useState<ViewMode>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Modais e Drawers
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);

  // Filtros
  const [profissionais, setProfissionais] = useState<{ id: string; nome: string }[]>([]);
  const [selectedProfissionalId, setSelectedProfissionalId] = useState<string | null>(null); // null = Todos

  // Buscar profissionais para o filtro
  useEffect(() => {
    async function fetchProfs() {
      const { data } = await supabase.from('profissional').select('id, nome');
      if (data) setProfissionais(data);
    }
    fetchProfs();
  }, []);
  
  const handlePrevDate = () => {
    switch (view) {
      case 'yearly': setCurrentDate(subYears(currentDate, 1)); break;
      case 'monthly': setCurrentDate(subMonths(currentDate, 1)); break;
      case 'weekly': setCurrentDate(subWeeks(currentDate, 1)); break;
      default: setCurrentDate(subDays(currentDate, 1)); break; // calendar, list, kanban
    }
  };

  const handleNextDate = () => {
    switch (view) {
      case 'yearly': setCurrentDate(addYears(currentDate, 1)); break;
      case 'monthly': setCurrentDate(addMonths(currentDate, 1)); break;
      case 'weekly': setCurrentDate(addWeeks(currentDate, 1)); break;
      default: setCurrentDate(addDays(currentDate, 1)); break;
    }
  };

  // Dados simulados de KPI (Futuramente virão de um useEffect global)
  const kpis = {
    total: 12,
    confirmados: 8,
    pendentes: 2,
    concluidos: 2,
    faturamentoPrevisto: 650.00
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    // Atualização otimista viria aqui
    const { error } = await supabase.from('agendamento').update({ status: newStatus }).eq('id', id);
    if (!error) {
      setSelectedAppointmentId(null); // Fecha o drawer após agir
      // trigger refetch nos componentes filhos (ideal usar React Query ou Contexto)
    }
  };

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col space-y-4">
      {/* 1. KPIs Visuais (Gráficos / Barras de Progresso) */}
      <div className="grid grid-cols-5 gap-4">
        {/* Total */}
        <div className="bg-card border rounded-lg p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <p className="text-sm font-medium text-muted-foreground">Total de Agendamentos</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold">{kpis.total}</span>
            <span className="text-xs text-muted-foreground">Hoje</span>
          </div>
        </div>

        {/* Confirmados */}
        <div className="bg-card border rounded-lg p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex justify-between items-center mb-1">
            <p className="text-sm font-medium text-muted-foreground">Confirmados</p>
            <span className="text-blue-500 font-medium text-xs bg-blue-500/10 px-2 py-0.5 rounded-full">
              {Math.round((kpis.confirmados / kpis.total) * 100)}%
            </span>
          </div>
          <div className="text-2xl font-bold">{kpis.confirmados}</div>
          <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
            <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${(kpis.confirmados / kpis.total) * 100}%` }} />
          </div>
        </div>

        {/* Pendentes */}
        <div className="bg-card border rounded-lg p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex justify-between items-center mb-1">
            <p className="text-sm font-medium text-muted-foreground">Pendentes</p>
            <span className="text-primary font-medium text-xs bg-primary/10 px-2 py-0.5 rounded-full">
              {Math.round((kpis.pendentes / kpis.total) * 100)}%
            </span>
          </div>
          <div className="text-2xl font-bold">{kpis.pendentes}</div>
          <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
            <div className="bg-primary h-1.5 rounded-full transition-all duration-1000" style={{ width: `${(kpis.pendentes / kpis.total) * 100}%` }} />
          </div>
        </div>

        {/* Concluídos */}
        <div className="bg-card border rounded-lg p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex justify-between items-center mb-1">
            <p className="text-sm font-medium text-muted-foreground">Concluídos</p>
            <span className="text-green-500 font-medium text-xs bg-green-500/10 px-2 py-0.5 rounded-full">
              {Math.round((kpis.concluidos / kpis.total) * 100)}%
            </span>
          </div>
          <div className="text-2xl font-bold">{kpis.concluidos}</div>
          <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
            <div className="bg-green-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${(kpis.concluidos / kpis.total) * 100}%` }} />
          </div>
        </div>

        {/* Faturamento */}
        <div className="bg-card border-l-4 border-l-primary rounded-lg p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <p className="text-sm font-medium text-muted-foreground">Faturamento Previsto</p>
          <div className="mt-2 text-2xl font-bold text-foreground">
            R$ {kpis.faturamentoPrevisto.toFixed(2)}
          </div>
        </div>
      </div>

      {/* 2. Barra de Ferramentas Principal */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border bg-background">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-r-none"
              onClick={handlePrevDate}
            >
              <ChevronLeft size={16} />
            </Button>
            
            <div className="flex items-center px-4 font-medium text-sm w-48 justify-center cursor-pointer hover:text-primary transition-colors"
              onClick={() => setCurrentDate(new Date())}
              title="Voltar para Hoje"
            >
              <CalendarIcon size={16} className="mr-2 text-muted-foreground" />
              <span className="capitalize">
                {view === 'yearly' && format(currentDate, "yyyy", { locale: ptBR })}
                {view === 'monthly' && format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
                {view === 'weekly' && format(currentDate, "'Semana de' dd MMM", { locale: ptBR })}
                {(view === 'calendar' || view === 'kanban' || view === 'list') && format(currentDate, "dd 'de' MMM", { locale: ptBR })}
              </span>
            </div>

            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-l-none"
              onClick={handleNextDate}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Busca e Filtros */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Buscar cliente..." 
              className="h-9 w-64 rounded-md border bg-background pl-9 pr-4 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant={selectedProfissionalId ? "default" : "outline"} size="icon" className="h-9 w-9">
                <Filter size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Filtrar Profissionais</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem 
                checked={selectedProfissionalId === null}
                onCheckedChange={() => setSelectedProfissionalId(null)}
              >
                Todos os Profissionais
              </DropdownMenuCheckboxItem>
              {profissionais.map(p => (
                <DropdownMenuCheckboxItem 
                  key={p.id}
                  checked={selectedProfissionalId === p.id}
                  onCheckedChange={() => setSelectedProfissionalId(p.id)}
                >
                  {p.nome}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Seletor de View - Separados por Categoria */}
          <div className="flex items-center gap-3">
            {/* Categoria 1: Navegação Temporal */}
            <div className="flex items-center bg-muted p-1 rounded-md overflow-x-auto shadow-inner">
              <button
                onClick={() => setView('calendar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-sm font-medium transition-all ${
                  view === 'calendar' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <CalendarIcon size={14} />
                Dia
              </button>
              <button
                onClick={() => setView('weekly')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-sm font-medium transition-all ${
                  view === 'weekly' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <CalendarDays size={14} />
                Semana
              </button>
              <button
                onClick={() => setView('monthly')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-sm font-medium transition-all ${
                  view === 'monthly' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <CalendarRange size={14} />
                Mês
              </button>
              <button
                onClick={() => setView('yearly')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-sm font-medium transition-all ${
                  view === 'yearly' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <LayoutTemplate size={14} />
                Ano
              </button>
            </div>

            {/* Categoria 2: Formatos Operacionais */}
            <div className="flex items-center bg-muted p-1 rounded-md shadow-inner">
              <button
                onClick={() => setView('kanban')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-sm font-medium transition-all ${
                  view === 'kanban' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <LayoutTemplate size={14} />
                Kanban
              </button>
              <button
                onClick={() => setView('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-sm font-medium transition-all ${
                  view === 'list' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <List size={14} />
                Lista
              </button>
            </div>
          </div>

          <Button onClick={() => setIsNewModalOpen(true)} className="gap-2">
            <Plus size={16} />
            Novo Agendamento
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main View Area */}
        <div className="flex-1 overflow-hidden bg-card border rounded-lg flex flex-col shadow-sm">
          {view === 'calendar' && (
            <CalendarView 
              currentDate={currentDate} 
              onAppointmentClick={(id) => setSelectedAppointmentId(id)}
              profissionalId={selectedProfissionalId}
            />
          )}
          {view === 'monthly' && (
            <MonthlyView 
              currentDate={currentDate} 
              onDateClick={(date) => {
                setCurrentDate(date);
                setView('calendar');
              }} 
              profissionalId={selectedProfissionalId}
            />
          )}
          {view === 'yearly' && (
            <YearlyView 
              currentDate={currentDate} 
              onDateClick={(date) => {
                setCurrentDate(date);
                setView('calendar');
              }}
              profissionalId={selectedProfissionalId}
            />
          )}
          {view === 'weekly' && (
            <WeeklyView 
              currentDate={currentDate}
              onAppointmentClick={(id) => setSelectedAppointmentId(id)}
              profissionalId={selectedProfissionalId}
            />
          )}
          {view === 'kanban' && <KanbanView currentDate={currentDate} profissionalId={selectedProfissionalId} />}
          {view === 'list' && <div className="p-8 text-center text-muted-foreground">Visão de Lista em construção</div>}
        </div>
      </div>

      {/* Overlays / Modais */}
      <NewAppointmentModal 
        open={isNewModalOpen} 
        onOpenChange={setIsNewModalOpen} 
        selectedDate={currentDate}
      />
      
      {/* Drawer de Detalhes será montado aqui para manter a performance, buscaremos os dados do agendamento específico ou passaremos inteiro via Context/State */}
      {/* OBS: Temporariamente passaremos um objeto fake para demonstrar, mas você o conectaria ao 'agendamentos.find(id)' */}
      <AppointmentDetailsDrawer
        open={!!selectedAppointmentId}
        onOpenChange={(open) => !open && setSelectedAppointmentId(null)}
        agendamento={
          selectedAppointmentId ? {
            id: selectedAppointmentId,
            status: 'pendente',
            data_hora: new Date().toISOString(),
            cliente: { nome: 'Cliente Demonstração' },
            profissional: { nome: 'João Barber' },
            servico: { nome: 'Corte Degradê', preco: 45.0, duracao: 45 }
          } : null
        }
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
}
