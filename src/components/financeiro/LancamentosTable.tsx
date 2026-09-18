import { useState } from 'react';
import { format } from 'date-fns';
import { ArrowDownCircle, ArrowUpCircle, MoreHorizontal, Pencil, Trash2, Wallet } from 'lucide-react';
import { toast } from 'sonner';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth/AuthContext';
import { useFinanceiro } from '@/hooks/useFinanceiro';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatarMoeda } from '@/lib/utils';
import { ROTULO_CATEGORIA, ROTULO_FORMA_PAGAMENTO } from '@/lib/financeiro';
import type { LancamentoComDetalhes } from '@/services/financeiro.service';

interface LancamentosTableProps {
  lancamentos: LancamentoComDetalhes[];
  isLoading: boolean;
  onEditar: (lancamento: LancamentoComDetalhes) => void;
}

export function LancamentosTable({ lancamentos, isLoading, onEditar }: LancamentosTableProps) {
  const { barbeariaId, podeOperar, motivoBloqueio } = useAuth();
  const { excluirLancamento, isExcluindo } = useFinanceiro(barbeariaId);
  const [aExcluir, setAExcluir] = useState<LancamentoComDetalhes | null>(null);

  const confirmarExclusao = async () => {
    if (!aExcluir) return;
    try {
      await excluirLancamento(aExcluir.id);
      toast.success('Lançamento excluído.');
      setAExcluir(null);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir o lançamento');
    }
  };

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
            <TableHead className="w-[52px]" />
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
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Ações do lançamento">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem disabled={!podeOperar} onClick={() => onEditar(lancamento)}>
                        <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={!podeOperar}
                        className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                        onClick={() => setAExcluir(lancamento)}
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <AlertDialog open={!!aExcluir} onOpenChange={(aberto) => !aberto && setAExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              {aExcluir && (
                <>
                  {aExcluir.tipo === 'entrada' ? 'Entrada' : 'Saída'} de{' '}
                  <strong>{formatarMoeda(Number(aExcluir.valor))}</strong>
                  {aExcluir.descricao ? ` — ${aExcluir.descricao}` : ''}.
                  {' '}O caixa é recalculado na hora e a exclusão não pode ser desfeita.
                  {aExcluir.categoria === 'atendimento' && aExcluir.agendamento_id && (
                    <>
                      {' '}Este lançamento veio de um atendimento concluído: ao excluir, ele volta
                      para a lista de atendimentos a lançar.
                    </>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <span title={motivoBloqueio ?? undefined}>
              <AlertDialogAction
                disabled={!podeOperar || isExcluindo}
                onClick={(e) => {
                  e.preventDefault();
                  confirmarExclusao();
                }}
              >
                {isExcluindo ? 'Excluindo...' : 'Excluir'}
              </AlertDialogAction>
            </span>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
