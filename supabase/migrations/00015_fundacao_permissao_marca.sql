-- =============================================================================
-- 00015 — FUNDAÇÃO DE PERMISSÃO E MARCA (Fase 2)
-- =============================================================================
-- Depende da 00014, que criou o valor 'gerente' do enum numa transação própria.
--
-- Duas frentes:
--   a) multi-proprietário — papéis owner/gerente e as RPCs que os administram;
--   b) marca da barbearia — campos de identidade e bucket de imagens.
--
-- CONTEXTO QUE JUSTIFICA O FORMATO (investigação em docs/_pair-engineering/log.md)
-- Gerenciar usuário por acesso direto à tabela é impossível, e não por descuido:
-- `usuario_perfil` só aceita INSERT/UPDATE do próprio perfil, não tem policy de
-- DELETE nenhuma, e o trigger `proteger_campos_de_autorizacao` barra alteração
-- de `tipo` e de `barbearia_id`. Verificado que nem o `admin_supremo` remove um
-- perfil. Por isso toda a gestão de acesso mora em RPC SECURITY DEFINER, no
-- molde que a `criar_barbearia_e_vincular` já usava.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. FUNÇÕES DE SUPORTE AO RLS
-- -----------------------------------------------------------------------------

-- get_barbearia_do_usuario() estava VOLATILE enquanto is_admin_supremo() estava
-- STABLE, e as duas aparecem em TODAS as policies. VOLATILE impede o planner de
-- avaliar a função uma vez por query e estraga a estimativa de seletividade:
-- medido em `agendamento`, a estimativa era 87 linhas contra 120 reais, e passou
-- a 123 com STABLE. Em tabela pequena não custa nada; com volume e join, é o que
-- faz o planner escolher o plano errado.
ALTER FUNCTION public.get_barbearia_do_usuario() STABLE;

-- Irmã de is_admin_supremo(). As policies não tinham como perguntar "é owner?".
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM usuario_perfil
    WHERE id = auth.uid() AND tipo = 'owner'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_owner() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_owner() TO authenticated, service_role;


-- -----------------------------------------------------------------------------
-- 2. FUNDADOR DA BARBEARIA
-- -----------------------------------------------------------------------------
-- A tabela não guardava quem criou a barbearia, então "o fundador é imutável"
-- (decisão do Chefe) não tinha como ser verificado.
--
-- SEM ON DELETE: a referência é NO ACTION de propósito. Com ON DELETE SET NULL,
-- apagar o perfil do fundador faria a barbearia perder a marca em silêncio e
-- qualquer owner passaria a poder remover qualquer outro. Assim, a tentativa
-- falha alto em vez de abrir o buraco sem avisar.
ALTER TABLE barbearia
  ADD COLUMN IF NOT EXISTS criado_por UUID REFERENCES usuario_perfil(id);

COMMENT ON COLUMN barbearia.criado_por IS
  'Fundador da barbearia. Nao pode ser removido nem ter o papel alterado pelas RPCs de gestao.';

-- Backfill: barbearias que já existiam nasceram antes desta coluna. Adota o
-- owner mais antigo como fundador — é o mais próximo da verdade disponível.
UPDATE barbearia b
SET criado_por = (
  SELECT u.id
  FROM usuario_perfil u
  WHERE u.barbearia_id = b.id AND u.tipo = 'owner'
  ORDER BY u.criado_em
  LIMIT 1
)
WHERE b.criado_por IS NULL;


-- -----------------------------------------------------------------------------
-- 3. criar_barbearia_e_vincular — grava o fundador e fecha o bypass
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.criar_barbearia_e_vincular(p_nome character varying)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_barbearia_id UUID;
  v_vinculo_atual UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticacao obrigatoria';
  END IF;

  SELECT barbearia_id INTO v_vinculo_atual
  FROM usuario_perfil WHERE id = auth.uid();

  IF v_vinculo_atual IS NOT NULL THEN
    RAISE EXCEPTION 'Usuario ja vinculado a uma barbearia';
  END IF;

  INSERT INTO barbearia (nome, criado_por)
  VALUES (p_nome, auth.uid())
  RETURNING id INTO v_barbearia_id;

  -- Desabilita a restrição do trigger apenas para o UPDATE privilegiado abaixo.
  PERFORM set_config('app.vinculo_autorizado', 'on', true);

  UPDATE usuario_perfil
  SET barbearia_id = v_barbearia_id, tipo = 'owner'
  WHERE id = auth.uid();

  -- E volta a ligar. Antes ficava ligado até o fim da transação: hoje o
  -- PostgREST usa uma transação por chamada e o raio era pequeno, mas basta uma
  -- função passar a chamar outra para a proteção sumir de tudo que vier depois.
  PERFORM set_config('app.vinculo_autorizado', '', true);

  INSERT INTO configuracao_barbearia (barbearia_id) VALUES (v_barbearia_id);

  RETURN v_barbearia_id;
END;
$$;


-- -----------------------------------------------------------------------------
-- 4. RPCs DE GESTÃO DE ACESSO
-- -----------------------------------------------------------------------------
-- As três recebem a barbearia alvo explicitamente, com default para a do
-- chamador. Isso é o que permite o futuro console do admin_supremo agir sobre
-- qualquer barbearia sem precisar de um segundo conjunto de funções.

-- Quem pode administrar acessos da barbearia informada.
CREATE OR REPLACE FUNCTION public.checar_gestao_de_acesso(p_barbearia_id UUID)
RETURNS VOID
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticacao obrigatoria';
  END IF;

  IF is_admin_supremo() THEN
    RETURN;
  END IF;

  IF p_barbearia_id IS NULL OR p_barbearia_id <> get_barbearia_do_usuario() THEN
    RAISE EXCEPTION 'Operacao nao permitida para esta barbearia';
  END IF;

  IF NOT is_owner() THEN
    RAISE EXCEPTION 'Apenas o proprietario pode gerenciar acessos';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.checar_gestao_de_acesso(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.checar_gestao_de_acesso(UUID) TO authenticated, service_role;


-- Dá acesso a uma conta EXISTENTE.
--
-- Não cria conta: `usuario_perfil.id` referencia `auth.users(id)`, então não há
-- perfil sem conta de autenticação. Criar conta exige service_role, que nunca
-- deve chegar ao frontend. A pessoa se cadastra e depois é promovida aqui.
CREATE OR REPLACE FUNCTION public.adicionar_gestor(
  p_email TEXT,
  p_nome TEXT DEFAULT NULL,
  p_tipo tipo_usuario DEFAULT 'gerente',
  p_barbearia_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_barbearia_id UUID;
  v_usuario_id UUID;
  v_vinculo_atual UUID;
  v_tipo_atual tipo_usuario;
BEGIN
  v_barbearia_id := COALESCE(p_barbearia_id, get_barbearia_do_usuario());
  PERFORM checar_gestao_de_acesso(v_barbearia_id);

  IF p_tipo NOT IN ('owner', 'gerente') THEN
    RAISE EXCEPTION 'Papel invalido: use owner ou gerente';
  END IF;

  IF p_email IS NULL OR btrim(p_email) = '' THEN
    RAISE EXCEPTION 'O e-mail e obrigatorio';
  END IF;

  v_usuario_id := perfil_por_email(p_email);

  IF v_usuario_id IS NULL THEN
    RAISE EXCEPTION 'Nao existe conta com este e-mail. Peca para a pessoa criar a conta primeiro';
  END IF;

  SELECT barbearia_id, tipo INTO v_vinculo_atual, v_tipo_atual
  FROM usuario_perfil WHERE id = v_usuario_id;

  IF v_tipo_atual = 'admin_supremo' THEN
    RAISE EXCEPTION 'Nao e possivel alterar o vinculo de um administrador';
  END IF;

  IF v_vinculo_atual = v_barbearia_id THEN
    RAISE EXCEPTION 'Esta conta ja tem acesso a esta barbearia';
  END IF;

  IF v_vinculo_atual IS NOT NULL THEN
    RAISE EXCEPTION 'Esta conta ja pertence a outra barbearia';
  END IF;

  PERFORM set_config('app.vinculo_autorizado', 'on', true);

  UPDATE usuario_perfil
  SET barbearia_id = v_barbearia_id,
      tipo = p_tipo,
      nome = COALESCE(NULLIF(btrim(COALESCE(p_nome, '')), ''), nome)
  WHERE id = v_usuario_id;

  PERFORM set_config('app.vinculo_autorizado', '', true);

  RETURN v_usuario_id;
END;
$$;

REVOKE ALL ON FUNCTION public.adicionar_gestor(TEXT, TEXT, tipo_usuario, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.adicionar_gestor(TEXT, TEXT, tipo_usuario, UUID) TO authenticated, service_role;


CREATE OR REPLACE FUNCTION public.alterar_papel_gestor(
  p_usuario_id UUID,
  p_novo_tipo tipo_usuario
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_barbearia_id UUID;
  v_fundador UUID;
BEGIN
  SELECT barbearia_id INTO v_barbearia_id
  FROM usuario_perfil WHERE id = p_usuario_id;

  IF v_barbearia_id IS NULL THEN
    RAISE EXCEPTION 'Usuario nao encontrado ou sem vinculo com barbearia';
  END IF;

  PERFORM checar_gestao_de_acesso(v_barbearia_id);

  IF p_novo_tipo NOT IN ('owner', 'gerente') THEN
    RAISE EXCEPTION 'Papel invalido: use owner ou gerente';
  END IF;

  IF p_usuario_id = auth.uid() THEN
    RAISE EXCEPTION 'Nao e possivel alterar o proprio papel';
  END IF;

  SELECT criado_por INTO v_fundador FROM barbearia WHERE id = v_barbearia_id;

  -- Rebaixar o fundador esvaziaria a regra "o fundador nao pode ser removido"
  -- por outro caminho: bastaria torna-lo gerente e remove-lo em seguida.
  IF v_fundador IS NOT NULL AND p_usuario_id = v_fundador THEN
    RAISE EXCEPTION 'O fundador da barbearia nao pode ter o papel alterado';
  END IF;

  PERFORM set_config('app.vinculo_autorizado', 'on', true);

  UPDATE usuario_perfil SET tipo = p_novo_tipo WHERE id = p_usuario_id;

  PERFORM set_config('app.vinculo_autorizado', '', true);
END;
$$;

REVOKE ALL ON FUNCTION public.alterar_papel_gestor(UUID, tipo_usuario) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.alterar_papel_gestor(UUID, tipo_usuario) TO authenticated, service_role;


-- Tira o acesso de alguem a barbearia.
--
-- DESVINCULA, NAO APAGA. `usuario_perfil.id` referencia `auth.users(id)`:
-- apagar a linha deixaria uma conta de autenticacao sem perfil, e o
-- ProtectedRoute trata isso como "Conta sem perfil" — a pessoa ficaria trancada
-- para fora sem caminho de volta, e o dado de quem atendeu o que se perderia.
-- Desvincular devolve a conta ao estado de quem nao gerencia nada, e e
-- reversivel pelo adicionar_gestor.
CREATE OR REPLACE FUNCTION public.remover_gestor(p_usuario_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_barbearia_id UUID;
  v_fundador UUID;
  v_tipo tipo_usuario;
BEGIN
  SELECT barbearia_id, tipo INTO v_barbearia_id, v_tipo
  FROM usuario_perfil WHERE id = p_usuario_id;

  IF v_barbearia_id IS NULL THEN
    RAISE EXCEPTION 'Usuario nao encontrado ou sem vinculo com barbearia';
  END IF;

  PERFORM checar_gestao_de_acesso(v_barbearia_id);

  IF v_tipo = 'admin_supremo' THEN
    RAISE EXCEPTION 'Nao e possivel remover um administrador';
  END IF;

  IF p_usuario_id = auth.uid() THEN
    RAISE EXCEPTION 'Nao e possivel remover o proprio acesso';
  END IF;

  SELECT criado_por INTO v_fundador FROM barbearia WHERE id = v_barbearia_id;

  IF v_fundador IS NOT NULL AND p_usuario_id = v_fundador THEN
    RAISE EXCEPTION 'O fundador da barbearia nao pode ser removido';
  END IF;

  PERFORM set_config('app.vinculo_autorizado', 'on', true);

  UPDATE usuario_perfil
  SET barbearia_id = NULL, tipo = 'cliente'
  WHERE id = p_usuario_id;

  PERFORM set_config('app.vinculo_autorizado', '', true);
END;
$$;

REVOKE ALL ON FUNCTION public.remover_gestor(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remover_gestor(UUID) TO authenticated, service_role;


-- -----------------------------------------------------------------------------
-- 5. MARCA DA BARBEARIA
-- -----------------------------------------------------------------------------
-- Mora em configuracao_barbearia, que o gerente já pode editar (decisão do
-- Chefe sobre horários, estendida à marca). É o contrato de dados que a visão
-- do cliente (Fase 4) vai consumir.
ALTER TABLE configuracao_barbearia
  ADD COLUMN IF NOT EXISTS tema_cor_primaria VARCHAR(7),
  ADD COLUMN IF NOT EXISTS tema_logo_url TEXT,
  ADD COLUMN IF NOT EXISTS tema_banner_url TEXT,
  ADD COLUMN IF NOT EXISTS tema_descricao TEXT;

-- Cor guardada como hex de 6 dígitos. Sem isto, qualquer string entra e o erro
-- só aparece na tela do cliente, meses depois, como uma cor que não renderiza.
ALTER TABLE configuracao_barbearia
  DROP CONSTRAINT IF EXISTS configuracao_cor_primaria_hex;
ALTER TABLE configuracao_barbearia
  ADD CONSTRAINT configuracao_cor_primaria_hex
  CHECK (tema_cor_primaria IS NULL OR tema_cor_primaria ~ '^#[0-9A-Fa-f]{6}$');

ALTER TABLE configuracao_barbearia
  DROP CONSTRAINT IF EXISTS configuracao_descricao_tamanho;
ALTER TABLE configuracao_barbearia
  ADD CONSTRAINT configuracao_descricao_tamanho
  CHECK (tema_descricao IS NULL OR char_length(tema_descricao) <= 1000);


-- -----------------------------------------------------------------------------
-- 6. BUCKET DA MARCA
-- -----------------------------------------------------------------------------
-- 5 MB porque banner de capa não cabe nos 2 MB do bucket de serviços.
-- SEM SVG: o bucket é público e SVG é documento que pode carregar <script>.
-- Servido do mesmo domínio, viraria vetor de XSS.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'barbearia_assets',
  'barbearia_assets',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Leitura publica de assets de barbearia" ON storage.objects;
DROP POLICY IF EXISTS "Barbearia insere assets" ON storage.objects;
DROP POLICY IF EXISTS "Barbearia atualiza assets" ON storage.objects;
DROP POLICY IF EXISTS "Barbearia remove assets" ON storage.objects;

-- Leitura pública: é isto que a visão do cliente (Fase 4) vai exibir.
CREATE POLICY "Leitura publica de assets de barbearia"
ON storage.objects FOR SELECT
USING (bucket_id = 'barbearia_assets');

-- Escrita para quem pertence à barbearia dona da pasta — mesma convenção do
-- bucket de serviços, em que a primeira pasta do caminho é o barbearia_id.
CREATE POLICY "Barbearia insere assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'barbearia_assets'
  AND ((storage.foldername(name))[1] = (get_barbearia_do_usuario())::text OR is_admin_supremo())
);

CREATE POLICY "Barbearia atualiza assets"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'barbearia_assets'
  AND ((storage.foldername(name))[1] = (get_barbearia_do_usuario())::text OR is_admin_supremo())
)
WITH CHECK (
  bucket_id = 'barbearia_assets'
  AND ((storage.foldername(name))[1] = (get_barbearia_do_usuario())::text OR is_admin_supremo())
);

CREATE POLICY "Barbearia remove assets"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'barbearia_assets'
  AND ((storage.foldername(name))[1] = (get_barbearia_do_usuario())::text OR is_admin_supremo())
);


-- -----------------------------------------------------------------------------
-- 7. RLS DA TABELA barbearia — renomear passa a ser do owner
-- -----------------------------------------------------------------------------
-- A policy única FOR ALL dava ao gerente o mesmo poder do owner sobre a
-- barbearia. Quebrada em SELECT (quem pertence) e UPDATE (owner ou admin).
--
-- INSERT e DELETE ficam sem policy, ou seja, negados por acesso direto.
-- INSERT continua funcionando pelo caminho real, que é a RPC
-- criar_barbearia_e_vincular (SECURITY DEFINER, não passa por RLS).
--
-- Sobre o DELETE: hoje ele já falhava, mas por acidente. A FK
-- usuario_perfil.barbearia_id é ON DELETE SET NULL, então apagar a barbearia
-- dispara um UPDATE em usuario_perfil que o trigger proteger_campos_de_autorizacao
-- recusa ("Alteracao do vinculo de barbearia nao permitida"). Ou seja, a
-- proteção contra apagar uma barbearia inteira — com agendamentos, clientes e
-- financeiro em cascata — dependia de um efeito colateral de um trigger escrito
-- para outra finalidade. Negar explicitamente aqui deixa a intenção no lugar
-- certo, e sobrevive a quem um dia mexer no trigger.
DROP POLICY IF EXISTS "Barbearia visible to owner or admin" ON barbearia;

CREATE POLICY "Barbearia visivel para quem pertence"
ON barbearia FOR SELECT TO authenticated
USING (id = get_barbearia_do_usuario() OR is_admin_supremo());

CREATE POLICY "Barbearia alterada apenas pelo owner"
ON barbearia FOR UPDATE TO authenticated
USING ((id = get_barbearia_do_usuario() AND is_owner()) OR is_admin_supremo())
WITH CHECK ((id = get_barbearia_do_usuario() AND is_owner()) OR is_admin_supremo());
