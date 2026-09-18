import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useProfissionalDetalhes, useProfissionais } from '@/hooks/useProfissionais';
import { Button } from '@/components/ui/button';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Edit, Power, Mail, Phone, Scissors, Activity, DollarSign, AlertCircle, Percent } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { JornadaTrabalho } from './JornadaTrabalho';

interface ProfissionalDetalheSheetProps {
  profissionalId: string | null;
  onClose: () => void;
  onEdit: (profissional: any) => void;
  barbeariaId: string | null;
}

export function ProfissionalDetalheSheet({ profissionalId, onClose, onEdit, barbeariaId }: ProfissionalDetalheSheetProps) {
  const [periodo, setPeriodo] = useState(() => {
    const start = startOfMonth(new Date()).toISOString();
    const end = endOfMonth(new Date()).toISOString();
    return { start, end };
  });

  // O componente renderiza apenas se houver profissionalId. Precisamos da comissão original para o calculo.
  // Como useProfissionalDetalhes busca na raiz, ele vai pegar a comissão do banco. Mas a gente precisa dela ANTES?
  // O hook de detalhes foi alterado para receber comissaoPerc como parametro. Vamos ajustar isso lá ou buscar o profissional primeiro.
  // Wait, o hook get Profissional, Desempenho e Histórico no mesmo Promise.all. Mas o Desempenho precisa da comissão.
  // Eu vou arrumar o backend do hook depois ou usar um valor padrão e atualizar. Na real, o useProfissionais tem a lista de profissionais com a comissão!
  
  const { profissionais, alternarStatus, verificarAgendamentoFuturo } = useProfissionais(barbeariaId);
  
  const profBase = profissionais.find(p => p.id === profissionalId);
  const comissaoBase = profBase ? Number(profBase.comissao_percentual) : null;

  const { data: detalhes, isLoading, isError } = useProfissionalDetalhes(profissionalId, comissaoBase, periodo.start, periodo.end);

  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; message: string; payload: any } | null>(null);

  if (!profissionalId) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const execStatusToggle = async (novoStatus: 'ativo' | 'inativo') => {
    try {
      await alternarStatus({ id: profissionalId, status: novoStatus });
      toast.success(`Profissional ${novoStatus === 'inativo' ? 'inativado' : 'reativado'} com sucesso.`);
    } catch (error: any) {
      toast.error(error.message || 'Falha ao alterar o status.');
    } finally {
      setConfirmDialog(null);
    }
  };

  const handleToggleStatus = async () => {
    if (!detalhes) return;
    
    try {
      const isAtivo = detalhes.profissional.status === 'ativo';
      const novoStatus = isAtivo ? 'inativo' : 'ativo';

      if (isAtivo) {
        // Checar agendamentos futuros
        const check = await verificarAgendamentoFuturo(profissionalId);
        if (check.possui) {
          const dtProximo = check.proximo ? format(parseISO(check.proximo), "dd/MM 'às' HH:mm") : '';
          const msg = `Este profissional possui ${check.quantidade} agendamento(s) futuro(s) marcado(s), sendo o próximo em ${dtProximo}. Inativá-lo fará com que ele não receba novos agendamentos e remova sua jornada da Agenda, mas os agendamentos atuais continuarão existindo e precisarão ser remarcados manualmente. Deseja inativar mesmo assim?`;
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
            message: "Deseja realmente inativar este profissional? O histórico será mantido e ele não aparecerá mais na agenda.",
            payload: novoStatus
          });
          return;
        }
      }

      await execStatusToggle(novoStatus);
    } catch (error: any) {
      toast.error(error.message || 'Falha ao verificar status.');
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>, tipo: 'start' | 'end') => {
    const val = e.target.value;
    if (!val) return;
    setPeriodo(prev => ({
      ...prev,
      [tipo]: new Date(val).toISOString()
    }));
  };

  return (
    <>
      <Sheet open={!!profissionalId} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="w-full sm:max-w-md md:max-w-lg overflow-y-auto p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
              Carregando detalhes...
            </div>
          ) : isError || !detalhes ? (
            <div className="flex flex-col items-center justify-center h-full text-destructive p-6">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p>Falha ao carregar os dados.</p>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <SheetHeader className="p-6 pb-4 border-b shrink-0">
                <div className="flex justify-between items-start">
                  <div>
                    <SheetTitle className="text-2xl">{detalhes.profissional.nome}</SheetTitle>
                    <SheetDescription className="mt-1 flex gap-2 items-center flex-wrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        detalhes.profissional.status === 'ativo' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {detalhes.profissional.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </span>
                      {detalhes.profissional.especialidade && (
                        <span className="text-muted-foreground">{detalhes.profissional.especialidade}</span>
                      )}
                    </SheetDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => onEdit(detalhes.profissional)} title="Editar">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={handleToggleStatus} title={detalhes.profissional.status === 'ativo' ? "Inativar" : "Reativar"}>
                      <Power className={`h-4 w-4 ${detalhes.profissional.status === 'ativo' ? 'text-destructive' : 'text-green-600'}`} />
                    </Button>
                  </div>
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto">
                <Tabs defaultValue="info" className="w-full h-full flex flex-col">
                  <div className="px-6 pt-2 shrink-0">
                    <TabsList className="w-full">
                      <TabsTrigger value="info" className="flex-1">Visão Geral</TabsTrigger>
                      <TabsTrigger value="jornada" className="flex-1">Jornada de Trabalho</TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="info" className="p-6 pt-4 space-y-6 m-0 outline-none">
                    {/* Contatos e Info */}
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{detalhes.profissional.telefone || '-'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{detalhes.profissional.email || '-'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <Percent className="h-4 w-4" />
                        <span>Comissão Base: <strong>{Number(detalhes.profissional.comissao_percentual).toFixed(1)}%</strong></span>
                      </div>
                      {detalhes.profissional.bio && (
                        <div className="mt-2 p-3 bg-muted rounded-md text-sm">
                          {detalhes.profissional.bio}
                        </div>
                      )}
                    </div>

                    {/* Desempenho */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-lg flex items-center gap-2">Desempenho</h3>
                        <div className="flex gap-2 items-center">
                          <Input 
                            type="date" 
                            className="h-8 w-[130px] text-xs" 
                            value={format(parseISO(periodo.start), 'yyyy-MM-dd')}
                            onChange={e => handleDateChange(e, 'start')}
                          />
                          <span className="text-muted-foreground text-sm">até</span>
                          <Input 
                            type="date" 
                            className="h-8 w-[130px] text-xs" 
                            value={format(parseISO(periodo.end), 'yyyy-MM-dd')}
                            onChange={e => handleDateChange(e, 'end')}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 border rounded-lg bg-card">
                          <div className="flex items-center gap-2 text-muted-foreground mb-2">
                            <Scissors className="h-4 w-4" />
                            <span className="text-xs font-medium uppercase">Atendimentos</span>
                          </div>
                          <p className="text-2xl font-bold">{detalhes.desempenho.atendimentos}</p>
                          <p className="text-xs text-muted-foreground mt-1">Concluídos no período</p>
                        </div>
                        
                        <div className="p-4 border rounded-lg bg-card">
                          <div className="flex items-center gap-2 text-muted-foreground mb-2">
                            <Activity className="h-4 w-4" />
                            <span className="text-xs font-medium uppercase">Ticket Médio</span>
                          </div>
                          <p className="text-2xl font-bold">{formatCurrency(detalhes.desempenho.ticketMedio)}</p>
                          <p className="text-xs text-muted-foreground mt-1">Por atendimento</p>
                        </div>

                        <div className="col-span-2 p-4 border rounded-lg bg-primary/5 border-primary/20">
                          <div className="flex justify-between items-end">
                            <div>
                              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <DollarSign className="h-4 w-4" />
                                <span className="text-xs font-medium uppercase">Faturamento Bruto</span>
                              </div>
                              <p className="text-xl font-semibold">{formatCurrency(detalhes.desempenho.faturamento)}</p>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center justify-end gap-2 text-muted-foreground mb-1">
                                <span className="text-xs font-medium uppercase">Comissão a Pagar</span>
                              </div>
                              <p className="text-xl font-bold text-green-600 dark:text-green-500">
                                {formatCurrency(detalhes.desempenho.comissao)}
                              </p>
                              {/* Sem esta linha os dois numeros ao lado parecem
                                  incoerentes: o faturamento e o que ele produziu,
                                  a comissao e sobre o que ja entrou no caixa. */}
                              <p className="text-xs text-muted-foreground mt-1">
                                Sobre {formatCurrency(detalhes.desempenho.receitaNoCaixa)} já lançados no caixa
                              </p>
                            </div>
                          </div>
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
                                  {servicosText || 'Sem serviço vinculado'} • Cliente: {ag.cliente.nome}
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
                  </TabsContent>

                  <TabsContent value="jornada" className="p-6 pt-4 m-0 outline-none">
                    <JornadaTrabalho profissionalId={profissionalId} />
                  </TabsContent>
                </Tabs>
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
