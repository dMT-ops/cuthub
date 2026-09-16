ALTER TABLE profissional
  ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES usuario_perfil(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS telefone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS especialidade VARCHAR(255),
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS comissao_percentual DECIMAL(5,2) NOT NULL DEFAULT 50.00
    CHECK (comissao_percentual BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE cliente
  ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES usuario_perfil(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS data_nascimento DATE,
  ADD COLUMN IF NOT EXISTS observacoes TEXT,
  ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ DEFAULT NOW();

CREATE TYPE status_registro AS ENUM ('ativo', 'inativo');

ALTER TABLE cliente ALTER COLUMN status DROP DEFAULT;
ALTER TABLE cliente ALTER COLUMN status TYPE status_registro USING (COALESCE(NULLIF(status, ''), 'ativo'))::status_registro;
ALTER TABLE cliente ALTER COLUMN status SET DEFAULT 'ativo';

ALTER TABLE profissional ALTER COLUMN status DROP DEFAULT;
ALTER TABLE profissional ALTER COLUMN status TYPE status_registro USING (COALESCE(NULLIF(status, ''), 'ativo'))::status_registro;
ALTER TABLE profissional ALTER COLUMN status SET DEFAULT 'ativo';

ALTER TABLE servico ALTER COLUMN status DROP DEFAULT;
ALTER TABLE servico ALTER COLUMN status TYPE status_registro USING (COALESCE(NULLIF(status, ''), 'ativo'))::status_registro;
ALTER TABLE servico ALTER COLUMN status SET DEFAULT 'ativo';
