import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { ImagePlus, Trash2 } from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/AuthContext';
import { useProdutos } from '@/hooks/useProdutos';
import { useImageUpload } from '@/hooks/useImageUpload';
import type { Database } from '@/types/database.types';

type Produto = Database['public']['Tables']['produto']['Row'];

const BUCKET = 'produtos';

const schema = z.object({
  nome: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres').max(255, 'Máximo de 255 caracteres'),
  descricao: z.string().max(1000, 'A descrição está muito longa').optional(),
  preco: z.coerce.number().min(0, 'O preço não pode ser negativo'),
  // Espelha o CHECK do banco. Validar aqui evita a ida ao servidor só para
  // receber a recusa.
  quantidade: z.coerce.number().int('Informe um número inteiro').min(0, 'O estoque não pode ser negativo'),
  ordem: z.coerce.number().int('Informe um número inteiro').min(0, 'A ordem não pode ser negativa'),
  // A imagem mora no formulário, e não num useState à parte: assim o
  // `form.reset` cuida da sincronização quando o diálogo abre em outro produto,
  // e não é preciso um efeito com setState para acompanhá-la.
  imagem_url: z.string().nullable(),
});

type FormValues = z.infer<typeof schema>;

const VALORES_PADRAO: FormValues = {
  nome: '',
  descricao: '',
  preco: 0,
  quantidade: 0,
  ordem: 0,
  imagem_url: null,
};

interface ProdutoFormDialogProps {
  produto: Produto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProdutoFormDialog({ produto, open, onOpenChange }: ProdutoFormDialogProps) {
  const { barbeariaId } = useAuth();
  const { criarProduto, atualizarProduto, isCriando, isAtualizando } = useProdutos(barbeariaId);

  const inputRef = useRef<HTMLInputElement>(null);
  const { uploadImage, removeImage, isUploading } = useImageUpload({ bucket: BUCKET });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: VALORES_PADRAO,
  });

  useEffect(() => {
    if (!open) return;

    if (produto) {
      form.reset({
        nome: produto.nome,
        descricao: produto.descricao || '',
        preco: Number(produto.preco),
        quantidade: produto.quantidade,
        ordem: produto.ordem,
        imagem_url: produto.imagem_url,
      });
    } else {
      form.reset(VALORES_PADRAO);
    }
  }, [produto, open, form]);

  const aoEscolherImagem = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    const anterior = form.getValues('imagem_url');
    const nova = await uploadImage(arquivo);
    if (!nova) return;
    form.setValue('imagem_url', nova, { shouldDirty: true });
    // Limpeza do arquivo antigo: não é crítica e não derruba o fluxo.
    if (anterior) void removeImage(anterior);
  };

  const onSubmit = async (values: FormValues) => {
    const payload = {
      nome: values.nome.trim(),
      descricao: values.descricao?.trim() || null,
      preco: values.preco,
      quantidade: values.quantidade,
      ordem: values.ordem,
      imagem_url: values.imagem_url,
    };

    try {
      if (produto) {
        await atualizarProduto({ id: produto.id, updates: payload });
        toast.success('Produto atualizado!');
      } else {
        await criarProduto(payload);
        toast.success('Produto cadastrado!');
      }
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar o produto');
    }
  };

  const isSalvando = isCriando || isAtualizando;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{produto ? 'Editar produto' : 'Novo produto'}</DialogTitle>
          <DialogDescription>
            Produtos ativos aparecem na vitrine do cliente. O estoque fica só
            para a barbearia.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="imagem_url"
              render={({ field }) => (
                <div className="flex items-start gap-4">
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg border bg-muted/30">
                    {field.value ? (
                      <img src={field.value} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <ImagePlus className="h-5 w-5" aria-hidden="true" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <input
                      ref={inputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        void aoEscolherImagem(e.target.files?.[0]);
                        // Sem isto, escolher o mesmo arquivo duas vezes seguidas
                        // não dispara o onChange na segunda.
                        e.target.value = '';
                      }}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isUploading}
                        onClick={() => inputRef.current?.click()}
                      >
                        {isUploading ? 'Enviando...' : field.value ? 'Trocar' : 'Enviar imagem'}
                      </Button>
                      {field.value && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isUploading}
                          onClick={() => {
                            const anterior = field.value;
                            field.onChange(null);
                            if (anterior) void removeImage(anterior);
                          }}
                        >
                          <Trash2 className="mr-1 h-4 w-4" aria-hidden="true" />
                          Remover
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">JPG, PNG ou WEBP, até 2 MB.</p>
                  </div>
                </div>
              )}
            />

            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Pomada modeladora" {...field} />
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
                      rows={3}
                      placeholder="Para que serve, como usar..."
                      className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-3">
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
                name="quantidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estoque</FormLabel>
                    <FormControl>
                      <Input type="number" step="1" min="0" {...field} />
                    </FormControl>
                    <FormDescription>Não aparece para o cliente.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ordem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ordem</FormLabel>
                    <FormControl>
                      <Input type="number" step="1" min="0" {...field} />
                    </FormControl>
                    <FormDescription>Menor aparece antes.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSalvando || isUploading}>
                {isSalvando ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
