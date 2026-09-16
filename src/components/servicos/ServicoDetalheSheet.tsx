import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, Clock, CheckCircle2, Pencil, Trash2 } from 'lucide-react';
import { useServicos, useServicoDetalhes } from '@/hooks/useServicos';
import { useAuth } from '@/lib/auth/AuthContext';
import { ImageUpload } from '@/components/shared/ImageUpload';
import { toast } from 'sonner';

interface ServicoDetalheSheetProps {
  id: string | null;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
}

export function ServicoDetalheSheet({ id, onOpenChange, onEdit }: ServicoDetalheSheetProps) {
  const { barbeariaId } = useAuth();
  const { servicos, alternarStatus, atualizarServico, isAlternandoStatus } = useServicos(barbeariaId);
  const servico = servicos.find(s => s.id === id);
  const { data: detalhes, isLoading: loadingDetalhes } = useServicoDetalhes(id);

  if (!id || !servico) return null;

  const isInactive = servico.status === 'inativo';

  const handleAlternarStatus = async () => {
    try {
      await alternarStatus({ id: servico.id, status: isInactive ? 'ativo' : 'inativo' });
      toast.success(`Serviço ${isInactive ? 'ativado' : 'inativado'} com sucesso!`);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao alterar status do serviço');
    }
  };

  return (
    <Sheet open={!!id} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-2xl">{servico.nome}</SheetTitle>
            <Badge variant={isInactive ? 'destructive' : 'default'} className="ml-2">
              {isInactive ? 'Inativo' : 'Ativo'}
            </Badge>
          </div>
          <SheetDescription className="capitalize">
            Categoria: {servico.categoria}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {/* Imagem do Serviço */}
          <section>
            <h4 className="font-semibold mb-3">Foto do Serviço</h4>
            <ImageUpload
              bucket="servicos"
              className="aspect-video w-full"
              currentUrl={servico.imagem_url}
              onUploadSuccess={async (url) => {
                try {
                  await atualizarServico({ id: servico.id, updates: { imagem_url: url } });
                  toast.success('Imagem atualizada com sucesso!');
                } catch (e: any) {
                  toast.error(e.message || 'Erro ao vincular a imagem ao serviço');
                }
              }}
              onRemove={async () => {
                try {
                  await atualizarServico({ id: servico.id, updates: { imagem_url: null } });
                  toast.success('Imagem removida.');
                } catch (e: any) {
                  toast.error(e.message || 'Erro ao remover a imagem do serviço');
                }
              }}
            />
          </section>

          <Separator />

          {/* Dados Cadastrais */}
          <section className="space-y-4">
            <h4 className="font-semibold">Informações</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1 p-3 bg-muted/30 rounded-lg">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3 w-3" /> Valor Atual
                </span>
                <span className="font-medium text-lg">
                  R$ {Number(servico.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              
              <div className="flex flex-col gap-1 p-3 bg-muted/30 rounded-lg">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Duração
                </span>
                <span className="font-medium text-lg">
                  {servico.duracao_minutos} min
                </span>
              </div>
            </div>
          </section>

          <Separator />

          {/* Métricas e Estatísticas */}
          <section className="space-y-4">
            <h4 className="font-semibold">Estatísticas Históricas</h4>
            
            {loadingDetalhes ? (
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-[72px] rounded-lg" />
                <Skeleton className="h-[72px] rounded-lg" />
              </div>
            ) : detalhes ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1 p-3 bg-primary/5 rounded-lg border border-primary/10">
                  <span className="text-xs text-primary flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Realizados
                  </span>
                  <span className="font-bold text-xl text-primary">
                    {detalhes.estatisticas.atendimentos}
                  </span>
                </div>
                
                <div className="flex flex-col gap-1 p-3 bg-green-500/5 rounded-lg border border-green-500/10">
                  <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <DollarSign className="h-3 w-3" /> Faturamento
                  </span>
                  <span className="font-bold text-xl text-green-600 dark:text-green-400">
                    R$ {detalhes.estatisticas.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Não foi possível carregar as métricas.</p>
            )}
          </section>

          {/* Ações */}
          <section className="pt-6 flex flex-col gap-2">
            <Button variant="outline" onClick={onEdit} className="w-full justify-start">
              <Pencil className="mr-2 h-4 w-4" />
              Editar Informações
            </Button>
            
            <Button 
              variant={isInactive ? 'default' : 'destructive'} 
              className="w-full justify-start"
              onClick={handleAlternarStatus}
              disabled={isAlternandoStatus}
            >
              {isInactive ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Reativar Serviço
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" /> Inativar Serviço
                </>
              )}
            </Button>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
