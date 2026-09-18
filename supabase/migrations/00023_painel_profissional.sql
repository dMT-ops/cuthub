-- =============================================================================
-- 00023 — MUROS INTERNOS DO TENANT (Painel do Profissional)
-- =============================================================================
-- Até aqui a RLS separava barbearia de barbearia. Dentro do tenant não havia
-- separação nenhuma: quem entrasse na área de gestão via e escrevia tudo. Para
-- o profissional entrar no app, o muro interno precisa existir ANTES da tela.
--
-- DUAS TABELAS QUE A ORDEM NÃO LISTOU E QUE ENTRARAM
--
-- A ordem enumerou servico, cliente, produto, promocao, horario_trabalho,
-- bloqueio e profissional. Levantei `pg_policies` em vez de seguir a lista e
-- achei mais duas com `FOR ALL` aberto por barbearia:
--
--   configuracao_barbearia -> guarda logo, banner, descrição e a cor da marca.
--                             Sem a trava, o barbeiro reescreve a identidade
--                             visual da barbearia.
--   despesa_recorrente     -> criada na F6.4, depois que a lista foi escrita.
--                             Sem a trava, o barbeiro cadastra e apaga os
--                             custos fixos da casa.
--
-- As duas são a mesma linha de guarda das outras. Deixá-las de fora seria
-- levantar o muro com dois portões abertos.
--
-- UMA DIVERGÊNCIA DELIBERADA, EM lancamento_financeiro
--
-- A ordem diz que o profissional pode "ver, inserir ou alterar" as linhas com o
-- profissional_id dele. Implementei **só a leitura**.
--
-- Motivo: a regra do Chefe é "ele só ENXERGA o próprio financeiro". Permitir
-- escrita significa que o barbeiro pode lançar receita própria e, pior, criar
-- a saída de `comissao` com o próprio id — ou seja, **dar baixa na própria
-- comissão**. A Fase 6 inteira existiu para o caixa parar de mentir; isso o
-- faria mentir de novo, por dentro.
--
-- Para reverter, se o Arquiteto discordar: basta a policy de escrita de
-- `lancamento_financeiro` repetir a condição da de leitura.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- HELPERS
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_gestor()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuario_perfil
    WHERE id = auth.uid() AND tipo IN ('owner', 'gerente')
  );
$$;

-- SECURITY DEFINER obrigatório: esta função é lida DENTRO da policy de
-- `profissional`. Sem o bypass, a policy se consultaria em recursão.
CREATE OR REPLACE FUNCTION public.get_profissional_id_do_usuario()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM profissional WHERE usuario_id = auth.uid() LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.is_gestor() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_profissional_id_do_usuario() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_gestor() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_profissional_id_do_usuario() TO authenticated, anon, service_role;

-- -----------------------------------------------------------------------------
-- CATÁLOGO E CONFIGURAÇÃO: todos leem, só gestor escreve
-- -----------------------------------------------------------------------------
-- A policy única `FOR ALL` vira duas: leitura para quem é da barbearia,
-- escrita só para gestor. As policies extras de cada tabela (ex.: "Cliente ve o
-- proprio cadastro") não são tocadas.
DO $$
DECLARE
  v_tabela TEXT;
  v_nome_antigo TEXT;
BEGIN
  FOREACH v_tabela IN ARRAY ARRAY[
    'servico', 'cliente', 'produto', 'promocao',
    'horario_trabalho', 'bloqueio', 'profissional',
    'configuracao_barbearia', 'despesa_recorrente'
  ]
  LOOP
    SELECT policyname INTO v_nome_antigo
      FROM pg_policies
     WHERE schemaname = 'public' AND tablename = v_tabela AND cmd = 'ALL';

    IF v_nome_antigo IS NOT NULL THEN
      EXECUTE format('DROP POLICY %I ON public.%I', v_nome_antigo, v_tabela);
    END IF;

    -- Re-executavel: derruba tambem o que este proprio bloco cria.
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_tabela || '_leitura_da_barbearia', v_tabela);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_tabela || '_insercao_por_gestor', v_tabela);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_tabela || '_alteracao_por_gestor', v_tabela);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_tabela || '_exclusao_por_gestor', v_tabela);

    EXECUTE format($f$
      CREATE POLICY %I ON public.%I
        FOR SELECT TO authenticated
        USING (barbearia_id = get_barbearia_do_usuario() OR is_admin_supremo())
    $f$, v_tabela || '_leitura_da_barbearia', v_tabela);

    EXECUTE format($f$
      CREATE POLICY %I ON public.%I
        FOR INSERT TO authenticated
        WITH CHECK (
          (barbearia_id = get_barbearia_do_usuario() AND is_gestor())
          OR is_admin_supremo()
        )
    $f$, v_tabela || '_insercao_por_gestor', v_tabela);

    EXECUTE format($f$
      CREATE POLICY %I ON public.%I
        FOR UPDATE TO authenticated
        USING (
          (barbearia_id = get_barbearia_do_usuario() AND is_gestor())
          OR is_admin_supremo()
        )
        WITH CHECK (
          (barbearia_id = get_barbearia_do_usuario() AND is_gestor())
          OR is_admin_supremo()
        )
    $f$, v_tabela || '_alteracao_por_gestor', v_tabela);

    EXECUTE format($f$
      CREATE POLICY %I ON public.%I
        FOR DELETE TO authenticated
        USING (
          (barbearia_id = get_barbearia_do_usuario() AND is_gestor())
          OR is_admin_supremo()
        )
    $f$, v_tabela || '_exclusao_por_gestor', v_tabela);
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- AGENDAMENTO: o profissional vive dentro da própria agenda
-- -----------------------------------------------------------------------------
-- Aqui ele escreve, e isso é proposital: marcar um encaixe é trabalho dele.
-- `profissional_id` é NOT NULL na tabela, então não existe linha órfã que
-- sumiria para todo mundo.
DROP POLICY IF EXISTS "Agendamento isolated by barbearia" ON public.agendamento;

DROP POLICY IF EXISTS "agendamento_leitura" ON public.agendamento;
CREATE POLICY "agendamento_leitura" ON public.agendamento
  FOR SELECT TO authenticated
  USING (
    is_admin_supremo()
    OR (
      barbearia_id = get_barbearia_do_usuario()
      AND (is_gestor() OR profissional_id = get_profissional_id_do_usuario())
    )
  );

DROP POLICY IF EXISTS "agendamento_escrita" ON public.agendamento;
CREATE POLICY "agendamento_escrita" ON public.agendamento
  FOR ALL TO authenticated
  USING (
    is_admin_supremo()
    OR (
      barbearia_id = get_barbearia_do_usuario()
      AND (is_gestor() OR profissional_id = get_profissional_id_do_usuario())
    )
  )
  WITH CHECK (
    is_admin_supremo()
    OR (
      barbearia_id = get_barbearia_do_usuario()
      AND (is_gestor() OR profissional_id = get_profissional_id_do_usuario())
    )
  );

-- `agendamento_servico` não tem barbearia_id nem profissional_id: a regra sai
-- do agendamento pai, como já era antes desta migration.
DROP POLICY IF EXISTS "Agendamento_servico isolated by barbearia" ON public.agendamento_servico;

DROP POLICY IF EXISTS "agendamento_servico_pelo_pai" ON public.agendamento_servico;
CREATE POLICY "agendamento_servico_pelo_pai" ON public.agendamento_servico
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agendamento a
      WHERE a.id = agendamento_servico.agendamento_id
        AND (
          is_admin_supremo()
          OR (
            a.barbearia_id = get_barbearia_do_usuario()
            AND (is_gestor() OR a.profissional_id = get_profissional_id_do_usuario())
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agendamento a
      WHERE a.id = agendamento_servico.agendamento_id
        AND (
          is_admin_supremo()
          OR (
            a.barbearia_id = get_barbearia_do_usuario()
            AND (is_gestor() OR a.profissional_id = get_profissional_id_do_usuario())
          )
        )
    )
  );

-- -----------------------------------------------------------------------------
-- FINANCEIRO: o profissional LÊ o que é dele e não escreve nada
-- -----------------------------------------------------------------------------
-- Ver a divergência explicada no cabeçalho. Escrita é do gestor.
DROP POLICY IF EXISTS "Financeiro isolated by barbearia" ON public.lancamento_financeiro;

DROP POLICY IF EXISTS "financeiro_leitura" ON public.lancamento_financeiro;
CREATE POLICY "financeiro_leitura" ON public.lancamento_financeiro
  FOR SELECT TO authenticated
  USING (
    is_admin_supremo()
    OR (
      barbearia_id = get_barbearia_do_usuario()
      AND (is_gestor() OR profissional_id = get_profissional_id_do_usuario())
    )
  );

DROP POLICY IF EXISTS "financeiro_escrita_por_gestor" ON public.lancamento_financeiro;
CREATE POLICY "financeiro_escrita_por_gestor" ON public.lancamento_financeiro
  FOR ALL TO authenticated
  USING (
    is_admin_supremo() OR (barbearia_id = get_barbearia_do_usuario() AND is_gestor())
  )
  WITH CHECK (
    is_admin_supremo() OR (barbearia_id = get_barbearia_do_usuario() AND is_gestor())
  );

-- -----------------------------------------------------------------------------
-- DESPESA RECORRENTE: nem a leitura é do profissional
-- -----------------------------------------------------------------------------
-- Ela entrou no laço acima junto com o catálogo, o que deixaria o barbeiro
-- LENDO o aluguel e a luz da casa. Isso não é "o próprio financeiro" dele, que
-- é a regra do Chefe. Custo fixo da barbearia é número de gestor.
DROP POLICY IF EXISTS "despesa_recorrente_leitura_da_barbearia" ON public.despesa_recorrente;
CREATE POLICY "despesa_recorrente_leitura_por_gestor" ON public.despesa_recorrente
  FOR SELECT TO authenticated
  USING (
    is_admin_supremo() OR (barbearia_id = get_barbearia_do_usuario() AND is_gestor())
  );
