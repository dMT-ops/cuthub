-- =============================================================================
-- 00021 — AUDITORIA DA PLATAFORMA E SUSPENSÃO DE TENANT ("Mão de Deus")
-- =============================================================================
-- A spec pedia auditoria + coluna de status + filtro nas superfícies públicas.
-- A investigação achou um furo que a spec não previa e que tornaria o kill
-- switch DECORATIVO. Está resolvido aqui, e explicado porque é o tipo de coisa
-- que volta se o motivo não ficar escrito.
--
-- O FURO: O SUSPENSO SE REATIVA SOZINHO
--
-- Duas policies existentes permitem que o próprio alvo edite a linha que
-- guardaria o status:
--
--   barbearia      -> "Barbearia alterada apenas pelo owner" (UPDATE):
--                     ((id = get_barbearia_do_usuario()) AND is_owner())
--   usuario_perfil -> "Atualizacao do proprio perfil" (UPDATE):
--                     (id = auth.uid())
--
-- O trigger `proteger_campos_de_autorizacao` cobre `tipo` e `barbearia_id`, e
-- NÃO cobriria uma coluna nova. Ou seja: bastaria um UPDATE via PostgREST para
-- o dono suspenso pôr a própria barbearia de volta no ar, e para o usuário
-- suspenso se reativar. Corrigido abaixo com triggers dedicados.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. AUDITORIA
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.auditoria_plataforma (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  acao             VARCHAR(80) NOT NULL,
  alvo_tipo        VARCHAR(30) NOT NULL,
  alvo_id          UUID NOT NULL,
  alvo_descricao   VARCHAR(255),
  dados_anteriores JSONB,
  dados_novos      JSONB,
  motivo           TEXT,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT auditoria_alvo_conhecido CHECK (alvo_tipo IN ('barbearia', 'usuario'))
);

CREATE INDEX IF NOT EXISTS idx_auditoria_criado_em
  ON public.auditoria_plataforma (criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_alvo
  ON public.auditoria_plataforma (alvo_tipo, alvo_id, criado_em DESC);

ALTER TABLE public.auditoria_plataforma ENABLE ROW LEVEL SECURITY;

-- Só o admin lê. Não existe policy de UPDATE nem de DELETE: sem policy, a RLS
-- nega por padrão, e nem o admin reescreve o passado. Um log que pode ser
-- editado por quem ele fiscaliza não é log.
DROP POLICY IF EXISTS "Auditoria visivel apenas para admin" ON public.auditoria_plataforma;
CREATE POLICY "Auditoria visivel apenas para admin"
  ON public.auditoria_plataforma
  FOR SELECT
  TO authenticated
  USING (is_admin_supremo());

-- O INSERT acontece dentro das RPCs SECURITY DEFINER abaixo, que já checam o
-- papel. A policy de INSERT existe para o caso de registro direto pelo admin.
DROP POLICY IF EXISTS "Auditoria escrita apenas por admin" ON public.auditoria_plataforma;
CREATE POLICY "Auditoria escrita apenas por admin"
  ON public.auditoria_plataforma
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_supremo());

-- -----------------------------------------------------------------------------
-- 2. O KILL SWITCH
-- -----------------------------------------------------------------------------
-- VARCHAR com CHECK, como a spec pediu, e não o enum `status_registro`: aquele
-- é ativo/inativo e significa "a barbearia arquivou este registro". Suspensão é
-- outra coisa, decidida por outro ator. Misturar os dois faria a barbearia
-- reativar a si mesma trocando o próprio status de registro.
ALTER TABLE public.barbearia
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'ativo';

ALTER TABLE public.usuario_perfil
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'ativo';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'barbearia_status_valido') THEN
    ALTER TABLE public.barbearia
      ADD CONSTRAINT barbearia_status_valido CHECK (status IN ('ativo', 'suspenso'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usuario_perfil_status_valido') THEN
    ALTER TABLE public.usuario_perfil
      ADD CONSTRAINT usuario_perfil_status_valido CHECK (status IN ('ativo', 'suspenso'));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. A TRANCA: só o admin mexe em status
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.proteger_status_da_barbearia()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NOT is_admin_supremo() THEN
    RAISE EXCEPTION 'Alteracao do status da barbearia nao permitida';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_proteger_status_barbearia ON public.barbearia;
CREATE TRIGGER trg_proteger_status_barbearia
  BEFORE UPDATE ON public.barbearia
  FOR EACH ROW EXECUTE FUNCTION public.proteger_status_da_barbearia();

-- `usuario_perfil` já tem o trigger de autorização; a coluna nova entra nele,
-- para não existirem dois triggers concorrendo no mesmo campo.
CREATE OR REPLACE FUNCTION public.proteger_campos_de_autorizacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF is_admin_supremo() THEN
    RETURN NEW;
  END IF;

  IF current_setting('app.vinculo_autorizado', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF NEW.tipo IS DISTINCT FROM OLD.tipo THEN
    RAISE EXCEPTION 'Alteracao do tipo de usuario nao permitida';
  END IF;

  IF NEW.barbearia_id IS DISTINCT FROM OLD.barbearia_id THEN
    RAISE EXCEPTION 'Alteracao do vinculo de barbearia nao permitida';
  END IF;

  -- Sem esta checagem o usuario suspenso se reativa sozinho: a policy
  -- "Atualizacao do proprio perfil" permite o UPDATE da propria linha.
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Alteracao do status do usuario nao permitida';
  END IF;

  RETURN NEW;
END $$;

-- -----------------------------------------------------------------------------
-- 4. AS PORTAS PÚBLICAS
-- -----------------------------------------------------------------------------
-- São exatamente 5 views e 2 funções — levantado no catálogo, não por memória:
-- toda superfície pública passa por `listada_no_catalogo`. A suspensão é uma
-- condição SEPARADA: `listada_no_catalogo` é escolha da barbearia, `status` é
-- decisão da plataforma, e uma não pode desfazer a outra.

CREATE OR REPLACE VIEW public.barbearia_publica AS
  SELECT b.id, b.slug, b.nome, b.cidade, b.estado,
         c.tema_descricao AS descricao,
         c.tema_logo_url AS logo_url,
         c.tema_banner_url AS banner_url,
         c.tema_cor_primaria AS cor_primaria,
         (c.tema_logo_url IS NOT NULL)::integer
       + (c.tema_banner_url IS NOT NULL)::integer
       + (c.tema_descricao IS NOT NULL)::integer
       + (c.tema_cor_primaria IS NOT NULL)::integer AS perfil_completude
    FROM barbearia b
    LEFT JOIN configuracao_barbearia c ON c.barbearia_id = b.id
   WHERE b.listada_no_catalogo = true
     AND b.status = 'ativo';

CREATE OR REPLACE VIEW public.servico_publico AS
  SELECT s.id, s.barbearia_id, s.nome, s.descricao, s.categoria,
         s.preco, s.duracao_minutos, s.imagem_url, s.ordem
    FROM servico s
    JOIN barbearia b ON b.id = s.barbearia_id
   WHERE s.status = 'ativo'::status_registro
     AND b.listada_no_catalogo = true
     AND b.status = 'ativo';

CREATE OR REPLACE VIEW public.profissional_publico AS
  SELECT p.id, p.barbearia_id, p.nome, p.especialidade, p.bio, p.avatar_url
    FROM profissional p
    JOIN barbearia b ON b.id = p.barbearia_id
   WHERE p.status = 'ativo'::status_registro
     AND b.listada_no_catalogo = true
     AND b.status = 'ativo';

CREATE OR REPLACE VIEW public.produto_publico AS
  SELECT p.id, p.barbearia_id, p.nome, p.descricao, p.imagem_url, p.preco, p.ordem
    FROM produto p
    JOIN barbearia b ON b.id = p.barbearia_id
   WHERE p.status = 'ativo'::status_registro
     AND b.listada_no_catalogo = true
     AND b.status = 'ativo';

CREATE OR REPLACE VIEW public.promocao_publica AS
  SELECT p.id, p.barbearia_id, p.titulo, p.descricao, p.desconto_percentual,
         p.regras, p.data_inicio, p.data_fim
    FROM promocao p
    JOIN barbearia b ON b.id = p.barbearia_id
   WHERE p.status = 'ativo'::status_registro
     AND p.data_inicio <= now()
     AND p.data_fim >= now()
     AND b.listada_no_catalogo = true
     AND b.status = 'ativo';

-- -----------------------------------------------------------------------------
-- 5. AS DUAS RPCs PÚBLICAS
-- -----------------------------------------------------------------------------
-- Ambas já barravam por `listada_no_catalogo`; o filtro de suspensão entra na
-- mesma checagem, para não haver dois caminhos.
--
-- Patch dirigido, e não `replace()` no corpo da função: a primeira versão desta
-- migration trocou a string cegamente e produziu `AND status = 'ativo'` dentro
-- de `ocupacao_publica`, que faz JOIN entre `profissional` e `barbearia` -- as
-- duas têm coluna `status`. O Postgres aceitou criar a função e ela só quebrava
-- na chamada, com "column reference status is ambiguous", DERRUBANDO A
-- DISPONIBILIDADE DE TODAS AS BARBEARIAS, não só das suspensas. Pego na
-- validação como anon.

CREATE OR REPLACE FUNCTION public.ocupacao_publica(
  p_profissional_id UUID,
  p_dia_semana INTEGER,
  p_inicio TIMESTAMPTZ,
  p_fim TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_barbearia_id UUID;
  v_jornada JSONB;
  v_ocupados JSONB;
BEGIN
  SELECT p.barbearia_id INTO v_barbearia_id
  FROM profissional p
  JOIN barbearia b ON b.id = p.barbearia_id
  WHERE p.id = p_profissional_id
    AND p.status = 'ativo'
    AND b.listada_no_catalogo = true
    AND b.status = 'ativo';

  IF v_barbearia_id IS NULL THEN
    RAISE EXCEPTION 'Profissional nao disponivel para agendamento';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('hora_inicio', h.hora_inicio, 'hora_fim', h.hora_fim)
                            ORDER BY h.hora_inicio), '[]'::jsonb)
  INTO v_jornada
  FROM horario_trabalho h
  WHERE h.profissional_id = p_profissional_id
    AND h.dia_semana = p_dia_semana
    AND h.ativo = true;

  -- Mesma condicao do constraint agendamento_sem_sobreposicao: cancelado e
  -- faltou liberam o horario. So os limites do intervalo saem daqui.
  SELECT COALESCE(jsonb_agg(jsonb_build_object('inicio', x.inicio, 'fim', x.fim)), '[]'::jsonb)
  INTO v_ocupados
  FROM (
    SELECT a.data_hora AS inicio, a.data_hora_fim AS fim
    FROM agendamento a
    WHERE a.profissional_id = p_profissional_id
      AND a.status NOT IN ('cancelado', 'faltou')
      AND a.data_hora < p_fim
      AND a.data_hora_fim > p_inicio
    UNION ALL
    SELECT b.data_hora_inicio, b.data_hora_fim
    FROM bloqueio b
    WHERE b.barbearia_id = v_barbearia_id
      AND (b.profissional_id = p_profissional_id OR b.profissional_id IS NULL)
      AND b.data_hora_inicio < p_fim
      AND b.data_hora_fim > p_inicio
  ) x;

  RETURN jsonb_build_object('jornada', v_jornada, 'ocupados', v_ocupados);
END $$;

-- `agendar_como_cliente` nao tem JOIN na checagem (le so `barbearia`), entao o
-- patch dirigido aqui e uma linha.
DO $$
DECLARE
  v_def TEXT;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'agendar_como_cliente';

  IF v_def NOT ILIKE '%listada_no_catalogo = true AND status = ''ativo''%' THEN
    EXECUTE replace(
      v_def,
      'listada_no_catalogo = true',
      'listada_no_catalogo = true AND status = ''ativo'''
    );
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 6. AS AÇÕES DO ADMIN — auditoria ANTES do efeito, na mesma transação
-- -----------------------------------------------------------------------------
-- Em RPC, e não em duas chamadas do app: se o app gravasse o log e depois o
-- UPDATE falhasse, o log mentiria; se fizesse o UPDATE e o log falhasse, a ação
-- ficaria invisível. Aqui as duas coisas caem juntas ou nenhuma cai.
CREATE OR REPLACE FUNCTION public.admin_definir_status_barbearia(
  p_barbearia_id UUID,
  p_status TEXT,
  p_motivo TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_anterior TEXT;
  v_nome TEXT;
BEGIN
  IF NOT is_admin_supremo() THEN
    RAISE EXCEPTION 'Operacao restrita ao administrador da plataforma';
  END IF;

  IF p_status NOT IN ('ativo', 'suspenso') THEN
    RAISE EXCEPTION 'Status invalido: %', p_status;
  END IF;

  SELECT status, nome INTO v_anterior, v_nome
    FROM barbearia WHERE id = p_barbearia_id;

  IF v_anterior IS NULL THEN
    RAISE EXCEPTION 'Barbearia nao encontrada';
  END IF;

  IF v_anterior = p_status THEN
    RAISE EXCEPTION 'A barbearia ja esta com status %', p_status;
  END IF;

  INSERT INTO auditoria_plataforma
    (admin_id, acao, alvo_tipo, alvo_id, alvo_descricao, dados_anteriores, dados_novos, motivo)
  VALUES (
    auth.uid(),
    CASE WHEN p_status = 'suspenso' THEN 'SUSPENDER_BARBEARIA' ELSE 'REATIVAR_BARBEARIA' END,
    'barbearia', p_barbearia_id, v_nome,
    jsonb_build_object('status', v_anterior),
    jsonb_build_object('status', p_status),
    p_motivo
  );

  UPDATE barbearia SET status = p_status WHERE id = p_barbearia_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_definir_status_usuario(
  p_usuario_id UUID,
  p_status TEXT,
  p_motivo TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_anterior TEXT;
  v_nome TEXT;
  v_tipo tipo_usuario;
BEGIN
  IF NOT is_admin_supremo() THEN
    RAISE EXCEPTION 'Operacao restrita ao administrador da plataforma';
  END IF;

  IF p_status NOT IN ('ativo', 'suspenso') THEN
    RAISE EXCEPTION 'Status invalido: %', p_status;
  END IF;

  SELECT status, nome, tipo INTO v_anterior, v_nome, v_tipo
    FROM usuario_perfil WHERE id = p_usuario_id;

  IF v_anterior IS NULL THEN
    RAISE EXCEPTION 'Usuario nao encontrado';
  END IF;

  -- Um admin suspendendo outro admin (ou a si mesmo) tranca a plataforma
  -- inteira sem quem destranque. Barrado no banco, não só na tela.
  IF v_tipo = 'admin_supremo' THEN
    RAISE EXCEPTION 'Nao e possivel suspender um administrador da plataforma';
  END IF;

  IF v_anterior = p_status THEN
    RAISE EXCEPTION 'O usuario ja esta com status %', p_status;
  END IF;

  INSERT INTO auditoria_plataforma
    (admin_id, acao, alvo_tipo, alvo_id, alvo_descricao, dados_anteriores, dados_novos, motivo)
  VALUES (
    auth.uid(),
    CASE WHEN p_status = 'suspenso' THEN 'SUSPENDER_USUARIO' ELSE 'REATIVAR_USUARIO' END,
    'usuario', p_usuario_id, v_nome,
    jsonb_build_object('status', v_anterior),
    jsonb_build_object('status', p_status),
    p_motivo
  );

  UPDATE usuario_perfil SET status = p_status WHERE id = p_usuario_id;
END $$;

REVOKE ALL ON FUNCTION public.admin_definir_status_barbearia(UUID, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_definir_status_usuario(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_definir_status_barbearia(UUID, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_definir_status_usuario(UUID, TEXT, TEXT) TO authenticated, service_role;
