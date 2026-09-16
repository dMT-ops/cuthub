import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, Phone, Scissors, User } from 'lucide-react';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { AgendamentoComDetalhes } from '@/services/agendamentos.service';
import type { Database } from '@/types/database.types';
import { CLASSES_STATUS, ROTULO_STATUS, resumirAgendamento } from '@/lib/agendamento';
import { formatarMoeda } from '@/lib/utils';

type StatusAgendamento = Database['public']['Enums']['status_agendamento'];

interface AppointmentDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agendamento: AgendamentoComDetalhes | null;
  onUpdateStatus: (id: string, novoStatus: StatusAgendamento) => Promise<void>;
  onCancelar: (id: string) => Promise<void>;
  isSalvando?: boolean;
}

/** Transições oferecidas a partir do status atual */
const PROXIMOS_STATUS: Record<StatusAgendamento, StatusAgendamento[]> = {
  pendente: ['confirmado', 'em_atendimento', 'faltou'],
  confirmado: ['em_atendimento', 'concluido', 'faltou'],
  em_atendimento: ['concluido'],
  concluido: [],
  cancelado: ['pendente'],
  faltou: ['pendente'],
};

export function AppointmentDetailsDrawer({
  open,
  onOpenChange,
  agendamento,
  onUpdateStatus,
  onCancelar,
  isSalvando,
}: AppointmentDetailsDrawerProps) {
  if (!agendamento) return null;

  const { precoTotal, duracaoMinutos } = resumirAgendamento(agendamento);
  const inicio = new Date(agendamento.data_hora);
  const fim = new Date(agendamento.data_hora_fim);
  const transicoes = PROXIMOS_STATUS[agendamento.status] ?? [];
  const podeCancelar = agendamento.status !== 'cancelado' && agendamento.status !== 'concluido';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="text-xl">Detalhes do Agendamento</SheetTitle>
            <span
              className={`inline-flex items-center rounded-full border-l-4 px-2.5 py-0.5 text-xs font-semibold ${CLASSES_STATUS[agendamento.status]}`}
            >
              {ROTULO_STATUS[agendamento.status]}
            </span>
          </div>
          <SheetDescription className="capitalize">
            {format(inicio, "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {/* Cliente */}
          <section>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Cliente</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                {agendamento.cliente?.nome?.charAt(0)?.toUpperCase() || <User className="h-4 w-4" />}
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {agendamento.cliente?.nome || 'Cliente não informado'}
                </p>
                {agendamento.cliente?.telefone && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {agendamento.cliente.telefone}
                  </p>
                )}
              </div>
            </div>
          </section>

          <Separator />

          {/* Serviços */}
          <section className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              {agendamento.agendamento_servico.length > 1 ? 'Serviços' : 'Serviço'}
            </h3>
            <ul className="space-y-1">
              {agendamento.agendamento_servico.map((item, i) => (
                <li key={item.servico?.id ?? i} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Scissors className="h-3.5 w-3.5 text-muted-foreground" />
                    {item.servico?.nome ?? 'Serviço removido do catálogo'}
                  </span>
                  <span className="font-medium">{formatarMoeda(Number(item.preco_cobrado))}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t pt-2 text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold text-primary">{formatarMoeda(precoTotal)}</span>
            </div>
          </section>

          <Separator />

          {/* Dados do atendimento */}
          <section className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Profissional</h3>
              <p className="font-medium">{agendamento.profissional?.nome || 'Não atribuído'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Duração</h3>
              <p className="font-medium flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {duracaoMinutos} min
              </p>
            </div>
            <div className="col-span-2">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Janela</h3>
              <p className="font-medium">
                {format(inicio, 'HH:mm')} — {format(fim, 'HH:mm')}
              </p>
            </div>
            {agendamento.observacoes && (
              <div className="col-span-2">
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Observações</h3>
                <p className="text-sm whitespace-pre-wrap">{agendamento.observacoes}</p>
              </div>
            )}
          </section>

          <Separator />

          {/* Ações */}
          <section className="space-y-3 pb-6">
            <h3 className="text-sm font-medium text-muted-foreground">Mudar status</h3>
            {transicoes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Este agendamento está concluído e não aceita novas transições.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {transicoes.map((status) => (
                  <Button
                    key={status}
                    variant="outline"
                    className="w-full"
                    disabled={isSalvando}
                    onClick={() => onUpdateStatus(agendamento.id, status)}
                  >
                    {ROTULO_STATUS[status]}
                  </Button>
                ))}
              </div>
            )}

            {podeCancelar && (
              <Button
                variant="destructive"
                className="w-full"
                disabled={isSalvando}
                onClick={() => onCancelar(agendamento.id)}
              >
                Cancelar agendamento
              </Button>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
