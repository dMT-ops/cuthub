import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface AppointmentDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agendamento: any; // We'll refine this type
  onUpdateStatus: (id: string, newStatus: string) => Promise<void>;
}

export function AppointmentDetailsDrawer({ 
  open, 
  onOpenChange, 
  agendamento,
  onUpdateStatus
}: AppointmentDetailsDrawerProps) {
  if (!agendamento) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-xl">Detalhes do Agendamento</SheetTitle>
          <SheetDescription>
            Informações e ações rápidas
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {/* Cliente Info */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Cliente</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                {agendamento.cliente?.nome?.charAt(0) || "A"}
              </div>
              <div>
                <p className="font-semibold text-foreground text-lg">{agendamento.cliente?.nome || "Cliente não informado"}</p>
                <p className="text-xs text-muted-foreground">Adicionado em {format(new Date(agendamento.data_hora), "dd/MM/yyyy")}</p>
              </div>
            </div>
          </div>

          <hr />

          {/* Dados do Agendamento */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Serviço</h3>
              <p className="font-medium">{agendamento.servico?.nome}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Profissional</h3>
              <p className="font-medium">{agendamento.profissional?.nome || 'Não atribuído'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Data e Hora</h3>
              <p className="font-medium capitalize">
                {format(new Date(agendamento.data_hora), "dd MMM, HH:mm", { locale: ptBR })}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Duração</h3>
              <p className="font-medium">{agendamento.servico?.duracao} min</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Valor</h3>
              <p className="font-medium text-primary">R$ {agendamento.servico?.preco?.toFixed(2)}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Status Atual</h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize
                ${agendamento.status === 'pendente' ? 'bg-primary/20 text-primary-foreground' : ''}
                ${agendamento.status === 'confirmado' ? 'bg-blue-500/20 text-blue-500' : ''}
                ${agendamento.status === 'concluido' ? 'bg-green-500/20 text-green-500' : ''}
                ${agendamento.status === 'cancelado' ? 'bg-red-500/20 text-red-500' : ''}
              `}>
                {agendamento.status}
              </span>
            </div>
          </div>

          <hr />

          {/* Ações */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-medium text-muted-foreground">Ações Rápidas</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                className="w-full text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                onClick={() => onUpdateStatus(agendamento.id, 'confirmado')}
                disabled={agendamento.status === 'confirmado'}
              >
                Confirmar
              </Button>
              <Button 
                variant="outline" 
                className="w-full text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                onClick={() => onUpdateStatus(agendamento.id, 'concluido')}
                disabled={agendamento.status === 'concluido'}
              >
                Concluir
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => onUpdateStatus(agendamento.id, 'pendente')}
                disabled={agendamento.status === 'pendente'}
              >
                Tornar Pendente
              </Button>
              <Button 
                variant="outline" 
                className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                onClick={() => onUpdateStatus(agendamento.id, 'cancelado')}
                disabled={agendamento.status === 'cancelado'}
              >
                Cancelar (Falta)
              </Button>
            </div>
            
            <Button variant="secondary" className="w-full mt-4">
              Editar Agendamento (Reagendar)
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
