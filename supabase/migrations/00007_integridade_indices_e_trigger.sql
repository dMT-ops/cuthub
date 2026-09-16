CREATE OR REPLACE FUNCTION criar_perfil_para_novo_usuario()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO usuario_perfil (id, nome, tipo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email, 'Usuário'),
    COALESCE(
      NULLIF((NEW.raw_user_meta_data->>'tipo')::text, 'admin_supremo'), 
      'cliente'
    )::tipo_usuario
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER ao_criar_usuario
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION criar_perfil_para_novo_usuario();

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE agendamento
  ADD CONSTRAINT agendamento_sem_sobreposicao
  EXCLUDE USING gist (
    profissional_id WITH =,
    tstzrange(data_hora, data_hora_fim) WITH &&
  ) WHERE (status NOT IN ('cancelado','faltou'));

CREATE INDEX IF NOT EXISTS idx_agendamento_barbearia_data ON agendamento (barbearia_id, data_hora);
CREATE INDEX IF NOT EXISTS idx_agendamento_profissional_data ON agendamento (profissional_id, data_hora);
CREATE INDEX IF NOT EXISTS idx_agendamento_cliente ON agendamento (cliente_id);
CREATE INDEX IF NOT EXISTS idx_cliente_barbearia_nome ON cliente (barbearia_id, nome);
CREATE INDEX IF NOT EXISTS idx_profissional_barbearia ON profissional (barbearia_id);
CREATE INDEX IF NOT EXISTS idx_servico_barbearia_categoria ON servico (barbearia_id, categoria);
CREATE INDEX IF NOT EXISTS idx_lancamento_barbearia_data ON lancamento_financeiro (barbearia_id, data_lancamento DESC);
CREATE INDEX IF NOT EXISTS idx_agendamento_servico_servico ON agendamento_servico (servico_id);
CREATE INDEX IF NOT EXISTS idx_horario_profissional_dia ON horario_trabalho (profissional_id, dia_semana);
CREATE INDEX IF NOT EXISTS idx_bloqueio_profissional ON bloqueio (profissional_id, data_hora_inicio);

CREATE OR REPLACE FUNCTION update_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trg_atualizado_em_profissional BEFORE UPDATE ON profissional FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();
CREATE TRIGGER trg_atualizado_em_cliente BEFORE UPDATE ON cliente FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();
CREATE TRIGGER trg_atualizado_em_servico BEFORE UPDATE ON servico FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();
CREATE TRIGGER trg_atualizado_em_agendamento BEFORE UPDATE ON agendamento FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();
CREATE TRIGGER trg_atualizado_em_configuracao_barbearia BEFORE UPDATE ON configuracao_barbearia FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();
