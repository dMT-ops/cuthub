-- Corrige a função get_barbearia_do_usuario para ser SECURITY DEFINER
-- Isso evita recursão infinita na policy de SELECT do usuario_perfil,
-- já que a policy chama esta função, e a função faz SELECT na mesma tabela.
CREATE OR REPLACE FUNCTION get_barbearia_do_usuario()
RETURNS UUID AS $$
DECLARE
    v_barbearia_id UUID;
BEGIN
    SELECT barbearia_id INTO v_barbearia_id FROM usuario_perfil WHERE id = auth.uid();
    RETURN v_barbearia_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
