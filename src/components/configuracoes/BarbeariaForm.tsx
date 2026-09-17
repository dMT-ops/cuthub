import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useConfiguracoes } from '@/hooks/useConfiguracoes';
import type { Database } from '@/types/database.types';

type Barbearia = Database['public']['Tables']['barbearia']['Row'];

const schema = z.object({
  nome: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres').max(255, 'Máximo de 255 caracteres'),
  cidade: z.string().max(120, 'Máximo de 120 caracteres').or(z.literal('')),
  // Duas letras, como a coluna CHAR(2) do banco.
  estado: z
    .string()
    .regex(/^[A-Za-z]{2}$/, 'Use a sigla de 2 letras, como SP')
    .or(z.literal('')),
  listada_no_catalogo: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface BarbeariaFormProps {
  barbearia?: Barbearia;
  isLoading: boolean;
}

export function BarbeariaForm({ barbearia, isLoading }: BarbeariaFormProps) {
  const { atualizarDadosBarbearia, isSalvandoBarbearia } = useConfiguracoes();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nome: '', cidade: '', estado: '', listada_no_catalogo: true },
  });

  useEffect(() => {
    if (!barbearia) return;
    form.reset({
      nome: barbearia.nome,
      cidade: barbearia.cidade ?? '',
      estado: barbearia.estado ?? '',
      listada_no_catalogo: barbearia.listada_no_catalogo,
    });
  }, [barbearia, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      const dados = {
        nome: values.nome.trim(),
        cidade: values.cidade.trim() || null,
        estado: values.estado.trim().toUpperCase() || null,
        listada_no_catalogo: values.listada_no_catalogo,
      };
      await atualizarDadosBarbearia(dados);
      // Reposiciona o "estado limpo" do formulário: sem isso o botão continua ativo
      form.reset({ ...values, estado: dados.estado ?? '' });
      toast.success('Dados da barbearia atualizados!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar a barbearia');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Barbearia</CardTitle>
        <CardDescription>
          Como o seu estabelecimento é identificado no sistema e no catálogo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full max-w-sm" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

              <div className="flex flex-wrap gap-4">
                <FormField
                  control={form.control}
                  name="cidade"
                  render={({ field }) => (
                    <FormItem className="min-w-[200px] flex-1">
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input placeholder="São Paulo" {...field} />
                      </FormControl>
                      <FormDescription>Usada no filtro do catálogo.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estado"
                  render={({ field }) => (
                    <FormItem className="w-28">
                      <FormLabel>Estado</FormLabel>
                      <FormControl>
                        <Input placeholder="SP" maxLength={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="listada_no_catalogo"
                render={({ field }) => (
                  <FormItem className="flex items-start justify-between gap-4 rounded-lg border p-4">
                    <div className="space-y-1">
                      <FormLabel>Aparecer no catálogo público do CutHub</FormLabel>
                      <FormDescription>
                        Ligado, sua barbearia aparece na busca e qualquer pessoa
                        pode ver o seu perfil, serviços e produtos. Desligado,
                        só quem tiver o link direto encontra — e a vitrine de
                        produtos também sai do ar.
                      </FormDescription>
                      {barbearia?.slug && field.value && (
                        <Link
                          to={`/b/${barbearia.slug}`}
                          className="inline-flex items-center gap-1 pt-1 text-sm text-primary hover:underline"
                        >
                          Ver meu perfil público
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </Link>
                      )}
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        aria-label="Aparecer no catálogo público"
                      />
                    </FormControl>
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
