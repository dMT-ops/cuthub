-- =============================================================================
-- 00022 — BLOQUEIO REAL DE CONTA SUSPENSA (F7.4)
-- =============================================================================
-- A Fase 7 criou `usuario_perfil.status` e o protegeu contra o próprio usuário,
-- mas a coluna era registro, não bloqueio: o suspenso continuava entrando e
-- agindo. O Chefe escolheu a opção A — checagem no frontend mais as RPCs
-- críticas — para não pôr um JOIN de status em toda policy do banco.
--
-- O frontend sozinho não serve: quem chama o PostgREST direto passa por baixo
-- da interface inteira. Por isso a tranca de verdade mora aqui.
-- =============================================================================

-- Helper único, para a regra não ficar copiada em cada função.
-- STABLE e com search_path fixo, como todas as outras deste projeto.
CREATE OR REPLACE FUNCTION public.conta_suspensa()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuario_perfil
    WHERE id = auth.uid() AND status = 'suspenso'
  );
$$;

REVOKE ALL ON FUNCTION public.conta_suspensa() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.conta_suspensa() TO authenticated, anon, service_role;

-- -----------------------------------------------------------------------------
-- 1. AGENDAMENTO PÚBLICO — a RPC nomeada na ordem
-- -----------------------------------------------------------------------------
-- Patch dirigido na checagem de autenticação que a função já tem. Nada de
-- `replace()` cego: foi assim que a 00021 quebrou `ocupacao_publica` com um
-- `status` ambíguo que só apareceu em tempo de chamada.
DO $$
DECLARE
  v_def TEXT;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'agendar_como_cliente';

  IF v_def IS NULL THEN
    RAISE EXCEPTION 'agendar_como_cliente nao encontrada';
  END IF;

  IF v_def NOT ILIKE '%conta_suspensa()%' THEN
    EXECUTE replace(
      v_def,
      'RAISE EXCEPTION ''Autenticacao obrigatoria'';
  END IF;',
      'RAISE EXCEPTION ''Autenticacao obrigatoria'';
  END IF;

  -- F7.4: conta suspensa nao agenda, nem chamando a API direto.
  IF conta_suspensa() THEN
    RAISE EXCEPTION ''Conta suspensa: entre em contato com o suporte do CutHub'';
  END IF;'
    );
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2. CRIAÇÃO DE BARBEARIA — acrescentado por mim, com motivo
-- -----------------------------------------------------------------------------
-- A ordem nomeou só `agendar_como_cliente`. Acrescento esta porque ela é a
-- fuga da própria suspensão: sem a checagem, o usuário suspenso simplesmente
-- CRIA UMA BARBEARIA NOVA e volta à plataforma por outra porta, com tenant
-- limpo. Suspender deixaria de significar alguma coisa. É a mesma linha de
-- guarda, e o custo de deixar de fora é alto demais para eu não perguntar
-- depois de já ter escrito.
DO $$
DECLARE
  v_def TEXT;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'criar_barbearia_e_vincular';

  IF v_def IS NULL THEN
    RAISE NOTICE 'criar_barbearia_e_vincular nao encontrada, nada a fazer';
    RETURN;
  END IF;

  IF v_def NOT ILIKE '%conta_suspensa()%' THEN
    -- Mesmo ponto de ancoragem da funcao anterior: as duas abrem checando
    -- autenticacao, e a guarda entra logo depois.
    EXECUTE replace(
      v_def,
      'RAISE EXCEPTION ''Autenticacao obrigatoria'';
  END IF;',
      'RAISE EXCEPTION ''Autenticacao obrigatoria'';
  END IF;

  -- F7.4: sem isto o suspenso cria uma barbearia nova e volta por outra porta.
  IF conta_suspensa() THEN
    RAISE EXCEPTION ''Conta suspensa: entre em contato com o suporte do CutHub'';
  END IF;'
    );
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- NÃO COBERTAS, DE PROPÓSITO — registrado para decisão
-- -----------------------------------------------------------------------------
-- Continuam alcançáveis por um usuário suspenso que chame a API direto:
--   adicionar_gestor, alterar_papel_gestor, remover_gestor,
--   cadastrar_cliente_com_conta, cadastrar_profissional_com_conta
-- Todas exigem vínculo com a barbearia do chamador, então o estrago fica
-- dentro do próprio tenant dele — diferente de agendar (atinge outra
-- barbearia) e de criar barbearia (desfaz a suspensão). Ficam para o
-- Arquiteto decidir se entram.
