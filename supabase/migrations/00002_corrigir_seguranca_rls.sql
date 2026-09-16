-- Fix search_path on existing SECURITY DEFINER functions
CREATE OR REPLACE FUNCTION is_admin_supremo()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM usuario_perfil
        WHERE id = auth.uid() AND tipo = 'admin_supremo'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE;

CREATE OR REPLACE FUNCTION get_barbearia_do_usuario()
RETURNS UUID AS $$
DECLARE
    v_barbearia_id UUID;
BEGIN
    SELECT barbearia_id INTO v_barbearia_id FROM usuario_perfil WHERE id = auth.uid();
    RETURN v_barbearia_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE;

-- Secure barbearia insertion
DROP POLICY IF EXISTS "Permitir insercao de barbearia no cadastro" ON barbearia;

CREATE POLICY "Barbearia criada por usuario autenticado"
  ON barbearia FOR INSERT TO authenticated
  WITH CHECK (true);

-- Restrict profile creation
DROP POLICY IF EXISTS "Permitir insercao do proprio perfil no cadastro" ON usuario_perfil;

CREATE POLICY "Insercao do proprio perfil no cadastro"
  ON usuario_perfil FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() AND tipo <> 'admin_supremo');

-- Add TO authenticated to all other existing policies to prevent anon access
ALTER POLICY "Barbearia visible to owner or admin" ON barbearia TO authenticated;
DROP POLICY IF EXISTS "Perfil visible to self, admin, or same barbearia" ON usuario_perfil;

CREATE POLICY "Perfil visible to self, admin, or same barbearia"
  ON usuario_perfil FOR SELECT TO authenticated
  USING (
    id = auth.uid() 
    OR is_admin_supremo() 
    OR (barbearia_id IS NOT NULL AND barbearia_id = get_barbearia_do_usuario())
  );

CREATE POLICY "Atualizacao do proprio perfil"
  ON usuario_perfil FOR UPDATE TO authenticated
  USING (id = auth.uid() OR is_admin_supremo())
  WITH CHECK (is_admin_supremo() OR tipo <> 'admin_supremo'::tipo_usuario);
ALTER POLICY "Cliente isolated by barbearia" ON cliente TO authenticated;
ALTER POLICY "Profissional isolated by barbearia" ON profissional TO authenticated;
ALTER POLICY "Servico isolated by barbearia" ON servico TO authenticated;
ALTER POLICY "Agendamento isolated by barbearia" ON agendamento TO authenticated;
ALTER POLICY "Agendamento_servico isolated by barbearia" ON agendamento_servico TO authenticated;
ALTER POLICY "Financeiro isolated by barbearia" ON lancamento_financeiro TO authenticated;
ALTER POLICY "Configuracao isolated by barbearia" ON configuracao_barbearia TO authenticated;
