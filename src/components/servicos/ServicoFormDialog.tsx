import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useServicos } from '@/hooks/useServicos';
import { useAuth } from '@/lib/auth/AuthContext';
import { toast } from 'sonner';
import { ServicoFormSkeleton } from './ServicoFormSkeleton';
import type { Database } from '@/types/database.types';

type Servico = Database['public']['Tables']['servico']['Row'];

const CATEGORIAS_SERVICO = [
  'corte',
  'barba',
  'combo',
  'quimica',
  'estetica',
  'infantil',
  'outro',
] as const;

const servicoSchema = z.object({
  nome: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres').max(255, 'Máximo de 255 caracteres'),
  categoria: z.enum(CATEGORIAS_SERVICO, { required_error: 'A categoria é obrigatória' }),
  descricao: z.string().max(1000, 'A descrição está muito longa').optional(),
  preco: z.coerce.number().min(0, 'O preço não pode ser negativo'),
  duracao_minutos: z.coerce.number().int('Informe minutos inteiros').min(5, 'A duração mínima é de 5 minutos'),
});

type ServicoFormValues = z.infer<typeof servicoSchema>;

const VALORES_PADRAO: ServicoFormValues = {
  nome: '',
  categoria: 'corte',
  descricao: '',
  preco: 0,
  duracao_minutos: 30,
};

interface ServicoFormDialogProps {
  servico: Servico | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading?: boolean;
}

export function ServicoFormDialog({ servico, open, onOpenChange, isLoading }: ServicoFormDialogProps) {
  const { barbeariaId } = useAuth();
  const { criarServico, atualizarServico, isCriando, isAtualizando } = useServicos(barbeariaId);
  
  const form = useForm<ServicoFormValues>({
    resolver: zodResolver(servicoSchema),
    defaultValues: VALORES_PADRAO,
  });

  useEffect(() => {
    if (!open) return;

    if (servico) {
      form.reset({
        nome: servico.nome,
        categoria: servico.categoria,
        descricao: servico.descricao || '',
        preco: Number(servico.preco),
        duracao_minutos: servico.duracao_minutos,
      });
    } else {
      form.reset(VALORES_PADRAO);
    }
  }, [servico, open, form]);

  const onSubmit = async (values: ServicoFormValues) => {
    if (!barbeariaId) {
      toast.error('Barbearia não identificada.');
      return;
    }

    const payload = {
      nome: values.nome,
      categoria: values.categoria,
      descricao: values.descricao ? values.descricao.trim() : null,
      preco: values.preco,
      duracao_minutos: values.duracao_minutos,
    };

    try {
      if (servico) {
        await atualizarServico({ id: servico.id, updates: payload });
        toast.success('Serviço atualizado com sucesso!');
      } else {
        await criarServico({ ...payload, barbearia_id: barbeariaId });
        toast.success('Serviço cadastrado com sucesso!');
      }
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar o serviço');
    }
  };

  const isSaving = isCriando || isAtualizando;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{servico ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <ServicoFormSkeleton />
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Corte Degradê" {...field} />
                    </FormControl>
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
                        <SelectTrigger className="capitalize">
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORIAS_SERVICO.map((cat) => (
                          <SelectItem key={cat} value={cat} className="capitalize">
                            {cat}
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
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Detalhes que ajudam o cliente a escolher" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="preco"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preço (R$)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="duracao_minutos"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duração (min)</FormLabel>
                      <FormControl>
                        <Input type="number" step="5" min="5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
