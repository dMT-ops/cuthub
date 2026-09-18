import { useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth/AuthContext';
import { useDespesasRecorrentes } from '@/hooks/useDespesasRecorrentes';
import { useFinanceiro } from '@/hooks/useFinanceiro';
import { dataDeVencimento, despesasAProvisionar } from '@/lib/recorrencia';
import { CATEGORIAS_POR_TIPO, ROTULO_CATEGORIA } from '@/lib/financeiro';
import { formatarMoeda } from '@/lib/utils';
import type { DespesaRecorrente } from '@/services/despesaRecorrente.service';
import type { Database } from '@/types/database.types';

type CategoriaLancamento = Database['public']['Enums']['categoria_lancamento'];

interface DespesasFixasProps {
  periodo: { inicio: string; fim: string };
  mesReferencia: Date;
  rotuloDoPeriodo: string;
}

/**
 * Custos fixos cadastrados uma vez e provisionados a cada mes.
 *
 * "Provisionar" aqui significa LANCAR de fato, nao criar pendencia: o modulo
 * nao tem lancamento em estado intermediario, e inventar um faria o saldo
 * mentir enquanto nada foi pago. O gestor ve o que falta e confirma -- mesmo
 * padrao de AtendimentosAReceber e ComissoesAPagar.
 */
export function DespesasFixas({ periodo, mesReferencia, rotuloDoPeriodo }: DespesasFixasProps) {
  const { barbeariaId, user, podeOperar, motivoBloqueio } = useAuth();
  const { despesas, idsJaLancados, isLoading, criarDespesa, excluirDespesa, isSalvando } =
    useDespesasRecorrentes(barbeariaId, periodo);
  const { criarLancamento } = useFinanceiro(barbeariaId, periodo);

  const [novaAberta, setNovaAberta] = useState(false);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [dia, setDia] = useState('5');
  const [categoria, setCategoria] = useState<CategoriaLancamento>('aluguel');
  const [aExcluir, setAExcluir] = useState<DespesaRecorrente | null>(null);
  const [lancando, setLancando] = useState(false);

  const pendentes = useMemo(
    () =>
      despesasAProvisionar(
        despesas.map((d) => ({ ...d, valor: Number(d.valor) })),
        idsJaLancados
      ),
    [despesas, idsJaLancados]
  );

  const totalPendente = pendentes.reduce((soma, d) => soma + d.valor, 0);

  const adicionar = async () => {
    if (!barbeariaId) return;
    const valorNumerico = Number(valor);
    if (!descricao.trim()) {
      toast.error('Informe a descrição da despesa.');
      return;
    }
    if (!Number.isFinite(valorNumerico) || valorNumerico <= 0) {
      toast.error('O valor precisa ser maior que zero.');
      return;
    }
    try {
      await criarDespesa({
        barbearia_id: barbeariaId,
        descricao: descricao.trim(),
        valor: valorNumerico,
        dia_vencimento: Number(dia),
        categoria,
      });
      toast.success('Despesa fixa cadastrada.');
      setDescricao('');
      setValor('');
      setNovaAberta(false);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao cadastrar a despesa');
    }
  };

  const provisionarTodas = async () => {
    if (!barbeariaId || pendentes.length === 0) return;
    setLancando(true);
    let lancadas = 0;
    try {
      // Sequencial de proposito: em paralelo, um erro no meio deixaria metade
      // lancada sem o gestor saber quais. Aqui a contagem final e verdadeira.
      for (const despesa of pendentes) {
        await criarLancamento({
          barbearia_id: barbeariaId,
          despesa_recorrente_id: despesa.id,
          tipo: 'saida',
          categoria: despesa.categoria,
          valor: despesa.valor,
          data_lancamento: dataDeVencimento(mesReferencia, despesa.dia_vencimento).toISOString(),
          descricao: `${despesa.descricao} — ${rotuloDoPeriodo}`,
          criado_por: user?.id ?? null,
        });
        lancadas += 1;
      }
      toast.success(`${lancadas} despesa(s) lançada(s) no caixa.`);
    } catch (error: any) {
      toast.error(
        lancadas > 0
          ? `${lancadas} lançada(s) antes do erro: ${error.message}`
          : error.message || 'Erro ao provisionar as despesas'
      );
    } finally {
      setLancando(false);
    }
  };

  const confirmarExclusao = async () => {
    if (!aExcluir) return;
    try {
      await excluirDespesa(aExcluir.id);
      toast.success('Despesa fixa removida.');
      setAExcluir(null);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao remover a despesa');
    }
  };

  if (isLoading) {
    return <Skeleton className="h-40 w-full rounded-lg" />;
  }

  return (
    <div className="rounded-lg border">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <h3 className="font-semibold">Despesas fixas</h3>
          <p className="text-xs text-muted-foreground">
            {pendentes.length > 0
              ? `${pendentes.length} a lançar em ${rotuloDoPeriodo}, somando ${formatarMoeda(totalPendente)}`
              : `Tudo lançado em ${rotuloDoPeriodo}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setNovaAberta((v) => !v)}>
            <Plus className="mr-2 h-3.5 w-3.5" /> Nova
          </Button>
          <span title={motivoBloqueio ?? undefined}>
            <Button
              size="sm"
              disabled={!podeOperar || pendentes.length === 0 || lancando}
              onClick={provisionarTodas}
            >
              {lancando && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Provisionar o mês
            </Button>
          </span>
        </div>
      </div>

      {novaAberta && (
        <div className="grid gap-2 border-b bg-muted/30 p-4 sm:grid-cols-[1fr_120px_110px_150px_auto]">
          <Input
            placeholder="Descrição (ex: Aluguel)"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
          <Input
            type="number"
            step="0.01"
            min="0.01"
            placeholder="Valor"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
          <Input
            type="number"
            min="1"
            max="31"
            placeholder="Dia"
            value={dia}
            onChange={(e) => setDia(e.target.value)}
          />
          <Select value={categoria} onValueChange={(v) => setCategoria(v as CategoriaLancamento)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIAS_POR_TIPO.saida.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {ROTULO_CATEGORIA[cat]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={adicionar} disabled={!podeOperar || isSalvando}>
            Salvar
          </Button>
        </div>
      )}

      {despesas.length === 0 ? (
        <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <CalendarClock className="h-4 w-4" />
          Nenhuma despesa fixa cadastrada. Aluguel, luz e internet entram aqui uma vez e são
          lançados com um clique todo mês.
        </div>
      ) : (
        <ul className="max-h-64 divide-y overflow-y-auto">
          {despesas.map((despesa) => {
            const jaLancada = idsJaLancados.includes(despesa.id);
            return (
              <li key={despesa.id} className="flex items-center justify-between gap-4 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {despesa.descricao}
                    <span className="font-normal text-muted-foreground">
                      {' '}
                      · dia {despesa.dia_vencimento} · {ROTULO_CATEGORIA[despesa.categoria]}
                    </span>
                  </p>
                  {jaLancada ? (
                    <p className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-3 w-3" /> já lançada em {rotuloDoPeriodo}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">a lançar</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-semibold">{formatarMoeda(Number(despesa.valor))}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-600 dark:text-red-400"
                    aria-label={`Remover ${despesa.descricao}`}
                    disabled={!podeOperar}
                    onClick={() => setAExcluir(despesa)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AlertDialog open={!!aExcluir} onOpenChange={(aberto) => !aberto && setAExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover esta despesa fixa?</AlertDialogTitle>
            <AlertDialogDescription>
              {aExcluir && (
                <>
                  <strong>{aExcluir.descricao}</strong> ({formatarMoeda(Number(aExcluir.valor))}, todo
                  dia {aExcluir.dia_vencimento}) deixa de ser provisionada. Os lançamentos já feitos
                  continuam no caixa — só param de apontar para a recorrência.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmarExclusao();
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
