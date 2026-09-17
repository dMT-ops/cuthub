-- =============================================================================
-- 00016 — CATÁLOGO DE PRODUTOS: ESTOQUE INTERNO E VITRINE PÚBLICA
-- =============================================================================
-- Decisão do Chefe (docs/_pair-engineering/log.md): a mesma entidade serve a
-- dois públicos. A barbearia controla estoque; o cliente vê um cardápio.
--
-- POR QUE A VIEW NÃO É OPCIONAL
-- Policy no Postgres é por LINHA, não por coluna. Uma policy de SELECT para o
-- papel `anon` na tabela `produto` liberaria a linha inteira — e a linha inteira
-- inclui `quantidade`. Dar o cardápio ao cliente por policy direta entregaria o
-- estoque junto. Por isso o público lê uma view curada e a tabela continua
-- fechada.
--
-- CUIDADO COM `security_invoker = false`
-- É o padrão de view desde o PG15 e é o que queremos aqui: a view roda como o
-- dono e NÃO aplica a RLS de `produto`. A consequência é que TODO o filtro
-- precisa estar dentro da view. Tirar o `WHERE status = 'ativo'` daqui vaza
-- produto inativo para a internet, e a RLS não vai impedir — ela nem é
-- consultada. Este banco é PostgreSQL 17.6.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. TABELA
-- -----------------------------------------------------------------------------
-- Espelha a `servico`, que é a entidade irmã (item de catálogo da barbearia com
-- imagem, preço, status e ordem).
CREATE TABLE IF NOT EXISTS produto (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbearia_id  UUID NOT NULL REFERENCES barbearia(id) ON DELETE CASCADE,
  nome          VARCHAR(255) NOT NULL,
  descricao     TEXT,
  imagem_url    TEXT,
  preco         NUMERIC(10,2) NOT NULL CHECK (preco >= 0),
  -- Saldo simples, com baixa manual. Movimentação com histórico ficou para uma
  -- fase própria, por decisão do Chefe: baixa automática seria o primeiro
  -- automatismo do sistema e traria junto a pergunta do estorno.
  quantidade    INTEGER NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  -- Produto que acabou se esconde, não se apaga: apagar perde o histórico e,
  -- com a vitrine pública, quebra qualquer link já compartilhado.
  status        status_registro DEFAULT 'ativo',
  ordem         INTEGER NOT NULL DEFAULT 0,
  criado_em     TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

COMMENT ON COLUMN produto.quantidade IS
  'Saldo de estoque. NUNCA deve aparecer em view publica -- e o campo que separa o interno do cardapio.';

CREATE INDEX IF NOT EXISTS idx_produto_barbearia_status
  ON produto (barbearia_id, status, ordem);

DROP TRIGGER IF EXISTS trg_atualizado_em_produto ON produto;
CREATE TRIGGER trg_atualizado_em_produto
  BEFORE UPDATE ON produto
  FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();


-- -----------------------------------------------------------------------------
-- 2. RLS DA TABELA — fechada, no padrão da barbearia
-- -----------------------------------------------------------------------------
-- Ligar a RLS aqui não é formalidade. O papel `anon` do Supabase já tem GRANT
-- SELECT em todas as tabelas do schema por padrão (verificado:
-- has_table_privilege('anon','servico','SELECT') = true). É a RLS, e só ela, que
-- mantém o banco invisível para quem não está autenticado. Uma tabela criada sem
-- RLS neste projeto nasce pública.
ALTER TABLE produto ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Produto isolated by barbearia" ON produto;
CREATE POLICY "Produto isolated by barbearia"
ON produto FOR ALL TO authenticated
USING (barbearia_id = get_barbearia_do_usuario() OR is_admin_supremo());


-- -----------------------------------------------------------------------------
-- 3. VITRINE PÚBLICA
-- -----------------------------------------------------------------------------
-- Colunas escolhidas uma a uma. `quantidade`, `status`, `criado_em` e
-- `atualizado_em` ficam de fora: a primeira é estoque, as outras são ruído
-- operacional que não ajuda o cliente e conta sobre a operação da barbearia.
DROP VIEW IF EXISTS produto_publico;
CREATE VIEW produto_publico
WITH (security_invoker = false) AS
SELECT
  id,
  barbearia_id,
  nome,
  descricao,
  imagem_url,
  preco,
  ordem
FROM produto
WHERE status = 'ativo';

COMMENT ON VIEW produto_publico IS
  'Vitrine legivel sem autenticacao. O WHERE status e o recorte de colunas sao a unica protecao: a view roda com security_invoker=false e NAO aplica a RLS de produto.';

-- Primeira concessão ao papel `anon` no projeto. Só leitura, e só na view.
--
-- O REVOKE NÃO É DECORAÇÃO — SEM ELE A VITRINE É GRAVÁVEL PELA INTERNET.
-- O Supabase concede, por default privileges, TODOS os privilégios a `anon` e
-- `authenticated` em cada objeto novo do schema public. Verificado neste banco:
-- logo após o CREATE, `produto_publico` aparecia com
-- DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE para `anon`.
--
-- Numa TABELA isso é inofensivo, porque a RLS barra linha a linha. Numa VIEW
-- não existe RLS — e esta view é auto-atualizável (SELECT simples sobre uma
-- tabela só) e roda com `security_invoker = false`, ou seja, escreve como o
-- dono, passando por cima da RLS de `produto`.
--
-- Comprovado antes da correção: `SET ROLE anon; INSERT INTO produto_publico
-- (...)` respondia `INSERT 0 1`. Qualquer pessoa sem login criava, editava e
-- apagava produto de qualquer barbearia. Dar GRANT SELECT não remove o que o
-- default privileges já concedeu; é preciso revogar primeiro.
REVOKE ALL ON produto_publico FROM PUBLIC;
REVOKE ALL ON produto_publico FROM anon, authenticated;
GRANT SELECT ON produto_publico TO anon, authenticated;


-- -----------------------------------------------------------------------------
-- 4. BUCKET DAS IMAGENS DE PRODUTO
-- -----------------------------------------------------------------------------
-- Bucket próprio, e não o `barbearia_assets`, por causa do ciclo de vida:
-- `barbearia_assets` guarda singletons (um logo, um banner por barbearia),
-- enquanto imagem de produto é uma por linha e some quando o produto some.
-- Misturar na mesma pasta faria qualquer limpeza em massa de um lado ficar
-- perigosa para o outro. 2 MB, como o bucket de serviços — foto de catálogo,
-- não banner.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'produtos',
  'produtos',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Leitura publica de imagens de produto" ON storage.objects;
DROP POLICY IF EXISTS "Barbearia insere imagens de produto" ON storage.objects;
DROP POLICY IF EXISTS "Barbearia atualiza imagens de produto" ON storage.objects;
DROP POLICY IF EXISTS "Barbearia remove imagens de produto" ON storage.objects;

-- Leitura pública: a vitrine precisa exibir a foto para quem não está logado.
CREATE POLICY "Leitura publica de imagens de produto"
ON storage.objects FOR SELECT
USING (bucket_id = 'produtos');

-- Escrita restrita a quem pertence à barbearia dona da pasta. Mesma convenção
-- dos outros buckets: o primeiro segmento do caminho é o barbearia_id.
CREATE POLICY "Barbearia insere imagens de produto"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'produtos'
  AND ((storage.foldername(name))[1] = (get_barbearia_do_usuario())::text OR is_admin_supremo())
);

CREATE POLICY "Barbearia atualiza imagens de produto"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'produtos'
  AND ((storage.foldername(name))[1] = (get_barbearia_do_usuario())::text OR is_admin_supremo())
)
WITH CHECK (
  bucket_id = 'produtos'
  AND ((storage.foldername(name))[1] = (get_barbearia_do_usuario())::text OR is_admin_supremo())
);

CREATE POLICY "Barbearia remove imagens de produto"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'produtos'
  AND ((storage.foldername(name))[1] = (get_barbearia_do_usuario())::text OR is_admin_supremo())
);
