-- =============================================================================
-- 00024 — PROMOÇÃO DE PERFIL AO VINCULAR PROFISSIONAL
-- =============================================================================
-- Bug encontrado pelo Chefe em uso real: cadastrar na aba Equipe um e-mail que
-- já tinha conta vinculava a ficha do profissional (`profissional.usuario_id`)
-- e **não mexia em `usuario_perfil`**. A pessoa continuava `tipo = 'cliente'`,
-- e no login caía na Área do Cliente sem nunca alcançar a própria agenda.
--
-- `adicionar_gestor` já fazia certo desde a Fase 2 — inclusive já usava o
-- `set_config('app.vinculo_autorizado', ...)`, que é obrigatório aqui: o
-- trigger `proteger_campos_de_autorizacao` barra alteração de `tipo` e de
-- `barbearia_id`, e SECURITY DEFINER **não** desliga trigger. Sem essa linha a
-- promoção falharia em tempo de execução.
--
-- Reescrevo a função inteira em vez de aplicar `replace()` no corpo: nesta
-- fase o patch por string já me custou duas vezes (um `status` ambíguo e um
-- CRLF que não casou em silêncio).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.cadastrar_profissional_com_conta(
  p_barbearia_id UUID,
  p_nome TEXT,
  p_email TEXT DEFAULT NULL,
  p_telefone TEXT DEFAULT NULL,
  p_especialidade TEXT DEFAULT NULL,
  p_bio TEXT DEFAULT NULL,
  p_comissao_percentual NUMERIC DEFAULT 50
)
RETURNS TABLE(profissional_id UUID, usuario_id UUID, conta_vinculada BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_usuario_id UUID;
  v_profissional_id UUID;
  v_tipo_atual tipo_usuario;
  v_vinculo_atual UUID;
BEGIN
  PERFORM public.checar_acesso_barbearia(p_barbearia_id);

  IF p_nome IS NULL OR btrim(p_nome) = '' THEN
    RAISE EXCEPTION 'O nome do profissional e obrigatorio';
  END IF;

  v_usuario_id := public.perfil_por_email(p_email);

  IF v_usuario_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM profissional
    WHERE barbearia_id = p_barbearia_id AND profissional.usuario_id = v_usuario_id
  ) THEN
    RAISE EXCEPTION 'Esta conta ja esta cadastrada como profissional desta barbearia';
  END IF;

  INSERT INTO profissional (
    barbearia_id, usuario_id, nome, email, telefone,
    especialidade, bio, comissao_percentual, status
  )
  VALUES (
    p_barbearia_id,
    v_usuario_id,
    btrim(p_nome),
    NULLIF(btrim(COALESCE(p_email, '')), ''),
    NULLIF(btrim(COALESCE(p_telefone, '')), ''),
    NULLIF(btrim(COALESCE(p_especialidade, '')), ''),
    NULLIF(btrim(COALESCE(p_bio, '')), ''),
    COALESCE(p_comissao_percentual, 50),
    'ativo'
  )
  RETURNING id INTO v_profissional_id;

  -- A PROMOÇÃO. Sem ela a ficha existe e a pessoa não entra.
  IF v_usuario_id IS NOT NULL THEN
    SELECT tipo, barbearia_id INTO v_tipo_atual, v_vinculo_atual
      FROM usuario_perfil WHERE id = v_usuario_id;

    -- Só promove quem é `cliente` e não pertence a outra barbearia.
    --
    -- Duas coisas que essa condição protege, e que a spec não pedia:
    --   * um `owner` que se cadastra como barbeiro da própria loja CONTINUA
    --     owner. Rebaixá-lo para `profissional` o expulsaria do próprio painel.
    --   * uma conta já vinculada a outra barbearia não é sequestrada em
    --     silêncio -- mesmo cuidado que `adicionar_gestor` já tinha.
    IF v_tipo_atual = 'cliente'
       AND (v_vinculo_atual IS NULL OR v_vinculo_atual = p_barbearia_id) THEN
      -- Obrigatório: o trigger de autorização barra `tipo` e `barbearia_id`, e
      -- SECURITY DEFINER nao desliga trigger.
      PERFORM set_config('app.vinculo_autorizado', 'on', true);

      UPDATE usuario_perfil
         SET tipo = 'profissional',
             barbearia_id = p_barbearia_id
       WHERE id = v_usuario_id;
    END IF;
  END IF;

  RETURN QUERY SELECT v_profissional_id, v_usuario_id, (v_usuario_id IS NOT NULL);
END $function$;

-- -----------------------------------------------------------------------------
-- CORREÇÃO DOS REGISTROS JÁ DEFEITUOSOS
-- -----------------------------------------------------------------------------
-- Quem já foi vinculado antes desta migration ficou com ficha de profissional e
-- perfil de cliente. Levantado antes de escrever: 1 registro ("Vitor"), da
-- Barbearia do Renan.
DO $$
DECLARE
  v_corrigidos INTEGER;
BEGIN
  PERFORM set_config('app.vinculo_autorizado', 'on', true);

  WITH defeituosos AS (
    SELECT DISTINCT ON (p.usuario_id) p.usuario_id, p.barbearia_id
      FROM profissional p
      JOIN usuario_perfil up ON up.id = p.usuario_id
     WHERE up.tipo = 'cliente'
       AND up.barbearia_id IS NULL
       AND p.status = 'ativo'
     ORDER BY p.usuario_id, p.criado_em
  )
  UPDATE usuario_perfil up
     SET tipo = 'profissional',
         barbearia_id = d.barbearia_id
    FROM defeituosos d
   WHERE up.id = d.usuario_id;

  GET DIAGNOSTICS v_corrigidos = ROW_COUNT;
  RAISE NOTICE 'Perfis promovidos de cliente para profissional: %', v_corrigidos;
END $$;
