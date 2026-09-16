ALTER TABLE agendamento
  ADD COLUMN IF NOT EXISTS data_hora_fim TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS observacoes TEXT,
  ADD COLUMN IF NOT EXISTS cancelado_por VARCHAR(20)
    CHECK (cancelado_por IN ('cliente','owner','profissional')),
  ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ DEFAULT NOW();

-- Populating data_hora_fim for existing records based on sum of servico.duracao_minutos
UPDATE agendamento a
SET data_hora_fim = data_hora + (
  SELECT (COALESCE(SUM(s.duracao_minutos), 0) || ' minutes')::interval
  FROM agendamento_servico asrv
  JOIN servico s ON s.id = asrv.servico_id
  WHERE asrv.agendamento_id = a.id
);

-- Denormalização: Custo é manter coluna coerente, benefício é viabilizar constraint de exclusão no banco e eliminar joins para checagem de horários
ALTER TABLE agendamento ALTER COLUMN data_hora_fim SET NOT NULL;
ALTER TABLE agendamento ADD CHECK (data_hora_fim > data_hora);

-- Alter Type safely inside a transaction for Supabase resets
ALTER TABLE agendamento ALTER COLUMN status DROP DEFAULT;
ALTER TYPE status_agendamento RENAME TO status_agendamento_old;
CREATE TYPE status_agendamento AS ENUM (
  'pendente', 'confirmado', 'em_atendimento', 'concluido', 'cancelado', 'faltou'
);
ALTER TABLE agendamento
  ALTER COLUMN status TYPE status_agendamento
  USING status::text::status_agendamento;
ALTER TABLE agendamento ALTER COLUMN status SET DEFAULT 'pendente';
DROP TYPE status_agendamento_old;

CREATE TABLE horario_trabalho (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbearia_id UUID NOT NULL REFERENCES barbearia(id) ON DELETE CASCADE,
  profissional_id UUID REFERENCES profissional(id) ON DELETE CASCADE,
  dia_semana SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  CHECK (hora_fim > hora_inicio)
);

CREATE TABLE bloqueio (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbearia_id UUID NOT NULL REFERENCES barbearia(id) ON DELETE CASCADE,
  profissional_id UUID REFERENCES profissional(id) ON DELETE CASCADE,
  data_hora_inicio TIMESTAMPTZ NOT NULL,
  data_hora_fim TIMESTAMPTZ NOT NULL,
  motivo VARCHAR(255),
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  CHECK (data_hora_fim > data_hora_inicio)
);

ALTER TABLE horario_trabalho ENABLE ROW LEVEL SECURITY;
ALTER TABLE bloqueio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Horario de trabalho isolated by barbearia" ON horario_trabalho FOR ALL TO authenticated USING (barbearia_id = get_barbearia_do_usuario() OR is_admin_supremo());
CREATE POLICY "Bloqueio isolated by barbearia" ON bloqueio FOR ALL TO authenticated USING (barbearia_id = get_barbearia_do_usuario() OR is_admin_supremo());
