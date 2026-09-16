CREATE TYPE forma_pagamento AS ENUM ('dinheiro','pix','credito','debito','outro');
CREATE TYPE categoria_lancamento AS ENUM
  ('atendimento','venda_produto','aluguel','insumos','salario','comissao','outro');

ALTER TABLE lancamento_financeiro
  ADD COLUMN IF NOT EXISTS forma_pagamento forma_pagamento,
  ADD COLUMN IF NOT EXISTS categoria categoria_lancamento NOT NULL DEFAULT 'outro',
  ADD COLUMN IF NOT EXISTS profissional_id UUID REFERENCES profissional(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS criado_por UUID REFERENCES usuario_perfil(id) ON DELETE SET NULL;

ALTER TABLE lancamento_financeiro
  ADD CONSTRAINT lancamento_valor_positivo CHECK (valor > 0);
