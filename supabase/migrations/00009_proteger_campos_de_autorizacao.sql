-- Migration 00009_proteger_campos_de_autorizacao.sql

CREATE OR REPLACE FUNCTION proteger_campos_de_autorizacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- admin_supremo pode tudo
  IF is_admin_supremo() THEN
    RETURN NEW;
  END IF;

  -- Permite bypass se a variável transacional estiver setada (pela funcão de criação)
  IF current_setting('app.vinculo_autorizado', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF NEW.tipo IS DISTINCT FROM OLD.tipo THEN
    RAISE EXCEPTION 'Alteracao do tipo de usuario nao permitida';
  END IF;

  IF NEW.barbearia_id IS DISTINCT FROM OLD.barbearia_id THEN
    RAISE EXCEPTION 'Alteracao do vinculo de barbearia nao permitida';
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER ao_atualizar_perfil_proteger_autorizacao
  BEFORE UPDATE ON usuario_perfil
  FOR EACH ROW
  EXECUTE FUNCTION proteger_campos_de_autorizacao();

CREATE OR REPLACE FUNCTION criar_barbearia_e_vincular(p_nome VARCHAR)
RETURNS UUID
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

  INSERT INTO barbearia (nome) VALUES (p_nome) RETURNING id INTO v_barbearia_id;

  -- Desabilita a restrição do trigger localmente nesta transação
  PERFORM set_config('app.vinculo_autorizado', 'on', true);

  UPDATE usuario_perfil
  SET barbearia_id = v_barbearia_id, tipo = 'owner'
  WHERE id = auth.uid();

  INSERT INTO configuracao_barbearia (barbearia_id) VALUES (v_barbearia_id);

  RETURN v_barbearia_id;
END $$;

REVOKE EXECUTE ON FUNCTION criar_barbearia_e_vincular(VARCHAR) FROM anon, public;
GRANT  EXECUTE ON FUNCTION criar_barbearia_e_vincular(VARCHAR) TO authenticated;

-- Ajustar a policy de INSERT em barbearia para não permitir criação direta
DROP POLICY IF EXISTS "Barbearia criada por usuario autenticado" ON barbearia;
