import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { isFuture, parseISO } from 'date-fns';
import { toast } from 'sonner';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle } from 'lucide-react';
import { useClientes } from '@/hooks/useClientes';
import { useAuth } from '@/lib/auth/AuthContext';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

// Máscara básica para telefone BR (apenas visual e envio, o backend aceita varchar)
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
  telefone: z.string().optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  data_nascimento: z.string().optional().refine(val => {
    if (!val) return true;
    const date = parseISO(val);
    return !isFuture(date);
  }, 'A data não pode ser no futuro'),
  observacoes: z.string().optional(),
  status: z.enum(['ativo', 'inativo']).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ClienteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteAEditar?: any | null; 
}

export function ClienteFormDialog({ open, onOpenChange, clienteAEditar }: ClienteFormDialogProps) {
  const { barbeariaId } = useAuth();
  const { criarCliente, atualizarCliente, verificarDuplicidade } = useClientes(barbeariaId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; message: string; payload: any } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: '',
      telefone: '',
      email: '',
      data_nascimento: '',
      observacoes: '',
      status: 'ativo'
    }
  });

  useEffect(() => {
    if (open) {
      setFormError('');
      if (clienteAEditar) {
        form.reset({
          nome: clienteAEditar.nome,
          telefone: normalizePhone(clienteAEditar.telefone),
          email: clienteAEditar.email || '',
          data_nascimento: clienteAEditar.data_nascimento || '',
          observacoes: clienteAEditar.observacoes || '',
          status: clienteAEditar.status || 'ativo'
        });
      } else {
        form.reset({
          nome: '',
          telefone: '',
          email: '',
          data_nascimento: '',
          observacoes: '',
          status: 'ativo'
        });
      }
    }
  }, [open, clienteAEditar, form]);

  const execSave = async (payload: any) => {
    try {
      if (clienteAEditar) {
        await atualizarCliente({ id: clienteAEditar.id, updates: payload });
        toast.success('Cliente atualizado com sucesso!');
      } else {
        await criarCliente(payload);
        toast.success('Cliente cadastrado com sucesso!');
      }
      onOpenChange(false);
    } catch (err: any) {
      setFormError(err.message || 'Falha ao salvar cliente');
    } finally {
      setIsSubmitting(false);
      setConfirmDialog(null);
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!barbeariaId) return;
    setIsSubmitting(true);
    setFormError('');

    try {
      const telClean = values.telefone ? values.telefone.replace(/\D/g, '') : null;
      const emailVal = values.email ? values.email.trim() : null;
      
      const dup = await verificarDuplicidade(telClean, emailVal, clienteAEditar?.id);
      
      const payload = {
        barbearia_id: barbeariaId,
        nome: values.nome,
        telefone: telClean,
        email: emailVal,
        data_nascimento: values.data_nascimento || null,
        observacoes: values.observacoes || null,
        ...(clienteAEditar ? { status: values.status } : {}) 
      };

      if (dup.telefoneDuplicado || dup.emailDuplicado) {
        let msg = 'Já existe um cliente cadastrado com este ';
        if (dup.telefoneDuplicado && dup.emailDuplicado) msg += 'telefone e e-mail.';
        else if (dup.telefoneDuplicado) msg += 'telefone.';
        else msg += 'e-mail.';
        msg += ' Deseja cadastrar mesmo assim?';
        
        // Em vez de window.confirm, abrimos o state do Alert Dialog.
        setConfirmDialog({ open: true, message: msg, payload });
        return; // não finalizamos o isSubmitting ainda
      }

      await execSave(payload);
    } catch (err: any) {
      setFormError(err.message || 'Falha ao verificar duplicidade');
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{clienteAEditar ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
            <DialogDescription>
              {clienteAEditar ? 'Atualize as informações do cliente.' : 'Preencha os dados do novo cliente.'}
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

              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do cliente" autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
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
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="data_nascimento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Nascimento</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Input placeholder="Preferências, alergias..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {clienteAEditar && (
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
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

      {confirmDialog && (
        <ConfirmDialog
          open={confirmDialog.open}
          onOpenChange={(op) => {
            if (!op) {
              setConfirmDialog(null);
              setIsSubmitting(false); // Libera o loading do form original
            }
          }}
          title="Aviso de Duplicidade"
          description={confirmDialog.message}
          confirmText="Salvar mesmo assim"
          onConfirm={() => execSave(confirmDialog.payload)}
        />
      )}
    </>
  );
}
