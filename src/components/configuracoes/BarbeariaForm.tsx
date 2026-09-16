import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useConfiguracoes } from '@/hooks/useConfiguracoes';

const schema = z.object({
  nome: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres').max(255, 'Máximo de 255 caracteres'),
});

type FormValues = z.infer<typeof schema>;

interface BarbeariaFormProps {
  nomeAtual?: string;
  isLoading: boolean;
}

export function BarbeariaForm({ nomeAtual, isLoading }: BarbeariaFormProps) {
  const { atualizarNomeBarbearia, isSalvandoBarbearia } = useConfiguracoes();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nome: '' },
  });

  useEffect(() => {
    if (nomeAtual) form.reset({ nome: nomeAtual });
  }, [nomeAtual, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      const nome = values.nome.trim();
      await atualizarNomeBarbearia(nome);
      // Reposiciona o "estado limpo" do formulário: sem isso o botão continua ativo
      form.reset({ nome });
      toast.success('Dados da barbearia atualizados!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar a barbearia');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Barbearia</CardTitle>
        <CardDescription>Como o seu estabelecimento é identificado no sistema.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full max-w-sm" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem className="max-w-sm">
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome da barbearia" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isSalvandoBarbearia || !form.formState.isDirty}>
                {isSalvandoBarbearia ? 'Salvando...' : 'Salvar'}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
