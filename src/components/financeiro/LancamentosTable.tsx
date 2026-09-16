import { format } from 'date-fns';
import { ArrowDownCircle, ArrowUpCircle, Wallet } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatarMoeda } from '@/lib/utils';
import { ROTULO_CATEGORIA, ROTULO_FORMA_PAGAMENTO } from '@/lib/financeiro';
import type { LancamentoComDetalhes } from '@/services/financeiro.service';

interface LancamentosTableProps {
  lancamentos: LancamentoComDetalhes[];
  isLoading: boolean;
}

export function LancamentosTable({ lancamentos, isLoading }: LancamentosTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2 rounded-lg border p-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (lancamentos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed">
        <EmptyState
          icon={Wallet}
          title="Nenhum lançamento no período"
          description="Registre entradas e saídas para acompanhar o caixa da barbearia."
        />
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[110px]">Data</TableHead>
            <TableHead className="w-[90px]">Tipo</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Profissional</TableHead>
            <TableHead>Pagamento</TableHead>
            <TableHead className="text-right">Valor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lancamentos.map((lancamento) => {
            const isEntrada = lancamento.tipo === 'entrada';
            return (
              <TableRow key={lancamento.id}>
                <TableCell className="font-medium">
                  {lancamento.data_lancamento
                    ? format(new Date(lancamento.data_lancamento), 'dd/MM/yyyy')
                    : '—'}
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold ${
                      isEntrada ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {isEntrada ? <ArrowUpCircle className="h-3.5 w-3.5" /> : <ArrowDownCircle className="h-3.5 w-3.5" />}
                    {isEntrada ? 'Entrada' : 'Saída'}
                  </span>
                </TableCell>
                <TableCell>{ROTULO_CATEGORIA[lancamento.categoria]}</TableCell>
                <TableCell className="text-muted-foreground max-w-[260px] truncate">
                  {lancamento.descricao || '—'}
                </TableCell>
                <TableCell>{lancamento.profissional?.nome || '—'}</TableCell>
                <TableCell className="text-muted-foreground">
                  {lancamento.forma_pagamento ? ROTULO_FORMA_PAGAMENTO[lancamento.forma_pagamento] : '—'}
                </TableCell>
                <TableCell
                  className={`text-right font-semibold ${
                    isEntrada ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {isEntrada ? '+' : '−'} {formatarMoeda(Number(lancamento.valor))}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
