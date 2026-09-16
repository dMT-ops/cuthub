import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Info } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useConfiguracoes } from '@/hooks/useConfiguracoes';

const schema = z
  .object({
    horario_abertura: z.string().min(1, 'Informe o horário de abertura'),
    horario_fechamento: z.string().min(1, 'Informe o horário de fechamento'),
  })
  .refine((v) => v.horario_fechamento > v.horario_abertura, {
    message: 'O fechamento precisa ser depois da abertura',
    path: ['horario_fechamento'],
  });

type FormValues = z.infer<typeof schema>;

/** A coluna TIME chega como "HH:MM:SS"; o input[type=time] trabalha com "HH:MM" */
const paraInput = (hora?: string) => (hora ? hora.slice(0, 5) : '');
const paraBanco = (hora: string) => (hora.length === 5 ? `${hora}:00` : hora);

interface HorarioFuncionamentoFormProps {
  horarioAbertura?: string;
  horarioFechamento?: string;
  isLoading: boolean;
}

export function HorarioFuncionamentoForm({
  horarioAbertura,
  horarioFechamento,
  isLoading,
}: HorarioFuncionamentoFormProps) {
  const { atualizarHorarioFuncionamento, isSalvandoHorario } = useConfiguracoes();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { horario_abertura: '', horario_fechamento: '' },
  });

  useEffect(() => {
    if (horarioAbertura && horarioFechamento) {
      form.reset({
        horario_abertura: paraInput(horarioAbertura),
        horario_fechamento: paraInput(horarioFechamento),
      });
    }
  }, [horarioAbertura, horarioFechamento, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      await atualizarHorarioFuncionamento({
        horario_abertura: paraBanco(values.horario_abertura),
        horario_fechamento: paraBanco(values.horario_fechamento),
      });
      form.reset(values);
      toast.success('Horário de funcionamento atualizado!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar o horário de funcionamento');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Horário de funcionamento</CardTitle>
        <CardDescription>Define a faixa de horas desenhada nas visões de dia e semana da Agenda.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex gap-4">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <FormField
                  control={form.control}
                  name="horario_abertura"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Abertura</FormLabel>
                      <FormControl>
                        <Input type="time" className="w-36" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="horario_fechamento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fechamento</FormLabel>
                      <FormControl>
                        <Input type="time" className="w-36" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Este horário é apenas a moldura da agenda. Os horários oferecidos ao marcar um
                atendimento vêm da jornada de trabalho cadastrada em cada profissional.
              </p>

              <Button type="submit" disabled={isSalvandoHorario || !form.formState.isDirty}>
                {isSalvandoHorario ? 'Salvando...' : 'Salvar'}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
