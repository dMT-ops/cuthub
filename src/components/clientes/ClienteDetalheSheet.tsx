import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useClienteDetalhes, useClientes } from '@/hooks/useClientes';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Edit, Power, Calendar, DollarSign, User, Activity, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

interface ClienteDetalheSheetProps {
  clienteId: string | null;
  onClose: () => void;
  onEdit: (cliente: any) => void;
  barbeariaId: string | null;
}

export function ClienteDetalheSheet({ clienteId, onClose, onEdit, barbeariaId }: ClienteDetalheSheetProps) {
  const { data: detalhes, isLoading, isError } = useClienteDetalhes(clienteId);
  const { alternarStatus, verificarAgendamentoFuturo } = useClientes(barbeariaId);

  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; message: string; payload: any } | null>(null);

  if (!clienteId) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (isoString: string | null) => {
    if (!isoString) return '-';
    return format(parseISO(isoString), "dd MMM yyyy", { locale: ptBR });
  };

  const execStatusToggle = async (novoStatus: 'ativo' | 'inativo') => {
    try {
      await alternarStatus({ id: clienteId, status: novoStatus });
      toast.success(`Cliente ${novoStatus === 'inativo' ? 'inativado' : 'reativado'} com sucesso.`);
    } catch (error: any) {
      toast.error(error.message || 'Falha ao alterar o status.');
    } finally {
      setConfirmDialog(null);
    }
  };

  const handleToggleStatus = async () => {
    if (!detalhes) return;
    
    try {
      const isAtivo = detalhes.cliente.status === 'ativo';
      const novoStatus = isAtivo ? 'inativo' : 'ativo';

      if (isAtivo) {
        // Checar agendamentos futuros antes de inativar
        const temFuturo = await verificarAgendamentoFuturo(clienteId);
        if (temFuturo) {
          const msg = "Este cliente possui agendamentos futuros marcados. Inativá-lo impedirá que ele receba novos agendamentos, mas os atuais continuarão existindo. Deseja inativar mesmo assim?";
          setConfirmDialog({
            open: true,
            title: "Atenção: Agendamentos Futuros",
            message: msg,
            payload: novoStatus
          });
          return;
        } else {
          setConfirmDialog({
            open: true,
            title: "Confirmar Inativação",
            message: "Deseja realmente inativar este cliente? O histórico será mantido.",
            payload: novoStatus
          });
          return;
        }
      }

      // Reativar direto ou com confirm? O req fala de inativar.
      await execStatusToggle(novoStatus);
    } catch (error: any) {
      toast.error(error.message || 'Falha ao verificar status.');
    }
  };

  return (
    <>
      <Sheet open={!!clienteId} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
              Carregando detalhes...
            </div>
          ) : isError || !detalhes ? (
            <div className="flex flex-col items-center justify-center h-full text-destructive">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p>Falha ao carregar os dados.</p>
            </div>
          ) : (
            <div className="space-y-6 pt-4">
              <SheetHeader className="pb-4 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <SheetTitle className="text-2xl">{detalhes.cliente.nome}</SheetTitle>
                    <SheetDescription className="mt-1 flex gap-2 items-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        detalhes.cliente.status === 'ativo' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {detalhes.cliente.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </span>
                      {detalhes.cliente.telefone}
                    </SheetDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => onEdit(detalhes.cliente)} title="Editar">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={handleToggleStatus} title={detalhes.cliente.status === 'ativo' ? "Inativar" : "Reativar"}>
                      <Power className={`h-4 w-4 ${detalhes.cliente.status === 'ativo' ? 'text-destructive' : 'text-green-600'}`} />
                    </Button>
                  </div>
                </div>
              </SheetHeader>

              {/* Contatos e Info */}
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>E-mail: {detalhes.cliente.email || '-'}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Nascimento: {formatDate(detalhes.cliente.data_nascimento)}</span>
                </div>
                {detalhes.cliente.observacoes && (
                  <div className="mt-2 p-3 bg-muted rounded-md text-sm">
                    <strong>Obs:</strong> {detalhes.cliente.observacoes}
                  </div>
                )}
              </div>

              {/* Métricas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg bg-card">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Activity className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase">Atendimentos</span>
                  </div>
                  <p className="text-2xl font-bold">{detalhes.metricas.totalConcluidos}</p>
                  <p className="text-xs text-muted-foreground mt-1">Concluídos</p>
                </div>
                
                <div className="p-4 border rounded-lg bg-card">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase">Valor Gasto</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-500">
                    {formatCurrency(detalhes.metricas.totalGasto)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Apenas concluídos</p>
                </div>

                <div className="col-span-2 grid grid-cols-2 gap-4 pt-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block mb-1">1º Atendimento</span>
                    <span className="font-medium">{formatDate(detalhes.metricas.primeiroAtendimento)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Último Atendimento</span>
                    <span className="font-medium">{formatDate(detalhes.metricas.ultimoAtendimento)}</span>
                  </div>
                </div>
              </div>

              {/* Histórico */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  Histórico
                  <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Últimos 10</span>
                </h3>
                
                {detalhes.historico.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground bg-muted/50 rounded-lg border border-dashed">
                    Nenhum agendamento encontrado.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {detalhes.historico.map((ag: any) => {
                      const servicosText = ag.agendamento_servico.map((s: any) => s.servico.nome).join(', ');
                      const valorTotal = ag.agendamento_servico.reduce((acc: number, cur: any) => acc + Number(cur.preco_cobrado), 0);
                      
                      return (
                        <div key={ag.id} className="p-3 border rounded-lg flex flex-col gap-2">
                          <div className="flex justify-between items-start">
                            <span className="font-medium text-sm">
                              {format(parseISO(ag.data_hora), "dd MMM, HH:mm", { locale: ptBR })}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              ag.status === 'concluido' ? 'bg-green-100 text-green-700' :
                              ag.status === 'cancelado' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {ag.status}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {servicosText || 'Sem serviço vinculado'} • {ag.profissional.nome}
                          </div>
                          <div className="text-sm font-medium">
                            {formatCurrency(valorTotal)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {confirmDialog && (
        <ConfirmDialog
          open={confirmDialog.open}
          onOpenChange={(op) => { if (!op) setConfirmDialog(null); }}
          title={confirmDialog.title}
          description={confirmDialog.message}
          confirmText="Confirmar"
          variant="destructive"
          onConfirm={() => execStatusToggle(confirmDialog.payload)}
        />
      )}
    </>
  );
}
