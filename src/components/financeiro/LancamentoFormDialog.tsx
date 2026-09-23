import { useEffect, useMemo } from 'react';
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
import type { LancamentoComDetalhes } from '@/services/financeiro.service';
import {
  CATEGORIAS_POR_TIPO,
  FORMAS_PAGAMENTO,
  ROTULO_CATEGORIA,
  ROTULO_FORMA_PAGAMENTO,
} from '@/lib/financeiro';

const SEM_PROFISSIONAL = 'nenhum';
// Lancamentos antigos tem forma_pagamento nula. Sem esta opcao, abrir a edicao
// de um deles ja mostrava "Dinheiro" selecionado e salvar gravava Dinheiro sem
// o gestor ter escolhido nada -- justo no fluxo que o fechamento por forma de
// pagamento indica para corrigir os nulos.
const SEM_FORMA = 'nao_informada';

const lancamentoSchema = z.object({
  tipo: z.enum(['entrada', 'saida']),
  categoria: z.enum(['atendimento', 'venda_produto', 'aluguel', 'insumos', 'salario', 'comissao', 'outro']),
  valor: z.coerce.number().positive('O valor precisa ser maior que zero'),
  data: z.string().min(1, 'Informe a data'),
  forma_pagamento: z.enum(['dinheiro', 'pix', 'credito', 'debito', 'outro', SEM_FORMA]),
  profissional_id: z.string().optional(),
  descricao: z.string().max(255, 'Máximo de 255 caracteres').optional(),
});

type LancamentoFormValues = z.infer<typeof lancamentoSchema>;

interface LancamentoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Quando presente, o dialogo edita este lancamento em vez de criar um novo */
  lancamentoAEditar?: LancamentoComDetalhes | null;
  /**
   * Id do profissional logado, quando quem abre o diálogo é o próprio barbeiro
   * (F14.1). Trava o lançamento na linha dele e reduz as categorias ao que a
   * RLS aceita — a trava real está na policy `financeiro_lancamento_do_
   * profissional`; aqui o objetivo é não deixar o formulário oferecer uma
   * opção que o banco vai recusar depois do usuário preencher tudo.
   */
  profissionalFixo?: string | null;
}

export function LancamentoFormDialog({
  open,
  onOpenChange,
  lancamentoAEditar,
  profissionalFixo = null,
}: LancamentoFormDialogProps) {
  const { barbeariaId, user } = useAuth();
  const { criarLancamento, isCriando, atualizarLancamento, isAtualizando } = useFinanceiro(barbeariaId);
  const editando = !!lancamentoAEditar;
  const { profissionais } = useProfissionais(barbeariaId, { status: 'ativo' });

  const form = useForm<LancamentoFormValues>({
    resolver: zodResolver(lancamentoSchema),
    defaultValues: {
      tipo: 'entrada',
      categoria: profissionalFixo ? 'venda_produto' : 'atendimento',
      valor: 0,
      data: format(new Date(), 'yyyy-MM-dd'),
      forma_pagamento: 'dinheiro',
      profissional_id: SEM_PROFISSIONAL,
      descricao: '',
    },
  });

  const tipo = useWatch({ control: form.control, name: 'tipo' });
  // Espelha `categoria_permitida_ao_profissional` da migration 00030. O
  // barbeiro não lança `atendimento` (é a base da comissão dele) nem
  // `comissao` (é a barbearia pagando ele).
  const categoriasDisponiveis = useMemo(() => {
    const doTipo = CATEGORIAS_POR_TIPO[tipo];
    if (!profissionalFixo) return doTipo;
    return doTipo.filter((c) => c === 'venda_produto' || c === 'insumos' || c === 'outro');
  }, [tipo, profissionalFixo]);

  useEffect(() => {
    if (!open) return;

    if (lancamentoAEditar) {
      form.reset({
        tipo: lancamentoAEditar.tipo,
        categoria: lancamentoAEditar.categoria,
        valor: Number(lancamentoAEditar.valor),
        // `yyyy-MM-dd` do date-fns usa o fuso LOCAL. Usar toISOString().slice(0,10)
        // aqui devolveria o dia anterior para qualquer hora antes das 03:00 em BRT.
        data: lancamentoAEditar.data_lancamento
          ? format(new Date(lancamentoAEditar.data_lancamento), 'yyyy-MM-dd')
          : format(new Date(), 'yyyy-MM-dd'),
        forma_pagamento: lancamentoAEditar.forma_pagamento ?? SEM_FORMA,
        profissional_id: lancamentoAEditar.profissional_id ?? SEM_PROFISSIONAL,
        descricao: lancamentoAEditar.descricao ?? '',
      });
      return;
    }

    form.reset({
      tipo: 'entrada',
      categoria: 'atendimento',
      valor: 0,
      data: format(new Date(), 'yyyy-MM-dd'),
      forma_pagamento: 'dinheiro',
      profissional_id: profissionalFixo ?? SEM_PROFISSIONAL,
      descricao: '',
    });
  }, [open, form, lancamentoAEditar, profissionalFixo]);

  // Trocar de tipo pode deixar a categoria incoerente (ex.: "aluguel" como entrada)
  useEffect(() => {
    const atual = form.getValues('categoria');
    if (!categoriasDisponiveis.includes(atual)) {
      form.setValue('categoria', categoriasDisponiveis[0]);
    }
  }, [categoriasDisponiveis, form]);

  // `comissao` e categoria de saida, mas o lancamento gerado pelo painel de
  // comissoes precisa continuar editavel sem que o select a esconda.
  const categoriasNoSelect = useMemo(() => {
    const atual = lancamentoAEditar?.categoria;
    if (atual && !categoriasDisponiveis.includes(atual)) {
      return [atual, ...categoriasDisponiveis];
    }
    return categoriasDisponiveis;
  }, [categoriasDisponiveis, lancamentoAEditar]);

  const onSubmit = async (values: LancamentoFormValues) => {
    if (!barbeariaId) {
      toast.error('Barbearia não identificada.');
      return;
    }

    const camposDoFormulario = {
      tipo: values.tipo,
      categoria: values.categoria,
      valor: values.valor,
      // O input date entrega apenas o dia; preserva-se a hora atual do registro
      data_lancamento: new Date(`${values.data}T${format(new Date(), 'HH:mm:ss')}`).toISOString(),
      forma_pagamento: values.forma_pagamento === SEM_FORMA ? null : values.forma_pagamento,
      profissional_id: values.profissional_id === SEM_PROFISSIONAL ? null : values.profissional_id || null,
      descricao: values.descricao?.trim() || null,
    };

    try {
      if (lancamentoAEditar) {
        await atualizarLancamento({ id: lancamentoAEditar.id, patch: camposDoFormulario });
        toast.success('Lançamento atualizado.');
      } else {
        await criarLancamento({
          ...camposDoFormulario,
          barbearia_id: barbeariaId,
          criado_por: user?.id ?? null,
        });
        toast.success('Lançamento registrado com sucesso!');
      }
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar o lançamento');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{editando ? 'Editar Lançamento' : 'Novo Lançamento'}</DialogTitle>
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
                        {categoriasNoSelect.map((cat) => (
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
                        {/* So aparece quando o lancamento em edicao ja estava sem
                            forma: em lancamento novo, obrigar a escolha e melhor. */}
                        {lancamentoAEditar && !lancamentoAEditar.forma_pagamento && (
                          <SelectItem value={SEM_FORMA}>Não informada</SelectItem>
                        )}
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

              {/* Para o barbeiro o campo nao existe: o lancamento e sempre dele.
                  Escondido em vez de desabilitado porque um select travado com
                  uma opcao so nao e escolha, e ocupa espaco pedindo atencao. O
                  valor segue no payload pelo `form.reset`, e a RLS confere. */}
              {profissionalFixo ? null : (
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
              )}
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
              <Button type="submit" disabled={isCriando || isAtualizando}>
                {isCriando || isAtualizando ? 'Salvando...' : editando ? 'Salvar' : 'Registrar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
