import { useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatarMoeda } from '@/lib/utils';
import { useAuth } from '@/lib/auth/AuthContext';
import { useFinanceiro } from '@/hooks/useFinanceiro';
import type { AtendimentoAReceber } from '@/services/financeiro.service';

interface AtendimentosAReceberProps {
  atendimentos: AtendimentoAReceber[];
  isLoading: boolean;
  periodo: { inicio: string; fim: string };
}

/**
 * Atendimentos concluídos que ainda não foram lançados no caixa.
 *
 * Não há geração automática de receita: o registro é sempre uma ação explícita do
 * gestor. Esta lista existe para que nenhum atendimento concluído seja esquecido.
 */
export function AtendimentosAReceber({ atendimentos, isLoading, periodo }: AtendimentosAReceberProps) {
  const { barbeariaId, user } = useAuth();
  const { criarLancamento } = useFinanceiro(barbeariaId, periodo);
  const [registrandoId, setRegistrandoId] = useState<string | null>(null);

  const registrar = async (atendimento: AtendimentoAReceber) => {
    if (!barbeariaId) {
      toast.error('Barbearia não identificada.');
      return;
    }
    setRegistrandoId(atendimento.agendamentoId);
    try {
      await criarLancamento({
        barbearia_id: barbeariaId,
        agendamento_id: atendimento.agendamentoId,
        profissional_id: atendimento.profissionalId,
        tipo: 'entrada',
        categoria: 'atendimento',
        valor: atendimento.valor,
        data_lancamento: atendimento.dataHora,
        descricao: `${atendimento.servicos} — ${atendimento.clienteNome}`,
        criado_por: user?.id ?? null,
      });
      toast.success('Receita registrada no caixa.');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao registrar a receita');
    } finally {
      setRegistrandoId(null);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-24 w-full rounded-lg" />;
  }

  if (atendimentos.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
        Todos os atendimentos concluídos do período já estão lançados no caixa.
      </div>
    );
  }

  const total = atendimentos.reduce((soma, a) => soma + a.valor, 0);

  return (
    <div className="rounded-lg border">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h3 className="font-semibold">Atendimentos concluídos a lançar</h3>
          <p className="text-xs text-muted-foreground">
            {atendimentos.length} atendimento(s) somando {formatarMoeda(total)} ainda fora do caixa
          </p>
        </div>
      </div>
      <ul className="divide-y max-h-64 overflow-y-auto">
        {atendimentos.map((atendimento) => (
          <li key={atendimento.agendamentoId} className="flex items-center justify-between gap-4 px-4 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {atendimento.clienteNome}
                <span className="text-muted-foreground font-normal"> · {atendimento.servicos}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(atendimento.dataHora), 'dd/MM/yyyy HH:mm')}
                {atendimento.profissionalNome && ` · ${atendimento.profissionalNome}`}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="font-semibold text-green-600 dark:text-green-400">
                {formatarMoeda(atendimento.valor)}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={registrandoId === atendimento.agendamentoId}
                onClick={() => registrar(atendimento)}
              >
                {registrandoId === atendimento.agendamentoId && (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                )}
                Lançar
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
