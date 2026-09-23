import { useMemo, useState } from 'react';
import { addMonths, endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowDownCircle, ArrowUpCircle, ChevronLeft, ChevronRight, Plus, Scale } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth/AuthContext';
import { useAtendimentosAReceber, useComissoesAPagar, useFinanceiro } from '@/hooks/useFinanceiro';
import { useProfissionais } from '@/hooks/useProfissionais';
import { LancamentosTable } from '@/components/financeiro/LancamentosTable';
import { LancamentoFormDialog } from '@/components/financeiro/LancamentoFormDialog';
import { AtendimentosAReceber } from '@/components/financeiro/AtendimentosAReceber';
import { ComissoesAPagar } from '@/components/financeiro/ComissoesAPagar';
import { FechamentoPorPagamento } from '@/components/financeiro/FechamentoPorPagamento';
import { DespesasFixas } from '@/components/financeiro/DespesasFixas';
import { CATEGORIAS_LANCAMENTO, ROTULO_CATEGORIA } from '@/lib/financeiro';
import { formatarMoeda } from '@/lib/utils';
import type { LancamentoComDetalhes } from '@/services/financeiro.service';
import type { Database } from '@/types/database.types';

type TipoLancamento = Database['public']['Enums']['tipo_lancamento'];
type CategoriaLancamento = Database['public']['Enums']['categoria_lancamento'];

export default function Financeiro() {
  const { barbeariaId, podeOperar, motivoBloqueio, tipo: tipoDeUsuario, perfil } = useAuth();
  const { profissionais } = useProfissionais(barbeariaId, { status: 'ativo' });

  // O profissional entrou nesta tela na Fase 8, mas ele nao gerencia o caixa:
  // a RLS so lhe da LEITURA dos proprios lancamentos. Mostrar os paineis de
  // gestao seria oferecer botoes que o banco recusa -- e as listas de
  // "a lancar" e "a pagar" viriam vazias, parecendo defeito.
  const ehProfissional = tipoDeUsuario === 'profissional';

  // A ficha do barbeiro logado. Mesmo caminho da AgendaHome: `usuario_perfil.id`
  // nao e `profissional.id`, e e o segundo que a RLS do caixa compara.
  const meuProfissionalId = useMemo(
    () => (ehProfissional ? (profissionais.find((p) => p.usuario_id === perfil?.id)?.id ?? null) : null),
    [ehProfissional, profissionais, perfil]
  );

  const [mesReferencia, setMesReferencia] = useState(() => new Date());
  const [tipo, setTipo] = useState<'todos' | TipoLancamento>('todos');
  const [categoria, setCategoria] = useState<'todas' | CategoriaLancamento>('todas');
  const [formOpen, setFormOpen] = useState(false);
  const [lancamentoAEditar, setLancamentoAEditar] = useState<LancamentoComDetalhes | null>(null);

  const abrirEdicao = (lancamento: LancamentoComDetalhes) => {
    setLancamentoAEditar(lancamento);
    setFormOpen(true);
  };

  // O dialogo e o mesmo para criar e editar: sem limpar o alvo ao fechar, o
  // proximo "Novo Lancamento" abriria preenchido com o lancamento anterior.
  const fecharForm = (aberto: boolean) => {
    setFormOpen(aberto);
    if (!aberto) setLancamentoAEditar(null);
  };

  const periodo = useMemo(
    () => ({
      inicio: startOfMonth(mesReferencia).toISOString(),
      fim: endOfMonth(mesReferencia).toISOString(),
    }),
    [mesReferencia]
  );

  const filtros = useMemo(
    () => ({
      ...periodo,
      ...(tipo !== 'todos' ? { tipo } : {}),
      ...(categoria !== 'todas' ? { categoria } : {}),
    }),
    [periodo, tipo, categoria]
  );

  const { lancamentos, resumo, isLoading, isError, error } = useFinanceiro(barbeariaId, filtros);
  // Consulta separada, sem os filtros de tipo/categoria: o fechamento tem que
  // bater com as entradas do resumo, e o resumo e do mes inteiro. Reusar a
  // listagem filtrada faria o total conferido mudar ao mexer num select.
  const { lancamentos: lancamentosDoPeriodo, isLoading: carregandoPeriodo } = useFinanceiro(
    barbeariaId,
    periodo
  );
  const { atendimentos, isLoading: carregandoAtendimentos } = useAtendimentosAReceber(
    barbeariaId,
    periodo.inicio,
    periodo.fim
  );
  const { comissoes, isLoading: carregandoComissoes } = useComissoesAPagar(
    barbeariaId,
    periodo.inicio,
    periodo.fim
  );

  const rotuloDoPeriodo = format(mesReferencia, "MMMM 'de' yyyy", { locale: ptBR });

  // Meio-dia do ultimo dia do mes, e nao o fim do periodo. `endOfMonth` devolve
  // 23:59:59.999 LOCAL, que em BRT (UTC-3) vira dia 1o do mes seguinte em UTC --
  // a despesa de setembro era gravada com data de outubro no banco. Meio-dia
  // cai dentro do mesmo dia em qualquer fuso de -11 a +11.
  const dataDaComissao = useMemo(() => {
    const ultimoDia = endOfMonth(mesReferencia);
    ultimoDia.setHours(12, 0, 0, 0);
    return ultimoDia.toISOString();
  }, [mesReferencia]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Financeiro</h2>
          {ehProfissional && (
            <p className="text-sm text-muted-foreground">
              Seus atendimentos e sua comissão. Os números da barbearia ficam com a gestão.
            </p>
          )}
        </div>
        {/* F14.1: o barbeiro passa a lançar no caixa. O botão é o mesmo — o que
            muda é o que o formulário oferece: a linha já vem travada na dele e
            as categorias caem para o que a RLS aceita. */}
        <span title={motivoBloqueio ?? undefined}>
          <Button
            onClick={() => { setLancamentoAEditar(null); setFormOpen(true); }}
            disabled={!podeOperar || (ehProfissional && !meuProfissionalId)}
          >
            <Plus className="mr-2 h-4 w-4" /> Novo Lançamento
          </Button>
        </span>
      </div>

      {/* Período */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-md border bg-background">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-r-none"
            onClick={() => setMesReferencia(subMonths(mesReferencia, 1))}
            aria-label="Mês anterior"
          >
            <ChevronLeft size={16} />
          </Button>
          <button
            className="px-4 text-sm font-medium capitalize w-44 hover:text-primary transition-colors"
            onClick={() => setMesReferencia(new Date())}
            title="Voltar para o mês atual"
          >
            {rotuloDoPeriodo}
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-l-none"
            onClick={() => setMesReferencia(addMonths(mesReferencia, 1))}
            aria-label="Próximo mês"
          >
            <ChevronRight size={16} />
          </Button>
        </div>

        <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            <SelectItem value="entrada">Entradas</SelectItem>
            <SelectItem value="saida">Saídas</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoria} onValueChange={(v) => setCategoria(v as typeof categoria)}>
          <SelectTrigger className="w-[190px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as categorias</SelectItem>
            {CATEGORIAS_LANCAMENTO.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {ROTULO_CATEGORIA[cat]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Resumo do período */}
      <div>
        <p className="mb-2 text-xs text-muted-foreground">
          Resumo do mês inteiro — os filtros de tipo e categoria afetam apenas a listagem abaixo.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          <ResumoCard
            titulo="Entradas"
            valor={resumo?.entradas}
            isLoading={isLoading}
            icone={<ArrowUpCircle className="h-4 w-4" />}
            cor="text-green-600 dark:text-green-400"
          />
          <ResumoCard
            titulo="Saídas"
            valor={resumo?.saidas}
            isLoading={isLoading}
            icone={<ArrowDownCircle className="h-4 w-4" />}
            cor="text-red-600 dark:text-red-400"
          />
          <ResumoCard
            titulo="Saldo"
            valor={resumo?.saldo}
            isLoading={isLoading}
            icone={<Scale className="h-4 w-4" />}
            cor={(resumo?.saldo ?? 0) < 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground'}
            destaque
          />
        </div>
      </div>

      {/* As duas pendencias do caixa lado a lado: o que falta entrar e o que
          falta sair. A comissao e a maior despesa da casa -- deixa-la fora do
          caixa fazia o saldo mentir para mais. */}
      {!ehProfissional && (
      <div className="grid gap-4 xl:grid-cols-2">
        <AtendimentosAReceber
          atendimentos={atendimentos}
          isLoading={carregandoAtendimentos}
          periodo={periodo}
        />
        <ComissoesAPagar
          comissoes={comissoes}
          isLoading={carregandoComissoes}
          periodo={periodo}
          dataDaComissao={dataDaComissao}
          rotuloDoPeriodo={rotuloDoPeriodo}
        />
      </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <FechamentoPorPagamento
          lancamentos={lancamentosDoPeriodo}
          isLoading={carregandoPeriodo}
          totalDeEntradas={resumo?.entradas}
        />
        {!ehProfissional && (
          <DespesasFixas
            periodo={periodo}
            mesReferencia={mesReferencia}
            rotuloDoPeriodo={rotuloDoPeriodo}
          />
        )}
      </div>

      {isError ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card p-12 text-center">
          <h3 className="mb-1 text-lg font-semibold">Não foi possível carregar o financeiro</h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            {(error as Error)?.message || 'Erro desconhecido ao consultar os lançamentos.'}
          </p>
        </div>
      ) : (
        <LancamentosTable
          lancamentos={lancamentos}
          isLoading={isLoading}
          onEditar={abrirEdicao}
          somenteLeitura={ehProfissional}
        />
      )}

      <LancamentoFormDialog
        open={formOpen}
        onOpenChange={fecharForm}
        lancamentoAEditar={lancamentoAEditar}
        profissionalFixo={meuProfissionalId}
      />
    </div>
  );
}

function ResumoCard({
  titulo,
  valor,
  isLoading,
  icone,
  cor,
  destaque,
}: {
  titulo: string;
  valor?: number;
  isLoading: boolean;
  icone: React.ReactNode;
  cor: string;
  destaque?: boolean;
}) {
  return (
    <div className={`rounded-lg border bg-card p-4 shadow-sm ${destaque ? 'border-l-4 border-l-primary' : ''}`}>
      <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <span className={cor}>{icone}</span>
        {titulo}
      </p>
      {isLoading ? (
        <Skeleton className="mt-2 h-8 w-32" />
      ) : (
        <p className={`mt-2 text-2xl font-bold ${cor}`}>{formatarMoeda(valor ?? 0)}</p>
      )}
    </div>
  );
}
