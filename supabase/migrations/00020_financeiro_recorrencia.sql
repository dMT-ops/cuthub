-- =============================================================================
-- 00020 — DESPESAS RECORRENTES
-- =============================================================================
-- Custo fixo da barbearia (aluguel, luz, internet) cadastrado uma vez e
-- provisionado a cada mês, em vez de redigitado. No banco hoje existem 20
-- lançamentos de aluguel de R$ 150,00, um por mês, todos digitados à mão.
--
-- DUAS CORREÇÕES À ESPECIFICAÇÃO, MEDIDAS ANTES DE ESCREVER
--
-- 1. A spec pedia `categoria_id`. Não existe tabela de categorias neste
--    projeto: categoria é o enum `categoria_lancamento`, usado em
--    lancamento_financeiro desde o começo. Criar uma tabela agora daria duas
--    fontes de verdade para a mesma coisa. Usa-se o enum.
--
-- 2. A spec pedia lançamentos "com status pendente" ao provisionar.
--    `lancamento_financeiro` NÃO TEM coluna de status, e isso é intencional no
--    desenho do módulo: lançamento existir significa dinheiro que se moveu, e
--    é por isso que o caixa só registra o que o gestor confirma. Criar
--    lançamentos pendentes faria as saídas e o saldo mentirem enquanto nada
--    foi pago — o mesmo defeito que a comissão causava ao ficar de fora.
--    Ver a nota no log: a provisão segue o padrão já usado por
--    `AtendimentosAReceber` e `ComissoesAPagar` — uma lista do que falta
--    lançar, com confirmação do gestor.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.despesa_recorrente (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbearia_id  UUID NOT NULL REFERENCES public.barbearia(id) ON DELETE CASCADE,
  descricao     VARCHAR(255) NOT NULL,
  valor         NUMERIC(10,2) NOT NULL,
  -- 1 a 31: dias 29-31 caem no último dia do mês quando ele for mais curto,
  -- e quem resolve isso é a aplicação, não o banco.
  dia_vencimento SMALLINT NOT NULL,
  categoria     categoria_lancamento NOT NULL DEFAULT 'outro',
  status        status_registro NOT NULL DEFAULT 'ativo',
  criado_em     TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT despesa_recorrente_valor_positivo CHECK (valor > 0),
  CONSTRAINT despesa_recorrente_dia_valido CHECK (dia_vencimento BETWEEN 1 AND 31)
);

CREATE INDEX IF NOT EXISTS idx_despesa_recorrente_barbearia
  ON public.despesa_recorrente (barbearia_id, status);

ALTER TABLE public.despesa_recorrente ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Despesa recorrente isolated by barbearia" ON public.despesa_recorrente;
CREATE POLICY "Despesa recorrente isolated by barbearia"
  ON public.despesa_recorrente
  FOR ALL
  TO authenticated
  USING (barbearia_id = get_barbearia_do_usuario() OR is_admin_supremo());

-- Rastro do lançamento até a recorrência que o gerou. Sem isto não há como
-- saber se o aluguel deste mês já foi lançado, e o botão de provisionar
-- duplicaria a despesa a cada clique.
ALTER TABLE public.lancamento_financeiro
  ADD COLUMN IF NOT EXISTS despesa_recorrente_id UUID
  REFERENCES public.despesa_recorrente(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lancamento_despesa_recorrente
  ON public.lancamento_financeiro (despesa_recorrente_id, data_lancamento)
  WHERE despesa_recorrente_id IS NOT NULL;

-- NOTA sobre unicidade por mês: o equivalente ao índice
-- `lancamento_atendimento_unico_por_agendamento` exigiria indexar
-- date_trunc('month', data_lancamento), e date_trunc sobre TIMESTAMPTZ é
-- STABLE (depende do TimeZone da sessão), não IMMUTABLE — o Postgres recusa
-- em índice. A proteção contra duplicar fica na aplicação, que filtra o que já
-- foi lançado no mês antes de oferecer o botão, no mesmo padrão de
-- AtendimentosAReceber. Registrado como limitação conhecida.
