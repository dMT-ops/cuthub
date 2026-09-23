-- =============================================================================
-- 00030 — O PROFISSIONAL ESCREVE NO CAIXA (F14.1, pendência aberta desde a F8)
-- =============================================================================
-- Na Fase 8 a escrita do profissional no caixa ficou travada porque não havia
-- regra de negócio definida. O Arquiteto definiu na F14.1:
--
--   o barbeiro PODE registrar entradas e saídas (gorjeta, venda de pomada),
--   SÓ na própria linha (`profissional_id` = ele), e continua sem UPDATE nem
--   DELETE.
--
-- DUAS CORREÇÕES DE ROTA, E AS DUAS SÃO DE FATO, NÃO DE OPINIÃO
--
-- 1. A ordem fala em `transacao_caixa`. Essa tabela NÃO EXISTE. O caixa deste
--    projeto é `lancamento_financeiro` desde a Fase 5.
--
-- 2. A regra "só a própria linha" NÃO BASTA, e isto foi medido. A comissão é
--    apurada de dentro desta mesma tabela (`financeiro.service.ts`):
--
--      receita do profissional = tipo 'entrada' + categoria 'atendimento'
--      comissao ja paga        = tipo 'saida'   + categoria 'comissao'
--
--    Um barbeiro com INSERT livre na própria linha inseriria
--    `entrada`/`atendimento` e **inflaria a base da própria comissão** — ele
--    passaria a mandar em quanto a barbearia lhe deve. O índice
--    `lancamento_atendimento_unico_por_agendamento` não pega o caso: ele só
--    vale quando `agendamento_id` não é nulo, e a linha forjada não precisa
--    de agendamento nenhum.
--
--    Receita de atendimento nasce de UM lugar só: o gestor lançando um
--    atendimento concluído. Continua assim.
--
-- Então a policy restringe também a CATEGORIA. O barbeiro registra o que a
-- regra do Chefe pediu — gorjeta e venda de produto — e não toca no que decide
-- o próprio pagamento.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- O QUE O PROFISSIONAL PODE LANÇAR
-- -----------------------------------------------------------------------------
-- `venda_produto` e `outro` (a gorjeta entra aqui — não há categoria própria
-- para ela, e criar uma agora mudaria o relatório do financeiro, que é outra
-- fase). `insumos` entra porque é a saída real do dia a dia dele: comprou
-- lâmina, pagou do bolso, registra.
--
-- Ficam DE FORA, de propósito:
--   atendimento -> define a comissão dele (ver cabeçalho);
--   comissao    -> é a barbearia pagando ele; quem registra é quem paga;
--   salario, aluguel -> despesa da casa, não do profissional.
CREATE OR REPLACE FUNCTION public.categoria_permitida_ao_profissional(
  p_categoria categoria_lancamento
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_categoria IN ('venda_produto', 'insumos', 'outro');
$$;

-- -----------------------------------------------------------------------------
-- A POLICY
-- -----------------------------------------------------------------------------
-- Só INSERT. Sem UPDATE e sem DELETE: lançamento de caixa é registro contábil,
-- e quem erra pede para a gestão estornar. Se ele pudesse editar, o histórico
-- deixaria de ser histórico.
DROP POLICY IF EXISTS "financeiro_lancamento_do_profissional" ON public.lancamento_financeiro;
CREATE POLICY "financeiro_lancamento_do_profissional" ON public.lancamento_financeiro
  FOR INSERT TO authenticated
  WITH CHECK (
    barbearia_id = get_barbearia_do_usuario()
    -- A linha tem que ser DELE. Nulo (caixa da casa) e o id de outro barbeiro
    -- caem os dois neste teste: `get_profissional_id_do_usuario()` devolve o
    -- id dele, e nulo nunca é igual a um uuid.
    AND profissional_id = get_profissional_id_do_usuario()
    AND categoria_permitida_ao_profissional(categoria)
    -- Lançamento amarrado a um agendamento é o caminho do gestor, e é ele que
    -- o índice de unicidade protege. O profissional lança avulso.
    AND agendamento_id IS NULL
    AND despesa_recorrente_id IS NULL
  );

-- -----------------------------------------------------------------------------
-- VERIFICAÇÃO — lê o resultado em vez de confiar no "sem erro"
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_qtd INTEGER;
BEGIN
  SELECT count(*) INTO v_qtd FROM pg_policies
   WHERE tablename = 'lancamento_financeiro'
     AND policyname = 'financeiro_lancamento_do_profissional';
  IF v_qtd <> 1 THEN
    RAISE EXCEPTION 'A policy de lancamento do profissional nao foi criada';
  END IF;

  IF (SELECT cmd FROM pg_policies
       WHERE tablename = 'lancamento_financeiro'
         AND policyname = 'financeiro_lancamento_do_profissional') <> 'INSERT' THEN
    RAISE EXCEPTION 'A policy do profissional precisa ser so de INSERT';
  END IF;

  -- A categoria que decide a comissao dele nao pode estar liberada.
  IF categoria_permitida_ao_profissional('atendimento') THEN
    RAISE EXCEPTION 'Profissional nao pode lancar receita de atendimento: e a base da comissao dele';
  END IF;
  IF categoria_permitida_ao_profissional('comissao') THEN
    RAISE EXCEPTION 'Profissional nao pode lancar comissao: quem registra o pagamento e quem paga';
  END IF;
  IF NOT categoria_permitida_ao_profissional('venda_produto') THEN
    RAISE EXCEPTION 'A venda de produto deveria estar liberada';
  END IF;

  RAISE NOTICE 'F14.1: profissional lanca no caixa, sem alcancar a propria comissao';
END $$;
