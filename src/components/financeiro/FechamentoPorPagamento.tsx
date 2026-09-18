import { useMemo } from 'react';
import { Banknote } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { formatarMoeda } from '@/lib/utils';
import { fecharPorFormaDePagamento } from '@/lib/fechamento';
import type { LancamentoComDetalhes } from '@/services/financeiro.service';

interface FechamentoPorPagamentoProps {
  lancamentos: LancamentoComDetalhes[];
  isLoading: boolean;
  /** Entradas do período inteiro, do resumo — usado para provar que o fechamento fecha */
  totalDeEntradas?: number;
}

/**
 * Como se confere a gaveta no fim do dia: quanto entrou em cada forma de
 * pagamento. O dado já estava gravado em `forma_pagamento` desde sempre e
 * nunca era somado por ninguém.
 */
export function FechamentoPorPagamento({
  lancamentos,
  isLoading,
  totalDeEntradas,
}: FechamentoPorPagamentoProps) {
  const linhas = useMemo(() => fecharPorFormaDePagamento(lancamentos), [lancamentos]);
  const total = linhas.reduce((soma, l) => soma + l.total, 0);

  // Se a soma do fechamento nao bate com as entradas do resumo, alguma entrada
  // ficou de fora -- e melhor dizer isso do que exibir um numero que mente.
  const confere = totalDeEntradas === undefined || Math.abs(total - totalDeEntradas) < 0.01;

  if (isLoading) {
    return <Skeleton className="h-40 w-full rounded-lg" />;
  }

  if (linhas.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        <Banknote className="h-4 w-4" />
        Nenhuma entrada no período para fechar.
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <div className="border-b px-4 py-3">
        <h3 className="font-semibold">Fechamento por forma de pagamento</h3>
        <p className="text-xs text-muted-foreground">
          Entradas do mês inteiro — os filtros de tipo e categoria não afetam este bloco
        </p>
      </div>
      <ul className="divide-y">
        {linhas.map((linha) => (
          <li key={linha.forma ?? 'sem-forma'} className="flex items-center justify-between px-4 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {linha.rotulo}
                {linha.forma === null && (
                  <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                    editar para informar
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {linha.quantidade} lançamento{linha.quantidade > 1 ? 's' : ''}
              </p>
            </div>
            <span className="shrink-0 font-semibold">{formatarMoeda(linha.total)}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between border-t bg-muted/40 px-4 py-2.5">
        <span className="text-sm font-medium">Total conferido</span>
        <div className="text-right">
          <span className="font-bold">{formatarMoeda(total)}</span>
          {!confere && (
            <p className="text-xs text-red-600 dark:text-red-400">
              Não bate com as entradas do período ({formatarMoeda(totalDeEntradas ?? 0)})
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
