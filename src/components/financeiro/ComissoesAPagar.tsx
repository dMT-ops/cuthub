import { useState } from 'react';
import { CheckCircle2, Loader2, Percent } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatarMoeda } from '@/lib/utils';
import { useAuth } from '@/lib/auth/AuthContext';
import { useFinanceiro } from '@/hooks/useFinanceiro';
import type { ComissaoAPagar } from '@/services/financeiro.service';

interface ComissoesAPagarProps {
  comissoes: ComissaoAPagar[];
  isLoading: boolean;
  periodo: { inicio: string; fim: string };
  rotuloDoPeriodo: string;
}

/**
 * Comissão devida a cada profissional no período, sobre a receita já lançada.
 *
 * Mesma filosofia do AtendimentosAReceber: o sistema apura e mostra, mas o
 * lançamento só acontece quando o gestor confirma. A comissão era a maior
 * despesa de uma barbearia e a única que o sistema calculava sem registrar --
 * o saldo do caixa ficava alto demais por causa disso.
 */
export function ComissoesAPagar({ comissoes, isLoading, periodo, rotuloDoPeriodo }: ComissoesAPagarProps) {
  const { barbeariaId, user, podeOperar, motivoBloqueio } = useAuth();
  const { criarLancamento } = useFinanceiro(barbeariaId, periodo);
  const [pagandoId, setPagandoId] = useState<string | null>(null);

  const pagar = async (comissao: ComissaoAPagar) => {
    if (!barbeariaId) {
      toast.error('Barbearia não identificada.');
      return;
    }
    setPagandoId(comissao.profissionalId);
    try {
      await criarLancamento({
        barbearia_id: barbeariaId,
        profissional_id: comissao.profissionalId,
        tipo: 'saida',
        categoria: 'comissao',
        valor: comissao.pendente,
        // A data e o fim do periodo em tela, e nao "agora": a comissao pertence
        // ao mes que a gerou. Lancar com a data de hoje jogaria a despesa de
        // setembro dentro de outubro e o resumo dos dois meses ficaria errado.
        data_lancamento: periodo.fim,
        descricao: `Comissão ${comissao.percentual.toFixed(0)}% — ${comissao.profissionalNome} — ${rotuloDoPeriodo}`,
        criado_por: user?.id ?? null,
      });
      toast.success(`Comissão de ${comissao.profissionalNome} registrada no caixa.`);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao registrar a comissão');
    } finally {
      setPagandoId(null);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-24 w-full rounded-lg" />;
  }

  const pendentes = comissoes.filter((c) => c.pendente > 0);

  if (comissoes.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        <Percent className="h-4 w-4" />
        Nenhuma receita de atendimento lançada no período — não há comissão a apurar.
      </div>
    );
  }

  if (pendentes.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
        Todas as comissões do período já foram pagas.
      </div>
    );
  }

  const total = pendentes.reduce((soma, c) => soma + c.pendente, 0);

  return (
    <div className="rounded-lg border">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h3 className="font-semibold">Comissões a pagar</h3>
          <p className="text-xs text-muted-foreground">
            {pendentes.length} profissional(is) somando {formatarMoeda(total)} — calculado sobre a
            receita já lançada no caixa
          </p>
        </div>
      </div>
      <ul className="max-h-64 divide-y overflow-y-auto">
        {pendentes.map((comissao) => (
          <li key={comissao.profissionalId} className="flex items-center justify-between gap-4 px-4 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {comissao.profissionalNome}
                <span className="font-normal text-muted-foreground">
                  {' '}· {comissao.percentual.toFixed(0)}% de {formatarMoeda(comissao.receitaNoCaixa)}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                Devido {formatarMoeda(comissao.comissaoDevida)}
                {comissao.comissaoPaga > 0 && ` · já pago ${formatarMoeda(comissao.comissaoPaga)}`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="font-semibold text-red-600 dark:text-red-400">
                {formatarMoeda(comissao.pendente)}
              </span>
              <span title={motivoBloqueio ?? undefined}>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!podeOperar || pagandoId === comissao.profissionalId}
                  onClick={() => pagar(comissao)}
                >
                  {pagandoId === comissao.profissionalId && (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  )}
                  Pagar
                </Button>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
