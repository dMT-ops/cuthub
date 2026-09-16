import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle } from 'lucide-react';
import { useProfissionais } from '@/hooks/useProfissionais';
import { useAuth } from '@/lib/auth/AuthContext';

const normalizePhone = (value: string | undefined) => {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
  }
  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
};

const formSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(255, 'Máximo de 255 caracteres'),
  especialidade: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  bio: z.string().max(1000, 'A bio está muito longa').optional(),
  comissao_percentual: z.coerce
    .number({
      required_error: "A comissão é obrigatória",
      invalid_type_error: "Deve ser um número",
    })
    .min(0, 'A comissão não pode ser menor que 0')
    .max(100, 'A comissão não pode ser maior que 100'),
  status: z.enum(['ativo', 'inativo']).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ProfissionalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profissionalAEditar?: any | null; 
}

export function ProfissionalFormDialog({ open, onOpenChange, profissionalAEditar }: ProfissionalFormDialogProps) {
  const { barbeariaId } = useAuth();
  const { cadastrarProfissionalComConta, atualizarProfissional } = useProfissionais(barbeariaId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: '',
      especialidade: '',
      telefone: '',
      email: '',
      bio: '',
      comissao_percentual: 50,
      status: 'ativo'
    }
  });

  useEffect(() => {
    if (open) {
      setFormError('');
      if (profissionalAEditar) {
        form.reset({
          nome: profissionalAEditar.nome,
          especialidade: profissionalAEditar.especialidade || '',
          telefone: normalizePhone(profissionalAEditar.telefone),
          email: profissionalAEditar.email || '',
          bio: profissionalAEditar.bio || '',
          comissao_percentual: Number(profissionalAEditar.comissao_percentual),
          status: profissionalAEditar.status || 'ativo'
        });
      } else {
        form.reset({
          nome: '',
          especialidade: '',
          telefone: '',
          email: '',
          bio: '',
          comissao_percentual: 50,
          status: 'ativo'
        });
      }
    }
  }, [open, profissionalAEditar, form]);

  const onSubmit = async (values: FormValues) => {
    if (!barbeariaId) return;
    setIsSubmitting(true);
    setFormError('');

    try {
      const payload = {
        barbearia_id: barbeariaId,
        nome: values.nome,
        especialidade: values.especialidade || null,
        telefone: values.telefone ? values.telefone.replace(/\D/g, '') : null,
        email: values.email ? values.email.trim() : null,
        bio: values.bio || null,
        comissao_percentual: values.comissao_percentual,
        ...(profissionalAEditar ? { status: values.status } : {}) 
      };

      if (profissionalAEditar) {
        await atualizarProfissional({ id: profissionalAEditar.id, updates: payload });
        toast.success('Profissional atualizado com sucesso!');
      } else {
        // O cadastro passa pela função do banco, que vincula o profissional a
        // uma conta existente quando o e-mail já pertence a um usuário do sistema
        const resultado = await cadastrarProfissionalComConta({
          barbeariaId: payload.barbearia_id,
          nome: payload.nome,
          email: payload.email,
          telefone: payload.telefone,
          especialidade: payload.especialidade,
          bio: payload.bio,
          comissaoPercentual: payload.comissao_percentual,
        });

        toast.success(
          resultado.contaVinculada
            ? 'Profissional cadastrado e vinculado à conta existente!'
            : 'Profissional cadastrado com sucesso!'
        );
      }
      onOpenChange(false);
    } catch (err: any) {
      setFormError(err.message || 'Falha ao salvar profissional');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{profissionalAEditar ? 'Editar Profissional' : 'Novo Profissional'}</DialogTitle>
          <DialogDescription>
            {profissionalAEditar ? 'Atualize as informações do profissional.' : 'Preencha os dados do novo barbeiro.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            {formError && (
              <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do profissional" autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="especialidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Especialidade</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Fade, Barba..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="comissao_percentual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comissão *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type="number" step="0.1" min="0" max="100" className="pr-8" {...field} />
                        <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">%</span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="telefone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="(00) 00000-0000" 
                        {...field} 
                        onChange={(e) => field.onChange(normalizePhone(e.target.value))}
                        maxLength={15}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input placeholder="email@exemplo.com" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                    {!profissionalAEditar && (
                      <p className="text-[11px] text-muted-foreground">
                        Se já existir uma conta com este e-mail, o profissional será vinculado a ela.
                      </p>
                    )}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Biografia (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Um breve resumo sobre a experiência do profissional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {profissionalAEditar && (
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ativo">Ativo</SelectItem>
                          <SelectItem value="inativo">Inativo</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
