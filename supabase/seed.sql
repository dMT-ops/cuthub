-- Inserir o admin supremo no auth.users
-- ATENÇÃO: a senha do supabase auth.users usa bcrypt criptografado na coluna encrypted_password, 
-- mas para o seed local do Supabase, podemos usar funções internas ou inserir um hash pré-gerado.
-- Um hash comum para a senha 'admin123' gerado via bcrypt costuma ser: 
-- $2a$10$xyz... 
-- Para facilitar o seed de desenvolvimento, a abordagem recomendada pelo Supabase 
-- é inserir um usuário com senha confirmada.

INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'authenticated',
    'authenticated',
    'admin@cuthub.com',
    crypt('admin123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    '',
    '',
    '',
    ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
    id,
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
) VALUES (
    uuid_generate_v4(),
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    format('{"sub":"%s","email":"%s"}', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'admin@cuthub.com')::jsonb,
    'email',
    now(),
    now(),
    now()
) ON CONFLICT DO NOTHING;

-- Inserir perfil
INSERT INTO public.usuario_perfil (
    id,
    tipo,
    nome
) VALUES (
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'admin_supremo',
    'Administrador Supremo'
) ON CONFLICT (id) DO NOTHING;

-- MOCK DATA PARA AGENDA E DASHBOARD

-- 1. Inserir Barbearia Base
INSERT INTO public.barbearia (id, nome)
VALUES ('b1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'CutHub HQ')
ON CONFLICT (id) DO NOTHING;

-- Atualizar perfil admin para pertencer à barbearia base
UPDATE public.usuario_perfil 
SET barbearia_id = 'b1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d'
WHERE id = 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';

-- 2. Inserir Profissionais
INSERT INTO public.profissional (id, barbearia_id, nome)
VALUES 
('11111111-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'b1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'João Barber'),
('22222222-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'b1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Marcos Fade'),
('33333333-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'b1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Thiago Tesoura')
ON CONFLICT (id) DO NOTHING;

-- 3. Inserir Serviços
INSERT INTO public.servico (id, barbearia_id, nome, duracao_minutos, preco)
VALUES 
('1a1a1a1a-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'b1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Corte Degradê', 45, 45.00),
('2a2a2a2a-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'b1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Barboterapia', 30, 35.00),
('3a3a3a3a-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'b1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Corte + Barba', 75, 70.00)
ON CONFLICT (id) DO NOTHING;

-- 4. Inserir Clientes
INSERT INTO public.cliente (id, barbearia_id, nome, telefone)
VALUES 
('c1c1c1c1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'b1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Carlos Augusto', '11999999991'),
('c2c2c2c2-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'b1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Felipe Santos', '11999999992'),
('c3c3c3c3-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'b1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Bruno Henrique', '11999999993'),
('c4c4c4c4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'b1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cliente Avulso (Espera)', '11999999994')
ON CONFLICT (id) DO NOTHING;

-- 5. Inserir Agendamentos (Hoje)
INSERT INTO public.agendamento (id, barbearia_id, cliente_id, profissional_id, data_hora, status)
VALUES 
('a1a1a1a1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'b1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'c1c1c1c1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', '11111111-e5f6-7a8b-9c0d-1e2f3a4b5c6d', CURRENT_DATE + TIME '10:00:00', 'confirmado'),
('a2a2a2a2-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'b1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'c2c2c2c2-e5f6-7a8b-9c0d-1e2f3a4b5c6d', '22222222-e5f6-7a8b-9c0d-1e2f3a4b5c6d', CURRENT_DATE + TIME '11:30:00', 'pendente'),
('a3a3a3a3-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'b1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'c3c3c3c3-e5f6-7a8b-9c0d-1e2f3a4b5c6d', '33333333-e5f6-7a8b-9c0d-1e2f3a4b5c6d', CURRENT_DATE + TIME '14:00:00', 'concluido'),
('a4a4a4a4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'b1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'c4c4c4c4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', '11111111-e5f6-7a8b-9c0d-1e2f3a4b5c6d', CURRENT_DATE + TIME '15:00:00', 'cancelado')
ON CONFLICT (id) DO NOTHING;

-- 6. Associar Agendamentos com Serviços
INSERT INTO public.agendamento_servico (agendamento_id, servico_id, preco_cobrado)
VALUES 
('a1a1a1a1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', '1a1a1a1a-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 45.00),
('a2a2a2a2-e5f6-7a8b-9c0d-1e2f3a4b5c6d', '3a3a3a3a-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 70.00),
('a3a3a3a3-e5f6-7a8b-9c0d-1e2f3a4b5c6d', '2a2a2a2a-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 35.00),
('a4a4a4a4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', '1a1a1a1a-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 45.00)
ON CONFLICT (agendamento_id, servico_id) DO NOTHING;
