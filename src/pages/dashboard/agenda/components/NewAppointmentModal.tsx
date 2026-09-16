import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, isValid, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, Loader2, Search, User } from 'lucide-react';
import { toast } from 'sonner';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/AuthContext';
import { useClientes } from '@/hooks/useClientes';
import { useProfissionais } from '@/hooks/useProfissionais';
import { useServicos } from '@/hooks/useServicos';
import { useAgendamentos } from '@/hooks/useAgendamentos';
import { useDisponibilidade } from '@/hooks/useDisponibilidade';
import { formatarMoeda } from '@/lib/utils';

const agendamentoSchema = z.object({
  cliente_id: z.string().uuid('Selecione um cliente'),
  profissional_id: z.string().uuid('Selecione um profissional'),
  servicoIds: z.array(z.string().uuid()).min(1, 'Selecione ao menos um serviço'),
  data: z.string().min(1, 'Informe a data'),
  horario: z.string().min(1, 'Selecione um horário disponível'),
  status: z.enum(['pendente', 'confirmado']),
  observacoes: z.string().max(1000, 'Observação muito longa').optional(),
});

type AgendamentoFormValues = z.infer<typeof agendamentoSchema>;

interface NewAppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
}

export function NewAppointmentModal({ open, onOpenChange, selectedDate }: NewAppointmentModalProps) {
  const { barbeariaId } = useAuth();

  const [buscaCliente, setBuscaCliente] = useState('');
  const [buscaDebounced, setBuscaDebounced] = useState('');
  const [clienteSelecionado, setClienteSelecionado] = useState<{ id: string; nome: string } | null>(null);

  const form = useForm<AgendamentoFormValues>({
    resolver: zodResolver(agendamentoSchema),
    defaultValues: {
      cliente_id: '',
      profissional_id: '',
      servicoIds: [],
      data: format(selectedDate, 'yyyy-MM-dd'),
      horario: '',
      status: 'confirmado',
      observacoes: '',
    },
  });

  const profissionalId = useWatch({ control: form.control, name: 'profissional_id' });
  const servicoIds = useWatch({ control: form.control, name: 'servicoIds' });
  const dataSelecionada = useWatch({ control: form.control, name: 'data' });

  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(buscaCliente), 300);
    return () => clearTimeout(t);
  }, [buscaCliente]);

  // Reabrir o formulário limpo, já posicionado na data que o usuário está vendo
  useEffect(() => {
    if (!open) return;
    form.reset({
      cliente_id: '',
      profissional_id: '',
      servicoIds: [],
      data: format(selectedDate, 'yyyy-MM-dd'),
      horario: '',
      status: 'confirmado',
      observacoes: '',
    });
    setClienteSelecionado(null);
    setBuscaCliente('');
  }, [open, selectedDate, form]);

  const { clientes, isLoading: carregandoClientes } = useClientes(barbeariaId, {
    busca: buscaDebounced,
    status: 'ativo',
    page: 1,
    limit: 8,
  });
  const { profissionais } = useProfissionais(barbeariaId, { status: 'ativo' });
  const { servicos } = useServicos(barbeariaId);
  const { criarAgendamento, isCriando } = useAgendamentos(barbeariaId);

  const servicosAtivos = useMemo(() => servicos.filter((s) => s.status === 'ativo'), [servicos]);

  const selecionados = useMemo(
    () => servicosAtivos.filter((s) => servicoIds.includes(s.id)),
    [servicosAtivos, servicoIds]
  );
  const duracaoTotal = selecionados.reduce((total, s) => total + s.duracao_minutos, 0);
  const precoTotal = selecionados.reduce((total, s) => total + Number(s.preco), 0);

  // O input de data pode ficar vazio ou incompleto enquanto o usuário digita
  const diaEscolhido = useMemo(() => {
    if (!dataSelecionada) return null;
    const parsed = parseISO(dataSelecionada);
    return isValid(parsed) ? parsed : null;
  }, [dataSelecionada]);

  const {
    horarios,
    semJornada,
    isLoading: carregandoHorarios,
    isError: erroHorarios,
    error: erroDisponibilidade,
  } = useDisponibilidade(barbeariaId, profissionalId || null, diaEscolhido, duracaoTotal);

  // Um horário só continua válido enquanto a combinação profissional/data/duração não muda
  useEffect(() => {
    form.setValue('horario', '');
  }, [profissionalId, dataSelecionada, duracaoTotal, form]);

  const alternarServico = (id: string) => {
    const atuais = form.getValues('servicoIds');
    const novos = atuais.includes(id) ? atuais.filter((s) => s !== id) : [...atuais, id];
    form.setValue('servicoIds', novos, { shouldValidate: true });
  };

  const onSubmit = async (values: AgendamentoFormValues) => {
    if (!barbeariaId) {
      toast.error('Barbearia não identificada.');
      return;
    }

    try {
      await criarAgendamento({
        agendamentoData: {
          barbearia_id: barbeariaId,
          cliente_id: values.cliente_id,
          profissional_id: values.profissional_id,
          data_hora: values.horario,
          status: values.status,
          observacoes: values.observacoes?.trim() || null,
        },
        servicoIds: values.servicoIds,
      });
      toast.success('Agendamento criado com sucesso!');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar o agendamento');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-xl">Novo Agendamento</SheetTitle>
          <SheetDescription className="capitalize">
            {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Cliente */}
            <FormField
              control={form.control}
              name="cliente_id"
              render={() => (
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
                  {clienteSelecionado ? (
                    <div className="flex items-center justify-between rounded-md border px-3 py-2">
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {clienteSelecionado.nome}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setClienteSelecionado(null);
                          form.setValue('cliente_id', '', { shouldValidate: true });
                        }}
                      >
                        Trocar
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar por nome, telefone ou e-mail..."
                          value={buscaCliente}
                          onChange={(e) => setBuscaCliente(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      <div className="max-h-40 overflow-y-auto rounded-md border divide-y">
                        {carregandoClientes ? (
                          <p className="p-3 text-sm text-muted-foreground">Carregando clientes...</p>
                        ) : clientes.length === 0 ? (
                          <p className="p-3 text-sm text-muted-foreground">Nenhum cliente ativo encontrado.</p>
                        ) : (
                          clientes.map((cliente: any) => (
                            <button
                              key={cliente.id}
                              type="button"
                              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/60 transition-colors"
                              onClick={() => {
                                setClienteSelecionado({ id: cliente.id, nome: cliente.nome });
                                form.setValue('cliente_id', cliente.id, { shouldValidate: true });
                              }}
                            >
                              <span className="font-medium">{cliente.nome}</span>
                              <span className="text-xs text-muted-foreground">{cliente.telefone}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Serviços */}
            <FormField
              control={form.control}
              name="servicoIds"
              render={() => (
                <FormItem>
                  <FormLabel>Serviços</FormLabel>
                  <div className="max-h-44 overflow-y-auto rounded-md border divide-y">
                    {servicosAtivos.length === 0 ? (
                      <p className="p-3 text-sm text-muted-foreground">
                        Nenhum serviço ativo no catálogo.
                      </p>
                    ) : (
                      servicosAtivos.map((servico) => {
                        const marcado = servicoIds.includes(servico.id);
                        return (
                          <button
                            key={servico.id}
                            type="button"
                            aria-pressed={marcado}
                            className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors ${
                              marcado ? 'bg-primary/10' : 'hover:bg-muted/60'
                            }`}
                            onClick={() => alternarServico(servico.id)}
                          >
                            <span className="flex items-center gap-2">
                              <span
                                className={`flex h-4 w-4 items-center justify-center rounded border ${
                                  marcado ? 'bg-primary border-primary text-primary-foreground' : 'border-input'
                                }`}
                              >
                                {marcado && <Check className="h-3 w-3" />}
                              </span>
                              <span className="font-medium">{servico.nome}</span>
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatarMoeda(Number(servico.preco))} · {servico.duracao_minutos} min
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                  {duracaoTotal > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Total: <span className="font-medium text-foreground">{formatarMoeda(precoTotal)}</span> ·{' '}
                      <span className="font-medium text-foreground">{duracaoTotal} min</span>
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Profissional e data */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="profissional_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profissional</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {profissionais.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="data"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Horário disponível */}
            <FormField
              control={form.control}
              name="horario"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Horário</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!profissionalId || duracaoTotal === 0 || horarios.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            !profissionalId || duracaoTotal === 0
                              ? 'Escolha profissional e serviços'
                              : carregandoHorarios
                                ? 'Consultando disponibilidade...'
                                : horarios.length === 0
                                  ? 'Sem horários disponíveis'
                                  : 'Selecione o horário'
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {horarios.map((h) => (
                        <SelectItem key={h.toISOString()} value={h.toISOString()}>
                          {format(h, 'HH:mm')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {erroHorarios && (
                    <p className="text-xs text-destructive">
                      {(erroDisponibilidade as Error)?.message || 'Falha ao consultar a disponibilidade.'}
                    </p>
                  )}
                  {!erroHorarios && semJornada && profissionalId && (
                    <p className="text-xs text-muted-foreground">
                      Este profissional não tem jornada cadastrada para o dia da semana escolhido.
                    </p>
                  )}
                  {!erroHorarios && !semJornada && !carregandoHorarios && profissionalId && duracaoTotal > 0 && horarios.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      A agenda deste profissional está cheia para {duracaoTotal} min neste dia.
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status inicial</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="confirmado">Confirmado</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Observações */}
            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações (opcional)</FormLabel>
                  <FormControl>
                    <textarea
                      rows={3}
                      placeholder="Preferências, avisos, etc..."
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2 pb-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isCriando}>
                {isCriando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isCriando ? 'Salvando...' : 'Criar Agendamento'}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
