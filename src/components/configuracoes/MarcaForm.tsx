import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { ImagePlus, Trash2 } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useMarca } from '@/hooks/useMarca';
import { SeletorDeCor } from './SeletorDeCor';
import type { Database } from '@/types/database.types';

type ConfiguracaoBarbearia = Database['public']['Tables']['configuracao_barbearia']['Row'];

const BUCKET = 'barbearia_assets';
const CINCO_MB = 5 * 1024 * 1024;

/** Mesmo formato que o CHECK do banco exige. */
const HEX = /^#[0-9A-Fa-f]{6}$/;

const schema = z.object({
  // Validar aqui evita a ida ao servidor só para receber a recusa.
  tema_cor_primaria: z
    .string()
    .regex(HEX, 'Use um hexadecimal de 6 dígitos, como #F0B323')
    .or(z.literal('')),
  tema_descricao: z.string().max(1000, 'Máximo de 1000 caracteres').or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

interface MarcaFormProps {
  configuracao?: ConfiguracaoBarbearia;
  isLoading: boolean;
}

/** Campo de imagem: pré-visualização, troca e remoção. */
function CampoImagem({
  rotulo,
  descricao,
  url,
  onChange,
  proporcao,
}: {
  rotulo: string;
  descricao: string;
  url: string | null;
  onChange: (url: string | null) => void;
  proporcao: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { uploadImage, removeImage, isUploading } = useImageUpload({
    bucket: BUCKET,
    maxBytes: CINCO_MB,
  });

  const aoEscolher = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    const anterior = url;
    const nova = await uploadImage(arquivo);
    if (!nova) return;
    onChange(nova);
    // Limpeza do arquivo antigo: não é crítica e não derruba o fluxo.
    if (anterior) void removeImage(anterior);
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{rotulo}</p>
      <div className={`relative overflow-hidden rounded-lg border bg-muted/30 ${proporcao}`}>
        {url ? (
          <img src={url} alt={rotulo} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImagePlus className="h-6 w-6" aria-hidden="true" />
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          void aoEscolher(e.target.files?.[0]);
          // Sem isto, escolher o mesmo arquivo duas vezes seguidas não dispara
          // o onChange na segunda.
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
          {isUploading ? 'Enviando...' : url ? 'Trocar' : 'Enviar'}
        </Button>
        {url && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isUploading}
            onClick={() => {
              onChange(null);
              void removeImage(url);
            }}
          >
            <Trash2 className="mr-1 h-4 w-4" aria-hidden="true" />
            Remover
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{descricao}</p>
    </div>
  );
}

export function MarcaForm({ configuracao, isLoading }: MarcaFormProps) {
  const { atualizarMarca, isSalvando } = useMarca();

  // Imagens ficam fora do react-hook-form: elas são gravadas no storage no
  // momento do upload, e o formulário só carrega a URL resultante.
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [imagensSujas, setImagensSujas] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { tema_cor_primaria: '', tema_descricao: '' },
  });

  useEffect(() => {
    if (!configuracao) return;
    form.reset({
      tema_cor_primaria: configuracao.tema_cor_primaria ?? '',
      tema_descricao: configuracao.tema_descricao ?? '',
    });
    setLogoUrl(configuracao.tema_logo_url ?? null);
    setBannerUrl(configuracao.tema_banner_url ?? null);
    setImagensSujas(false);
  }, [configuracao, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      await atualizarMarca({
        tema_cor_primaria: values.tema_cor_primaria || null,
        tema_descricao: values.tema_descricao || null,
        tema_logo_url: logoUrl,
        tema_banner_url: bannerUrl,
      });
      form.reset(values);
      setImagensSujas(false);
      toast.success('Identidade da barbearia atualizada!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar a identidade');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Identidade e marca</CardTitle>
        <CardDescription>
          Como a sua barbearia se apresenta. É o que o cliente verá.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-32 w-full max-w-md" />
            <Skeleton className="h-10 w-40" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <CampoImagem
                  rotulo="Logo"
                  descricao="JPG, PNG ou WEBP, até 5 MB."
                  url={logoUrl}
                  proporcao="h-32 w-32"
                  onChange={(u) => {
                    setLogoUrl(u);
                    setImagensSujas(true);
                  }}
                />
                <CampoImagem
                  rotulo="Banner"
                  descricao="Imagem de capa. JPG, PNG ou WEBP, até 5 MB."
                  url={bannerUrl}
                  proporcao="h-32 w-full"
                  onChange={(u) => {
                    setBannerUrl(u);
                    setImagensSujas(true);
                  }}
                />
              </div>

              <FormField
                control={form.control}
                name="tema_cor_primaria"
                render={({ field }) => (
                  <FormItem className="max-w-xl">
                    <FormLabel>Cor principal</FormLabel>
                    <FormControl>
                      <SeletorDeCor valor={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormDescription>
                      Usada no seu perfil público. Antes ela era só digitada, e
                      dava para escolher um tom que deixava o botão de agendar
                      ilegível sem ninguém perceber.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tema_descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <textarea
                        rows={4}
                        placeholder="Conte em poucas linhas o que a sua barbearia faz de melhor."
                        className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={isSalvando || (!form.formState.isDirty && !imagensSujas)}
              >
                {isSalvando ? 'Salvando...' : 'Salvar'}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
