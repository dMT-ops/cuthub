-- =============================================================================
-- 00017 — CATÁLOGO PÚBLICO DE BARBEARIAS
-- =============================================================================
-- Primeira superfície de marketplace do produto. Até aqui o banco era invisível
-- para quem não estava autenticado, com uma única exceção: a vitrine de produtos
-- da Fase 3. Esta migration acrescenta a segunda — o catálogo — e as duas
-- seguem a mesma regra, que virou obrigatória depois do furo da Fase 3:
--
--   REVOKE ALL antes do GRANT SELECT.
--
-- O Supabase concede todos os privilégios a `anon` em cada objeto novo do schema
-- public, e view não tem RLS para segurar. Conceder sem revogar deixa a view
-- gravável pela internet.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. EXTENSÕES DE BUSCA
-- -----------------------------------------------------------------------------
-- Sem `unaccent`, procurar "barbearia do joao" não encontra "Barbearia do João".
-- É o tipo de frustração que ninguém reporta como bug — a pessoa só conclui que
-- a barbearia não está no CutHub.
--
-- No schema `extensions`, que é onde o Supabase mantém as demais
-- (uuid-ossp, pgcrypto). Por isso as chamadas abaixo vão qualificadas.
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;


-- -----------------------------------------------------------------------------
-- 2. COLUNAS DO CATÁLOGO
-- -----------------------------------------------------------------------------
ALTER TABLE barbearia
  ADD COLUMN IF NOT EXISTS slug VARCHAR(255),
  ADD COLUMN IF NOT EXISTS cidade VARCHAR(120),
  -- `estado` acompanha `cidade` porque "Santo Antônio" existe em vários estados;
  -- sem ele o filtro por cidade mistura barbearias de lugares diferentes.
  ADD COLUMN IF NOT EXISTS estado CHAR(2),
  -- Opt-in com padrão ligado, por decisão do Chefe: o catálogo nasce cheio, mas
  -- a barbearia pode sair. As contas que já existiam se cadastraram antes desta
  -- decisão e não concordaram com estar num catálogo público.
  ADD COLUMN IF NOT EXISTS listada_no_catalogo BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN barbearia.slug IS
  'Endereco publico da barbearia (/b/<slug>). Gerado no cadastro e NAO muda quando o nome muda, para nao quebrar link ja divulgado.';


-- -----------------------------------------------------------------------------
-- 3. GERAÇÃO DO SLUG
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.slugificar(p_texto TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public, extensions
AS $$
  SELECT trim(both '-' from
           regexp_replace(
             regexp_replace(
               lower(extensions.unaccent(coalesce(p_texto, ''))),
               '[^a-z0-9]+', '-', 'g'
             ),
             '-{2,}', '-', 'g'
           )
         );
$$;

-- Slug livre a partir de um nome, resolvendo colisão com sufixo numérico.
-- Duas barbearias podem se chamar igual em cidades diferentes — isso não é erro,
-- e o cadastro não pode falhar por causa disso.
CREATE OR REPLACE FUNCTION public.slug_disponivel(p_nome TEXT, p_id UUID DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  v_base TEXT;
  v_slug TEXT;
  v_n INTEGER := 1;
BEGIN
  v_base := slugificar(p_nome);

  -- Nome só de caracteres que somem na slugificação (ex.: "!!!") não pode gerar
  -- slug vazio, que viraria a rota /b/ e colidiria com o catálogo.
  IF v_base = '' THEN
    v_base := 'barbearia';
  END IF;

  v_slug := v_base;

  WHILE EXISTS (
    SELECT 1 FROM barbearia
    WHERE slug = v_slug AND (p_id IS NULL OR id <> p_id)
  ) LOOP
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  END LOOP;

  RETURN v_slug;
END;
$$;

-- Backfill: as barbearias que já existem nasceram antes desta coluna.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, nome FROM barbearia WHERE slug IS NULL ORDER BY criado_em LOOP
    UPDATE barbearia SET slug = slug_disponivel(r.nome, r.id) WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE barbearia ALTER COLUMN slug SET NOT NULL;

ALTER TABLE barbearia DROP CONSTRAINT IF EXISTS barbearia_slug_unico;
ALTER TABLE barbearia ADD CONSTRAINT barbearia_slug_unico UNIQUE (slug);

-- Só no INSERT, de propósito. Regerar o slug quando a barbearia muda de nome
-- quebraria todo link já compartilhado — e o link é justamente o que a barbearia
-- coloca na bio da rede social.
CREATE OR REPLACE FUNCTION public.ao_criar_barbearia_gerar_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.slug IS NULL OR btrim(NEW.slug) = '' THEN
    NEW.slug := slug_disponivel(NEW.nome, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_slug_barbearia ON barbearia;
CREATE TRIGGER trg_slug_barbearia
  BEFORE INSERT ON barbearia
  FOR EACH ROW EXECUTE FUNCTION ao_criar_barbearia_gerar_slug();


-- -----------------------------------------------------------------------------
-- 4. ÍNDICES DE BUSCA
-- -----------------------------------------------------------------------------
-- `unaccent` não é IMMUTABLE por si só, então não entra em índice diretamente.
-- A `slugificar` acima é IMMUTABLE e faz o mesmo trabalho — indexá-la dá busca
-- sem acento de graça, porque o slug já é a forma normalizada do nome.
CREATE INDEX IF NOT EXISTS idx_barbearia_slug_trgm
  ON barbearia USING gin (slug extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_barbearia_catalogo
  ON barbearia (listada_no_catalogo, cidade, estado);


-- -----------------------------------------------------------------------------
-- 5. VIEW DO CATÁLOGO
-- -----------------------------------------------------------------------------
-- A marca mora em `configuracao_barbearia`, então a view junta as duas tabelas.
-- LEFT JOIN, e não INNER: barbearia sem configuração ainda precisa aparecer no
-- catálogo — 2 das 3 existentes hoje não têm marca nenhuma configurada, e sumir
-- do catálogo por isso seria pior do que aparecer com card de fallback.
--
-- `perfil_completude` é o que ordena o modal de "principais": conta quantos
-- campos de marca estão preenchidos. Não inventa métrica de popularidade — o
-- banco não tem avaliação nem contador — e empurra card vazio para baixo.
DROP VIEW IF EXISTS barbearia_publica;
CREATE VIEW barbearia_publica
WITH (security_invoker = false) AS
SELECT
  b.id,
  b.slug,
  b.nome,
  b.cidade,
  b.estado,
  c.tema_descricao   AS descricao,
  c.tema_logo_url    AS logo_url,
  c.tema_banner_url  AS banner_url,
  c.tema_cor_primaria AS cor_primaria,
  (
    (c.tema_logo_url     IS NOT NULL)::int +
    (c.tema_banner_url   IS NOT NULL)::int +
    (c.tema_descricao    IS NOT NULL)::int +
    (c.tema_cor_primaria IS NOT NULL)::int
  ) AS perfil_completude
FROM barbearia b
LEFT JOIN configuracao_barbearia c ON c.barbearia_id = b.id
WHERE b.listada_no_catalogo = true;

COMMENT ON VIEW barbearia_publica IS
  'Catalogo legivel sem autenticacao. O filtro listada_no_catalogo e o recorte de colunas sao a unica protecao: a view roda com security_invoker=false e NAO aplica a RLS de barbearia.';

-- A regra da Fase 3. GRANT SELECT sozinho não remove o que o default privileges
-- do Supabase já concedeu.
REVOKE ALL ON barbearia_publica FROM PUBLIC;
REVOKE ALL ON barbearia_publica FROM anon, authenticated;
GRANT SELECT ON barbearia_publica TO anon, authenticated;


-- -----------------------------------------------------------------------------
-- 6. VIEWS DO PERFIL PÚBLICO — serviços e profissionais
-- -----------------------------------------------------------------------------
-- O perfil precisa mostrar o que a barbearia faz e quem atende. As duas tabelas
-- estão fechadas por RLS de barbearia, então o público lê views curadas.
DROP VIEW IF EXISTS servico_publico;
CREATE VIEW servico_publico
WITH (security_invoker = false) AS
SELECT
  s.id,
  s.barbearia_id,
  s.nome,
  s.descricao,
  s.categoria,
  s.preco,
  s.duracao_minutos,
  s.imagem_url,
  s.ordem
FROM servico s
JOIN barbearia b ON b.id = s.barbearia_id
WHERE s.status = 'ativo' AND b.listada_no_catalogo = true;

REVOKE ALL ON servico_publico FROM PUBLIC;
REVOKE ALL ON servico_publico FROM anon, authenticated;
GRANT SELECT ON servico_publico TO anon, authenticated;

-- ATENÇÃO AO RECORTE DE COLUNAS AQUI.
-- `profissional` guarda `comissao_percentual`, `email`, `telefone` e
-- `usuario_id`. Nenhum desses pode aparecer num perfil público — comissão é
-- dado financeiro interno, e e-mail e telefone são dados pessoais de quem
-- trabalha na barbearia. É o mesmo cuidado que manteve `quantidade` fora da
-- vitrine de produtos, e policy não resolve: ela filtra linha, não coluna.
DROP VIEW IF EXISTS profissional_publico;
CREATE VIEW profissional_publico
WITH (security_invoker = false) AS
SELECT
  p.id,
  p.barbearia_id,
  p.nome,
  p.especialidade,
  p.bio,
  p.avatar_url
FROM profissional p
JOIN barbearia b ON b.id = p.barbearia_id
WHERE p.status = 'ativo' AND b.listada_no_catalogo = true;

COMMENT ON VIEW profissional_publico IS
  'Equipe visivel no perfil publico. NAO inclui comissao_percentual, email, telefone nem usuario_id.';

REVOKE ALL ON profissional_publico FROM PUBLIC;
REVOKE ALL ON profissional_publico FROM anon, authenticated;
GRANT SELECT ON profissional_publico TO anon, authenticated;


-- -----------------------------------------------------------------------------
-- 7. A VITRINE DA FASE 3 PRECISA RESPEITAR O OPT-IN
-- -----------------------------------------------------------------------------
-- `produto_publico` foi criada antes de existir `listada_no_catalogo`. Sem este
-- ajuste, uma barbearia que sair do catálogo continuaria com os produtos
-- expostos publicamente — ela sumiria da lista mas seguiria vendendo vitrine
-- para quem tivesse o link. Opt-out tem de valer para tudo que é público.
DROP VIEW IF EXISTS produto_publico;
CREATE VIEW produto_publico
WITH (security_invoker = false) AS
SELECT
  p.id,
  p.barbearia_id,
  p.nome,
  p.descricao,
  p.imagem_url,
  p.preco,
  p.ordem
FROM produto p
JOIN barbearia b ON b.id = p.barbearia_id
WHERE p.status = 'ativo' AND b.listada_no_catalogo = true;

COMMENT ON VIEW produto_publico IS
  'Vitrine legivel sem autenticacao. O WHERE e o recorte de colunas sao a unica protecao: roda com security_invoker=false e NAO aplica a RLS de produto.';

REVOKE ALL ON produto_publico FROM PUBLIC;
REVOKE ALL ON produto_publico FROM anon, authenticated;
GRANT SELECT ON produto_publico TO anon, authenticated;
