import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/AuthContext';
import { usePromocoes } from '@/hooks/usePromocoes';
import type { Database } from '@/types/database.types';

type Promocao = Database['public']['Tables']['promocao']['Row'];

const schema = z
  .object({
    titulo: z.string().min(2, 'O título deve ter pelo menos 2 caracteres').max(255, 'Máximo de 255 caracteres'),
    descricao: z.string().max(1000, 'Descrição muito longa').or(z.literal('')),
    desconto_percentual: z.coerce
      .number()
      .min(0, 'O desconto não pode ser negativo')
      .max(100, 'O desconto não pode passar de 100%'),
    regras: z.string().max(1000, 'Texto muito longo').or(z.literal('')),
    data_inicio: z.string().min(1, 'Informe quando a promoção começa'),
    data_fim: z.string().min(1, 'Informe quando a promoção termina'),
  })
  // Espelha o CHECK `promocao_periodo_valido`. Validar aqui evita a ida ao
  // servidor só para receber a recusa — e diz qual campo corrigir.
  .refine((v) => new Date(v.data_fim) > new Date(v.data_inicio), {
    message: 'O término precisa ser depois do início',
    path: ['data_fim'],
  });

type FormValues = z.infer<typeof schema>;

/** `datetime-local` não aceita ISO com fuso; precisa de `YYYY-MM-DDTHH:mm` local. */
function paraCampoLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const VALORES_PADRAO: FormValues = {
  titulo: '',
  descricao: '',
  desconto_percentual: 10,
  regras: '',
  data_inicio: '',
  data_fim: '',
};

interface PromocaoFormDialogProps {
  promocao: Promocao | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PromocaoFormDialog({ promocao, open, onOpenChange }: PromocaoFormDialogProps) {
  const { barbeariaId } = useAuth();
  const { criarPromocao, atualizarPromocao, isCriando, isAtualizando } = usePromocoes(barbeariaId);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: VALORES_PADRAO,
  });

  useEffect(() => {
    if (!open) return;

    if (promocao) {
      form.reset({
        titulo: promocao.titulo,
        descricao: promocao.descricao ?? '',
        desconto_percentual: Number(promocao.desconto_percentual),
        regras: promocao.regras ?? '',
        data_inicio: paraCampoLocal(promocao.data_inicio),
        data_fim: paraCampoLocal(promocao.data_fim),
      });
    } else {
      form.reset(VALORES_PADRAO);
    }
  }, [promocao, open, form]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      titulo: values.titulo.trim(),
      descricao: values.descricao.trim() || null,
      desconto_percentual: values.desconto_percentual,
      regras: values.regras.trim() || null,
      data_inicio: new Date(values.data_inicio).toISOString(),
      data_fim: new Date(values.data_fim).toISOString(),
    };

    try {
      if (promocao) {
        await atualizarPromocao({ id: promocao.id, updates: payload });
        toast.success('Promoção atualizada!');
      } else {
        await criarPromocao(payload);
        toast.success('Promoção criada!');
      }
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar a promoção');
    }
  };

  const isSalvando = isCriando || isAtualizando;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{promocao ? 'Editar promoção' : 'Nova promoção'}</DialogTitle>
          <DialogDescription>
            Enquanto estiver vigente, aparece no perfil público da barbearia.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="titulo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Terça do corte" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <textarea
                      rows={2}
                      placeholder="O que o cliente ganha."
                      className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="desconto_percentual"
              render={({ field }) => (
                <FormItem className="max-w-[160px]">
                  <FormLabel>Desconto (%)</FormLabel>
                  <FormControl>
                    <Input type="number" step="1" min="0" max="100" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="data_inicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Começa em</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="data_fim"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Termina em</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="regras"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Regras (opcional)</FormLabel>
                  <FormControl>
                    <textarea
                      rows={2}
                      placeholder="Não acumulativo, válido só para corte, etc."
                      className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>O cliente vê este texto junto do desconto.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSalvando}>
                {isSalvando ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
