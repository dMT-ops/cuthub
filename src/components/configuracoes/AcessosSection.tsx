import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Crown, ShieldCheck, UserMinus } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/lib/auth/AuthContext';
import { useAcessos } from '@/hooks/useAcessos';
import type { Gestor, PapelDeGestao } from '@/services/acessos.service';

const schema = z.object({
  email: z.string().email('Informe um e-mail válido'),
  nome: z.string().max(255, 'Máximo de 255 caracteres').optional(),
  tipo: z.enum(['owner', 'gerente']),
});

type FormValues = z.infer<typeof schema>;

const ROTULO_PAPEL: Record<string, string> = {
  owner: 'Proprietário',
  gerente: 'Gerente',
  admin_supremo: 'Administrador',
  cliente: 'Cliente',
  profissional: 'Profissional',
};

interface AcessosSectionProps {
  /** Fundador da barbearia — não pode ser removido nem ter o papel alterado. */
  fundadorId?: string | null;
}

export function AcessosSection({ fundadorId }: AcessosSectionProps) {
  const { barbeariaId, user, podeGerenciarUsuarios } = useAuth();
  const {
    gestores,
    isLoading,
    isError,
    error,
    adicionarGestor,
    isAdicionando,
    alterarPapel,
    removerGestor,
    isRemovendo,
  } = useAcessos(barbeariaId);

  const [aRemover, setARemover] = useState<Gestor | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', nome: '', tipo: 'gerente' },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await adicionarGestor({
        email: values.email.trim(),
        nome: values.nome?.trim() || undefined,
        tipo: values.tipo,
      });
      form.reset({ email: '', nome: '', tipo: 'gerente' });
      toast.success('Acesso concedido!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao conceder acesso');
    }
  };

  const trocarPapel = async (gestor: Gestor, tipo: PapelDeGestao) => {
    try {
      await alterarPapel({ usuarioId: gestor.id, tipo });
      toast.success(`${gestor.nome} agora é ${ROTULO_PAPEL[tipo].toLowerCase()}.`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao alterar o papel');
    }
  };

  const confirmarRemocao = async () => {
    if (!aRemover) return;
    try {
      await removerGestor(aRemover.id);
      toast.success(`${aRemover.nome} não tem mais acesso a esta barbearia.`);
      setARemover(null);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao remover o acesso');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Quem tem acesso</CardTitle>
          <CardDescription>
            Proprietários administram tudo, inclusive os acessos. Gerentes operam
            o dia a dia, mas não mexem em quem entra.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isError ? (
            <p className="text-sm text-destructive">
              {(error as Error)?.message || 'Não foi possível carregar os acessos.'}
            </p>
          ) : isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <ul className="divide-y rounded-lg border">
              {gestores.map((gestor) => {
                const ehFundador = !!fundadorId && gestor.id === fundadorId;
                const ehVoce = gestor.id === user?.id;
                // O banco recusa mexer no fundador e em si mesmo; a UI antecipa
                // isso em vez de oferecer um botão que vai voltar com erro.
                const bloqueado = ehFundador || ehVoce;

                return (
                  <li key={gestor.id} className="flex flex-wrap items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 font-medium">
                        <span className="truncate">{gestor.nome}</span>
                        {ehFundador && (
                          <Badge variant="secondary" className="shrink-0 gap-1">
                            <Crown className="h-3 w-3" aria-hidden="true" />
                            Fundador
                          </Badge>
                        )}
                        {ehVoce && !ehFundador && (
                          <Badge variant="outline" className="shrink-0">
                            Você
                          </Badge>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {ROTULO_PAPEL[gestor.tipo] ?? gestor.tipo}
                      </p>
                    </div>

                    {podeGerenciarUsuarios && (
                      <div className="flex items-center gap-2">
                        <Select
                          value={gestor.tipo}
                          disabled={bloqueado}
                          onValueChange={(v) => void trocarPapel(gestor, v as PapelDeGestao)}
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="owner">Proprietário</SelectItem>
                            <SelectItem value="gerente">Gerente</SelectItem>
                          </SelectContent>
                        </Select>

                        <span
                          title={
                            ehFundador
                              ? 'O fundador da barbearia não pode ser removido'
                              : ehVoce
                                ? 'Você não pode remover o próprio acesso'
                                : undefined
                          }
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={bloqueado || isRemovendo}
                            onClick={() => setARemover(gestor)}
                            aria-label={`Remover acesso de ${gestor.nome}`}
                          >
                            <UserMinus className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {podeGerenciarUsuarios ? (
        <Card>
          <CardHeader>
            <CardTitle>Conceder acesso</CardTitle>
            <CardDescription>
              A pessoa precisa ter uma conta no CutHub. Peça para ela se
              cadastrar e informe o mesmo e-mail aqui.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail da conta</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="socio@exemplo.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome (opcional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Como aparecerá na lista" {...field} />
                        </FormControl>
                        <FormDescription>
                          Em branco, mantém o nome que a pessoa já usa.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="tipo"
                  render={({ field }) => (
                    <FormItem className="max-w-xs">
                      <FormLabel>Papel</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="gerente">Gerente</SelectItem>
                          <SelectItem value="owner">Proprietário</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={isAdicionando}>
                  {isAdicionando ? 'Concedendo...' : 'Conceder acesso'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      ) : (
        <div className="flex items-start gap-3 rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p>
            Só um proprietário pode conceder ou revogar acessos. Você continua
            com acesso normal ao restante do painel.
          </p>
        </div>
      )}

      <AlertDialog open={!!aRemover} onOpenChange={(aberto) => !aberto && setARemover(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover o acesso de {aRemover?.nome}?</AlertDialogTitle>
            <AlertDialogDescription>
              A conta continua existindo, mas deixa de enxergar e operar esta
              barbearia. Você pode conceder o acesso de novo depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmarRemocao()} disabled={isRemovendo}>
              {isRemovendo ? 'Removendo...' : 'Remover acesso'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
