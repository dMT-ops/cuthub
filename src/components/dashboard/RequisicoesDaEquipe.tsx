import { useState } from 'react';
import { CalendarOff, Check, Clock3, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRequisicoesPendentes } from '@/hooks/useEscala';
import type { RequisicaoPendente } from '@/services/escala.service';

/**
 * Fila de aprovação do dono.
 *
 * Só aparece quando há o que responder: um card permanente dizendo "nenhuma
 * requisição" vira ruído no painel que o dono abre todo dia.
 */
export function RequisicoesDaEquipe() {
  const { barbeariaId, podeOperar } = useAuth();
  const { requisicoes, isLoading, responder } = useRequisicoesPendentes(barbeariaId);
  const [respondendoId, setRespondendoId] = useState<string | null>(null);

  const decidir = async (req: RequisicaoPendente, status: 'aprovado' | 'rejeitado') => {
    setRespondendoId(req.id);
    try {
      await responder({ tipo: req.tipo, id: req.id, status });
      toast.success(
        status === 'aprovado'
          ? `Aprovado. A agenda de ${req.profissionalNome} já reflete isso.`
          : `Recusado. Nada mudou na agenda de ${req.profissionalNome}.`
      );
    } catch (error: any) {
      toast.error(error.message || 'Erro ao responder a requisição');
    } finally {
      setRespondendoId(null);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-24 w-full rounded-lg" />;
  }

  if (requisicoes.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/5">
      <div className="flex items-center gap-2 border-b border-amber-500/30 px-4 py-3">
        <Clock3 className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        <div>
          <h3 className="font-semibold">Requisições da equipe</h3>
          <p className="text-xs text-muted-foreground">
            {requisicoes.length} pedido(s) aguardando você. Até a sua resposta, a agenda dos
            clientes segue como está.
          </p>
        </div>
      </div>
      <ul className="divide-y divide-amber-500/20">
        {requisicoes.map((req) => (
          <li key={`${req.tipo}-${req.id}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                <span className="font-semibold">{req.profissionalNome}</span> · {req.descricao}
              </p>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarOff className="h-3 w-3" aria-hidden="true" />
                {req.quando}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!podeOperar || respondendoId === req.id}
                onClick={() => decidir(req, 'rejeitado')}
              >
                <X className="mr-1.5 h-3.5 w-3.5" /> Recusar
              </Button>
              <Button
                size="sm"
                disabled={!podeOperar || respondendoId === req.id}
                onClick={() => decidir(req, 'aprovado')}
              >
                <Check className="mr-1.5 h-3.5 w-3.5" /> Aprovar
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
