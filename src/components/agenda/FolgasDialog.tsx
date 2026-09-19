import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { CalendarOff, Clock3, Loader2, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth/AuthContext';
import { useFolgasDoProfissional } from '@/hooks/useEscala';
import type { Bloqueio } from '@/services/escala.service';

interface FolgasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Ficha do profissional dono desta agenda. */
  profissionalId: string | null;
  profissionalNome?: string;
}

/**
 * Folgas de um profissional.
 *
 * Primeira tela que ESCREVE em `bloqueio`: a tabela existia desde o começo, a
 * disponibilidade já a respeitava, e nada no produto a alimentava — a Landing
 * anunciava "bloqueios de agenda" que não dava para criar.
 *
 * Quem é profissional cria uma SOLICITAÇÃO; quem é gestor cria a folga já
 * valendo. Não é escolha da tela: a RLS obriga `pendente` no insert do
 * profissional, e a tela diz isso em vez de deixar o banco recusar sem
 * explicação.
 */
export function FolgasDialog({
  open,
  onOpenChange,
  profissionalId,
  profissionalNome,
}: FolgasDialogProps) {
  const { barbeariaId, perfil, tipo } = useAuth();
  const ehProfissional = tipo === 'profissional';
  const { folgas, isLoading, criarFolga, isCriando, cancelarFolga } =
    useFolgasDoProfissional(profissionalId);

  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [motivo, setMotivo] = useState('');

  const rotuloDeEnvio = ehProfissional ? 'Pedir folga' : 'Bloquear horário';

  const podeEnviar = useMemo(() => {
    if (!inicio || !fim) return false;
    return new Date(fim) > new Date(inicio);
  }, [inicio, fim]);

  const enviar = async () => {
    if (!barbeariaId || !profissionalId) {
      toast.error('Profissional não identificado.');
      return;
    }
    if (!podeEnviar) {
      toast.error('O fim precisa ser depois do início.');
      return;
    }
    try {
      await criarFolga({
        barbeariaId,
        profissionalId,
        inicio: new Date(inicio).toISOString(),
        fim: new Date(fim).toISOString(),
        motivo: motivo.trim() || null,
        comoSolicitacao: ehProfissional,
        solicitadoPor: perfil?.id ?? null,
      });
      toast.success(
        ehProfissional
          ? 'Folga solicitada. Ela só vale depois que o dono aprovar.'
          : 'Horário bloqueado na agenda.'
      );
      setInicio('');
      setFim('');
      setMotivo('');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao registrar a folga');
    }
  };

  const remover = async (folga: Bloqueio) => {
    try {
      await cancelarFolga(folga.id);
      toast.success('Folga removida.');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao remover a folga');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>
            {ehProfissional ? 'Minhas folgas' : `Folgas de ${profissionalNome ?? 'profissional'}`}
          </DialogTitle>
        </DialogHeader>

        {ehProfissional && (
          <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
            O que você pedir aqui fica <strong>aguardando aprovação</strong> do dono. Até lá a sua
            agenda continua aberta para os clientes.
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="folga-inicio">Início</Label>
            <Input
              id="folga-inicio"
              type="datetime-local"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="folga-fim">Fim</Label>
            <Input
              id="folga-fim"
              type="datetime-local"
              value={fim}
              onChange={(e) => setFim(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="folga-motivo">Motivo (opcional)</Label>
          <Input
            id="folga-motivo"
            placeholder="Ex: consulta médica"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </div>

        <Button onClick={enviar} disabled={!podeEnviar || isCriando}>
          {isCriando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {rotuloDeEnvio}
        </Button>

        <div className="border-t pt-3">
          <h3 className="mb-2 text-sm font-semibold">Próximas folgas</h3>
          {isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : folgas.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarOff className="h-4 w-4" /> Nenhuma folga marcada daqui para frente.
            </p>
          ) : (
            <ul className="max-h-52 divide-y overflow-y-auto">
              {folgas.map((folga) => (
                <li key={folga.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {format(new Date(folga.data_hora_inicio), 'dd/MM HH:mm')} —{' '}
                      {format(new Date(folga.data_hora_fim), 'dd/MM HH:mm')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {folga.motivo || 'Sem motivo informado'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Selo status={folga.status_aprovacao} />
                    {folga.status_aprovacao === 'pendente' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label="Cancelar pedido"
                        onClick={() => remover(folga)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Selo({ status }: { status: 'pendente' | 'aprovado' | 'rejeitado' }) {
  const estilos = {
    pendente: {
      classe: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
      icone: <Clock3 className="h-3 w-3" />,
      texto: 'aguardando',
    },
    aprovado: {
      classe: 'bg-green-600/10 text-green-700 dark:text-green-400',
      icone: null,
      texto: 'aprovada',
    },
    rejeitado: {
      classe: 'bg-red-600/10 text-red-700 dark:text-red-400',
      icone: <X className="h-3 w-3" />,
      texto: 'recusada',
    },
  }[status];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${estilos.classe}`}
    >
      {estilos.icone}
      {estilos.texto}
    </span>
  );
}
