-- =============================================================================
-- 00012 — CADASTRO DE CLIENTE E PROFISSIONAL COM VÍNCULO DE CONTA
-- =============================================================================
-- Prepara o terreno para as áreas logadas de cliente e de profissional.
--
-- O vínculo entre uma pessoa e uma barbearia é `cliente.usuario_id` /
-- `profissional.usuario_id`, ambos apontando para `usuario_perfil`. Com ele,
-- a mesma conta poderá futuramente listar todas as barbearias em que é
-- cliente (ou onde trabalha) sem duplicar cadastro.
--
-- POR QUE UMA FUNÇÃO NO BANCO
-- O e-mail de uma conta mora em `auth.users`, que o frontend não pode
-- consultar com a chave anônima. Descobrir "já existe conta com este e-mail?"
-- exige SECURITY DEFINER.
--
-- SEGURANÇA
-- SECURITY DEFINER ignora RLS, então quem chama poderia, sem validação,
-- inserir registros em QUALQUER barbearia. Por isso as duas funções abaixo
-- checam explicitamente que a barbearia informada é a do usuário autenticado
-- (admin_supremo é a única exceção). Sem essa checagem, a função seria um
-- furo de isolamento maior do que o problema que resolve.
--
-- O QUE ESTA MIGRATION NÃO FAZ
-- Não cria usuários em `auth.users`. Isso exige a service_role, que nunca
-- deve chegar ao frontend. A criação da conta em si acontecerá por convite
-- (magic link) ou auto-cadastro do próprio cliente; até lá, `usuario_id`
-- fica NULL e o cadastro funciona normalmente.
-- =============================================================================

-- Valida que o chamador pode operar sobre a barbearia informada
CREATE OR REPLACE FUNCTION public.checar_acesso_barbearia(p_barbearia_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticacao obrigatoria';
  END IF;

  IF NOT public.is_admin_supremo()
     AND p_barbearia_id IS DISTINCT FROM public.get_barbearia_do_usuario() THEN
    RAISE EXCEPTION 'Operacao nao permitida para esta barbearia';
  END IF;
END $$;

-- Perfil já existente para um e-mail, se houver
CREATE OR REPLACE FUNCTION public.perfil_por_email(p_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario_id UUID;
BEGIN
  IF p_email IS NULL OR btrim(p_email) = '' THEN
    RETURN NULL;
  END IF;

  SELECT p.id INTO v_usuario_id
  FROM usuario_perfil p
  JOIN auth.users u ON u.id = p.id
  WHERE lower(u.email) = lower(btrim(p_email))
  LIMIT 1;

  RETURN v_usuario_id;
END $$;

-- -----------------------------------------------------------------------------
-- CLIENTE
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cadastrar_cliente_com_conta(
  p_barbearia_id     UUID,
  p_nome             TEXT,
  p_email            TEXT DEFAULT NULL,
  p_telefone         TEXT DEFAULT NULL,
  p_data_nascimento  DATE DEFAULT NULL,
  p_observacoes      TEXT DEFAULT NULL
)
RETURNS TABLE (cliente_id UUID, usuario_id UUID, conta_vinculada BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario_id UUID;
  v_cliente_id UUID;
BEGIN
  PERFORM public.checar_acesso_barbearia(p_barbearia_id);

  IF p_nome IS NULL OR btrim(p_nome) = '' THEN
    RAISE EXCEPTION 'O nome do cliente e obrigatorio';
  END IF;

  v_usuario_id := public.perfil_por_email(p_email);

  -- Um mesmo usuário não pode ser cliente duas vezes na mesma barbearia
  IF v_usuario_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM cliente
    WHERE barbearia_id = p_barbearia_id AND cliente.usuario_id = v_usuario_id
  ) THEN
    RAISE EXCEPTION 'Esta conta ja esta cadastrada como cliente desta barbearia';
  END IF;

  INSERT INTO cliente (
    barbearia_id, usuario_id, nome, email, telefone,
    data_nascimento, observacoes, status
  )
  VALUES (
    p_barbearia_id,
    v_usuario_id,
    btrim(p_nome),
    NULLIF(btrim(COALESCE(p_email, '')), ''),
    NULLIF(btrim(COALESCE(p_telefone, '')), ''),
    p_data_nascimento,
    NULLIF(btrim(COALESCE(p_observacoes, '')), ''),
    'ativo'
  )
  RETURNING id INTO v_cliente_id;

  RETURN QUERY SELECT v_cliente_id, v_usuario_id, (v_usuario_id IS NOT NULL);
END $$;

-- -----------------------------------------------------------------------------
-- PROFISSIONAL
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cadastrar_profissional_com_conta(
  p_barbearia_id        UUID,
  p_nome                TEXT,
  p_email               TEXT DEFAULT NULL,
  p_telefone            TEXT DEFAULT NULL,
  p_especialidade       TEXT DEFAULT NULL,
  p_bio                 TEXT DEFAULT NULL,
  p_comissao_percentual NUMERIC DEFAULT 50
)
RETURNS TABLE (profissional_id UUID, usuario_id UUID, conta_vinculada BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario_id UUID;
  v_profissional_id UUID;
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

  RETURN QUERY SELECT v_profissional_id, v_usuario_id, (v_usuario_id IS NOT NULL);
END $$;

-- Apenas usuários autenticados podem chamar; anon não tem acesso
REVOKE EXECUTE ON FUNCTION public.checar_acesso_barbearia(UUID) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.perfil_por_email(TEXT) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.cadastrar_cliente_com_conta(UUID, TEXT, TEXT, TEXT, DATE, TEXT) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.cadastrar_profissional_com_conta(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.cadastrar_cliente_com_conta(UUID, TEXT, TEXT, TEXT, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cadastrar_profissional_com_conta(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC) TO authenticated;
