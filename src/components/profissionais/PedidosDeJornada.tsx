import { Check, Clock3, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSolicitacoesDeJornada } from '@/hooks/useHorarios';
import { descreverSolicitacao } from '@/services/horarios.service';
import type { SolicitacaoJornada } from '@/services/horarios.service';

/**
 * O que o profissional pediu na jornada e ainda não foi respondido.
 *
 * Esta tela existe porque a 00028 acertou o modelo e deixou o barbeiro cego.
 * A proposta saiu de dentro de `horario_trabalho` — que é o que impede um
 * "não" do dono de destruir a jornada vigente — mas `JornadaTrabalho` continuou
 * lendo só `horario_trabalho`. Medido no banco: depois de salvar, a tela do
 * barbeiro voltava a exibir o horário **antigo**, sem nenhum sinal do pedido.
 * O único aviso era um toast, que some.
 *
 * O efeito colateral era pior que a confusão: sem ver o pedido, ele salvava de
 * novo, e a fila do dono enchia de linhas idênticas.
 */
export function PedidosDeJornada({ profissionalId }: { profissionalId: string }) {
  const { solicitacoes, isLoading, cancelar, isCancelando } =
    useSolicitacoesDeJornada(profissionalId);

  const retirar = async (s: SolicitacaoJornada) => {
    try {
      await cancelar(s.id);
      toast.success('Pedido retirado. Sua jornada continua como está.');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao retirar o pedido');
    }
  };

  if (isLoading) {
    return <Skeleton className="h-16 w-full rounded-lg" />;
  }

  // Nada pedido, nada respondido há pouco: sem card. Um bloco permanente
  // dizendo "nenhum pedido" é ruído numa tela que já é densa.
  if (solicitacoes.length === 0) {
    return null;
  }

  const pendentes = solicitacoes.filter((s) => s.status === 'pendente').length;

  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/5">
      <div className="flex items-center gap-2 border-b border-amber-500/30 px-4 py-3">
        <Clock3 className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        <div>
          <h4 className="text-sm font-semibold">Seus pedidos de jornada</h4>
          <p className="text-xs text-muted-foreground">
            {pendentes > 0
              ? `${pendentes} aguardando a gestão. Até a resposta, a jornada abaixo é a que vale na agenda.`
              : 'Nada aguardando. Abaixo, o que a gestão respondeu nos últimos dias.'}
          </p>
        </div>
      </div>
      <ul className="divide-y divide-amber-500/20">
        {solicitacoes.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
            <p className="min-w-0 text-sm">
              Você pediu para <span className="font-medium">{descreverSolicitacao(s)}</span>
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <Selo status={s.status} />
              {s.status === 'pendente' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Retirar pedido"
                  disabled={isCancelando}
                  onClick={() => retirar(s)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Selo({ status }: { status: 'pendente' | 'aprovado' | 'rejeitado' }) {
  const estilos = {
    pendente: {
      classe: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
      icone: <Clock3 className="h-3 w-3" aria-hidden="true" />,
      texto: 'aguardando',
    },
    aprovado: {
      classe: 'bg-green-600/10 text-green-700 dark:text-green-400',
      icone: <Check className="h-3 w-3" aria-hidden="true" />,
      texto: 'aprovado',
    },
    rejeitado: {
      classe: 'bg-red-600/10 text-red-700 dark:text-red-400',
      icone: <X className="h-3 w-3" aria-hidden="true" />,
      texto: 'recusado',
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
