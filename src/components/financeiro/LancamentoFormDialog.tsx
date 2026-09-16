import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/AuthContext';
import { useFinanceiro } from '@/hooks/useFinanceiro';
import { useProfissionais } from '@/hooks/useProfissionais';
import {
  CATEGORIAS_POR_TIPO,
  FORMAS_PAGAMENTO,
  ROTULO_CATEGORIA,
  ROTULO_FORMA_PAGAMENTO,
} from '@/lib/financeiro';

const SEM_PROFISSIONAL = 'nenhum';

const lancamentoSchema = z.object({
  tipo: z.enum(['entrada', 'saida']),
  categoria: z.enum(['atendimento', 'venda_produto', 'aluguel', 'insumos', 'salario', 'comissao', 'outro']),
  valor: z.coerce.number().positive('O valor precisa ser maior que zero'),
  data: z.string().min(1, 'Informe a data'),
  forma_pagamento: z.enum(['dinheiro', 'pix', 'credito', 'debito', 'outro']),
  profissional_id: z.string().optional(),
  descricao: z.string().max(255, 'Máximo de 255 caracteres').optional(),
});

type LancamentoFormValues = z.infer<typeof lancamentoSchema>;

interface LancamentoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LancamentoFormDialog({ open, onOpenChange }: LancamentoFormDialogProps) {
  const { barbeariaId, user } = useAuth();
  const { criarLancamento, isCriando } = useFinanceiro(barbeariaId);
  const { profissionais } = useProfissionais(barbeariaId, { status: 'ativo' });

  const form = useForm<LancamentoFormValues>({
    resolver: zodResolver(lancamentoSchema),
    defaultValues: {
      tipo: 'entrada',
      categoria: 'atendimento',
      valor: 0,
      data: format(new Date(), 'yyyy-MM-dd'),
      forma_pagamento: 'dinheiro',
      profissional_id: SEM_PROFISSIONAL,
      descricao: '',
    },
  });

  const tipo = useWatch({ control: form.control, name: 'tipo' });
  const categoriasDisponiveis = CATEGORIAS_POR_TIPO[tipo];

  useEffect(() => {
    if (!open) return;
    form.reset({
      tipo: 'entrada',
      categoria: 'atendimento',
      valor: 0,
      data: format(new Date(), 'yyyy-MM-dd'),
      forma_pagamento: 'dinheiro',
      profissional_id: SEM_PROFISSIONAL,
      descricao: '',
    });
  }, [open, form]);

  // Trocar de tipo pode deixar a categoria incoerente (ex.: "aluguel" como entrada)
  useEffect(() => {
    const atual = form.getValues('categoria');
    if (!categoriasDisponiveis.includes(atual)) {
      form.setValue('categoria', categoriasDisponiveis[0]);
    }
  }, [categoriasDisponiveis, form]);

  const onSubmit = async (values: LancamentoFormValues) => {
    if (!barbeariaId) {
      toast.error('Barbearia não identificada.');
      return;
    }

    try {
      await criarLancamento({
        barbearia_id: barbeariaId,
        tipo: values.tipo,
        categoria: values.categoria,
        valor: values.valor,
        // O input date entrega apenas o dia; preserva-se a hora atual do registro
        data_lancamento: new Date(`${values.data}T${format(new Date(), 'HH:mm:ss')}`).toISOString(),
        forma_pagamento: values.forma_pagamento,
        profissional_id: values.profissional_id === SEM_PROFISSIONAL ? null : values.profissional_id || null,
        descricao: values.descricao?.trim() || null,
        criado_por: user?.id ?? null,
      });
      toast.success('Lançamento registrado com sucesso!');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao registrar o lançamento');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Novo Lançamento</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="entrada">Entrada</SelectItem>
                        <SelectItem value="saida">Saída</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="categoria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categoriasDisponiveis.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {ROTULO_CATEGORIA[cat]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="valor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0.01" {...field} />
                    </FormControl>
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="forma_pagamento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Forma de pagamento</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FORMAS_PAGAMENTO.map((forma) => (
                          <SelectItem key={forma} value={forma}>
                            {ROTULO_FORMA_PAGAMENTO[forma]}
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
                name="profissional_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profissional (opcional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={SEM_PROFISSIONAL}>Não vincular</SelectItem>
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
            </div>

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: compra de lâminas" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isCriando}>
                {isCriando ? 'Salvando...' : 'Registrar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
