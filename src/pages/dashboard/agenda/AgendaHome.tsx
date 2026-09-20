import { useState, useMemo } from 'react';
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
  CalendarRange,
  CalendarOff,
  Clock
} from 'lucide-react';
import { 
  format, 
  isValid, parseISO,
  addDays, subDays, 
  addWeeks, subWeeks, 
  addMonths, subMonths, 
  addYears, subYears,
  startOfDay, endOfDay,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  startOfYear, endOfYear
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

import CalendarView from '@/components/agenda/CalendarView';
import KanbanView from '@/components/agenda/KanbanView';
import ListView from '@/components/agenda/ListView';
import MonthlyView from '@/components/agenda/MonthlyView';
import YearlyView from '@/components/agenda/YearlyView';
import WeeklyView from '@/components/agenda/WeeklyView';
import { AppointmentDetailsDrawer } from '@/components/agenda/AppointmentDetailsDrawer';
import { NewAppointmentModal } from '@/components/agenda/NewAppointmentModal';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuCheckboxItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/AuthContext';
import { FolgasDialog } from '@/components/agenda/FolgasDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { JornadaTrabalho } from '@/components/profissionais/JornadaTrabalho';
import { useProfissionais } from '@/hooks/useProfissionais';
import { useAgendamentos } from '@/hooks/useAgendamentos';
import { useBarbeariaAtual } from '@/hooks/useBarbeariaAtual';
import { resumirAgendamento } from '@/lib/agendamento';
import { formatarMoeda } from '@/lib/utils';
import type { Database } from '@/types/database.types';

type StatusAgendamento = Database['public']['Enums']['status_agendamento'];

type ViewMode = 'calendar' | 'weekly' | 'monthly' | 'yearly' | 'list' | 'kanban';

export default function AgendaHome() {
  const { barbeariaId } = useAuth();
  // A Dashboard abre a agenda já posicionada: ?data=YYYY-MM-DD&agendamento=<id>
  const [searchParams] = useSearchParams();
  const dataInicial = searchParams.get('data');
  const agendamentoInicial = searchParams.get('agendamento');

  const [view, setView] = useState<ViewMode>('calendar');
  const [currentDate, setCurrentDate] = useState(() => {
    if (!dataInicial) return new Date();
    const parsed = parseISO(dataInicial);
    return isValid(parsed) ? parsed : new Date();
  });
  
  // Modais e Drawers
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [folgasAbertas, setFolgasAbertas] = useState(false);
  const [jornadaAberta, setJornadaAberta] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(agendamentoInicial);

  // Filtros
  const [busca, setBusca] = useState('');
  const [selectedProfissionalId, setSelectedProfissionalId] = useState<string | null>(null); // null = Todos
  const { profissionais } = useProfissionais(barbeariaId, { status: 'ativo' });

  // Para o barbeiro, a folga e sempre a dele; para o gestor, e a do
  // profissional filtrado na barra. Sem filtro, o gestor escolhe primeiro --
  // bloquear "todos" de uma vez seria fechar a casa, que e outra coisa.
  const { tipo: tipoDeUsuario, perfil } = useAuth();
  const ehProfissional = tipoDeUsuario === 'profissional';
  const fichaDoUsuario = useMemo(
    () => profissionais.find((p) => p.usuario_id === perfil?.id) ?? null,
    [profissionais, perfil]
  );
  const profissionalDaFolga = ehProfissional ? (fichaDoUsuario?.id ?? null) : selectedProfissionalId;
  const { configuracao } = useBarbeariaAtual();

  // Calcular Range de Datas baseado na View
  const dateRange = useMemo(() => {
    switch (view) {
      case 'yearly':
        return { start: startOfYear(currentDate).toISOString(), end: endOfYear(currentDate).toISOString() };
      case 'monthly':
        return { start: startOfMonth(currentDate).toISOString(), end: endOfMonth(currentDate).toISOString() };
      case 'weekly':
        return { start: startOfWeek(currentDate, { weekStartsOn: 1 }).toISOString(), end: endOfWeek(currentDate, { weekStartsOn: 1 }).toISOString() };
      default: // calendar, kanban, list
        return { start: startOfDay(currentDate).toISOString(), end: endOfDay(currentDate).toISOString() };
    }
  }, [view, currentDate]);

  // Buscar Agendamentos Centralizado
  const {
    agendamentos,
    isLoading,
    isError,
    error,
    atualizarStatus,
    isAtualizando,
    cancelarAgendamento,
    isCancelando,
    excluirAgendamento,
    isExcluindo,
  } = useAgendamentos(barbeariaId, dateRange.start, dateRange.end);

  const handlePrevDate = () => {
    switch (view) {
      case 'yearly': setCurrentDate(subYears(currentDate, 1)); break;
      case 'monthly': setCurrentDate(subMonths(currentDate, 1)); break;
      case 'weekly': setCurrentDate(subWeeks(currentDate, 1)); break;
      default: setCurrentDate(subDays(currentDate, 1)); break;
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

  // Filtrar em memória por profissional e por nome do cliente
  const filteredAgendamentos = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return agendamentos.filter(a => {
      if (selectedProfissionalId && a.profissional?.id !== selectedProfissionalId) return false;
      if (termo && !(a.cliente?.nome || '').toLowerCase().includes(termo)) return false;
      return true;
    });
  }, [agendamentos, selectedProfissionalId, busca]);

  // Calcular KPIs com dados reais
  const kpis = useMemo(() => {
    return filteredAgendamentos.reduce(
      (acc, curr) => {
        acc.total += 1;
        if (curr.status === 'confirmado' || curr.status === 'em_atendimento') acc.confirmados += 1;
        if (curr.status === 'pendente') acc.pendentes += 1;
        if (curr.status === 'concluido') acc.concluidos += 1;
        
        // Faturamento previsto (excluindo cancelados/faltou), somando todos os serviços
        if (curr.status !== 'cancelado' && curr.status !== 'faltou') {
          acc.faturamentoPrevisto += resumirAgendamento(curr).precoTotal;
        }
        return acc;
      },
      { total: 0, confirmados: 0, pendentes: 0, concluidos: 0, faturamentoPrevisto: 0 }
    );
  }, [filteredAgendamentos]);

  // Evita NaN% quando o período não tem nenhum agendamento
  const percentual = (valor: number) => (kpis.total === 0 ? 0 : Math.round((valor / kpis.total) * 100));

  const agendamentoSelecionado = useMemo(
    () => filteredAgendamentos.find(a => a.id === selectedAppointmentId) ?? null,
    [filteredAgendamentos, selectedAppointmentId]
  );

  const handleUpdateStatus = async (id: string, novoStatus: StatusAgendamento) => {
    try {
      await atualizarStatus({ id, status: novoStatus });
      toast.success('Status atualizado.');
      setSelectedAppointmentId(null);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar o status do agendamento');
    }
  };

  const handleExcluir = async (id: string) => {
    try {
      await excluirAgendamento(id);
      toast.success('Agendamento excluído.');
      setSelectedAppointmentId(null);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir o agendamento');
    }
  };

  const handleCancelar = async (id: string) => {
    try {
      await cancelarAgendamento({ id, canceladoPorId: 'owner' });
      toast.success('Agendamento cancelado.');
      setSelectedAppointmentId(null);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao cancelar o agendamento');
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
              {percentual(kpis.confirmados)}%
            </span>
          </div>
          <div className="text-2xl font-bold">{kpis.confirmados}</div>
          <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
            <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${percentual(kpis.confirmados)}%` }} />
          </div>
        </div>

        {/* Pendentes */}
        <div className="bg-card border rounded-lg p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex justify-between items-center mb-1">
            <p className="text-sm font-medium text-muted-foreground">Pendentes</p>
            <span className="text-primary font-medium text-xs bg-primary/10 px-2 py-0.5 rounded-full">
              {percentual(kpis.pendentes)}%
            </span>
          </div>
          <div className="text-2xl font-bold">{kpis.pendentes}</div>
          <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
            <div className="bg-primary h-1.5 rounded-full transition-all duration-1000" style={{ width: `${percentual(kpis.pendentes)}%` }} />
          </div>
        </div>

        {/* Concluídos */}
        <div className="bg-card border rounded-lg p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex justify-between items-center mb-1">
            <p className="text-sm font-medium text-muted-foreground">Concluídos</p>
            <span className="text-green-500 font-medium text-xs bg-green-500/10 px-2 py-0.5 rounded-full">
              {percentual(kpis.concluidos)}%
            </span>
          </div>
          <div className="text-2xl font-bold">{kpis.concluidos}</div>
          <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
            <div className="bg-green-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${percentual(kpis.concluidos)}%` }} />
          </div>
        </div>

        {/* Faturamento */}
        <div className="bg-card border-l-4 border-l-primary rounded-lg p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <p className="text-sm font-medium text-muted-foreground">Faturamento Previsto</p>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {formatarMoeda(kpis.faturamentoPrevisto)}
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
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
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

          <div className="flex items-center gap-2">
            <span
              title={
                profissionalDaFolga
                  ? undefined
                  : 'Escolha um profissional no filtro para marcar a folga dele'
              }
            >
              <Button
                variant="outline"
                className="gap-2"
                disabled={!profissionalDaFolga}
                onClick={() => setFolgasAbertas(true)}
              >
                <CalendarOff size={16} />
                {ehProfissional ? 'Minhas folgas' : 'Folgas'}
              </Button>
            </span>
            {/* A jornada do barbeiro morava so na aba Profissionais, que ele
                nao acessa desde a F8.3 -- o banco aceitava o pedido dele e nao
                existia caminho ate la. Este botao e o caminho. */}
            {ehProfissional && (
              <Button variant="outline" className="gap-2" onClick={() => setJornadaAberta(true)}>
                <Clock size={16} />
                Minha jornada
              </Button>
            )}
            {!ehProfissional && (
              <Button onClick={() => setIsNewModalOpen(true)} className="gap-2">
                <Plus size={16} />
                Novo Agendamento
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main View Area */}
        <div className="flex-1 overflow-hidden bg-card border rounded-lg flex flex-col shadow-sm">
          {isError ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <p className="font-semibold">Não foi possível carregar a agenda</p>
              <p className="text-sm text-muted-foreground mt-1">
                {(error as Error)?.message || 'Erro desconhecido ao consultar os agendamentos.'}
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
              Carregando agenda...
            </div>
          ) : (
            <>
              {view === 'calendar' && (
                <CalendarView 
                  currentDate={currentDate} 
                  onAppointmentClick={(id) => setSelectedAppointmentId(id)}
                  agendamentos={filteredAgendamentos}
                  configuracao={configuracao}
                />
              )}
              {view === 'monthly' && (
                <MonthlyView 
                  currentDate={currentDate} 
                  onDateClick={(date) => {
                    setCurrentDate(date);
                    setView('calendar');
                  }} 
                  agendamentos={filteredAgendamentos}
                />
              )}
              {view === 'yearly' && (
                <YearlyView 
                  currentDate={currentDate} 
                  onDateClick={(date) => {
                    setCurrentDate(date);
                    setView('calendar');
                  }}
                  agendamentos={filteredAgendamentos}
                />
              )}
              {view === 'weekly' && (
                <WeeklyView 
                  currentDate={currentDate}
                  onAppointmentClick={(id) => setSelectedAppointmentId(id)}
                  agendamentos={filteredAgendamentos}
                  configuracao={configuracao}
                />
              )}
              {view === 'kanban' && (
                <KanbanView 
                  agendamentos={filteredAgendamentos} 
                  onStatusChange={handleUpdateStatus}
                />
              )}
              {view === 'list' && (
                <ListView 
                  agendamentos={filteredAgendamentos} 
                  onAppointmentClick={(id) => setSelectedAppointmentId(id)}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Overlays / Modais */}
      <NewAppointmentModal 
        open={isNewModalOpen} 
        onOpenChange={setIsNewModalOpen} 
        selectedDate={currentDate}
      />
      
      <AppointmentDetailsDrawer
        open={!!agendamentoSelecionado}
        onOpenChange={(open) => !open && setSelectedAppointmentId(null)}
        agendamento={agendamentoSelecionado}
        onUpdateStatus={handleUpdateStatus}
        onCancelar={handleCancelar}
        onExcluir={handleExcluir}
        isSalvando={isAtualizando || isCancelando || isExcluindo}
      />

      <FolgasDialog
        open={folgasAbertas}
        onOpenChange={setFolgasAbertas}
        profissionalId={profissionalDaFolga}
        profissionalNome={profissionais.find((p) => p.id === profissionalDaFolga)?.nome}
      />

      <Dialog open={jornadaAberta} onOpenChange={setJornadaAberta}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Minha jornada</DialogTitle>
          </DialogHeader>
          {profissionalDaFolga && <JornadaTrabalho profissionalId={profissionalDaFolga} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
