import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth/AuthContext';
import { useConfiguracoes } from '@/hooks/useConfiguracoes';

const schema = z.object({
  nome: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres').max(255, 'Máximo de 255 caracteres'),
});

type FormValues = z.infer<typeof schema>;

const ROTULO_TIPO: Record<string, string> = {
  admin_supremo: 'Administrador do sistema',
  owner: 'Proprietário',
  profissional: 'Profissional',
  cliente: 'Cliente',
};

export function PerfilForm() {
  const { user, perfil, tipo } = useAuth();
  const { atualizarNomeUsuario, isSalvandoUsuario } = useConfiguracoes();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nome: '' },
  });

  useEffect(() => {
    if (perfil?.nome) form.reset({ nome: perfil.nome });
  }, [perfil?.nome, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      const nome = values.nome.trim();
      await atualizarNomeUsuario(nome);
      form.reset({ nome });
      toast.success('Perfil atualizado!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar o perfil');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meu perfil</CardTitle>
        <CardDescription>Dados da sua conta de acesso.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-8">
          <div>
            <p className="text-sm font-medium text-muted-foreground">E-mail</p>
            <p className="font-medium">{user?.email ?? '—'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Nível de acesso</p>
            <Badge variant="secondary" className="mt-0.5">
              {tipo ? (ROTULO_TIPO[tipo] ?? tipo) : '—'}
            </Badge>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          E-mail e nível de acesso não são editáveis por aqui: o vínculo com a barbearia e o tipo
          de usuário são protegidos no banco.
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem className="max-w-sm">
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Seu nome" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isSalvandoUsuario || !form.formState.isDirty}>
              {isSalvandoUsuario ? 'Salvando...' : 'Salvar'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
