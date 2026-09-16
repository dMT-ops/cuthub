-- =============================================================================
-- SEED DE DESENVOLVIMENTO — AUTENTICAÇÃO DAS CONTAS DE TESTE
-- =============================================================================
-- Este arquivo roda APENAS no ambiente local (`supabase start` e
-- `supabase db reset`). Ele nunca é aplicado por `supabase db push` nem em
-- nenhum ambiente remoto — é exatamente por isso que a senha de
-- desenvolvimento mora aqui, e não em uma migration.
--
-- POR QUE ELE EXISTE
-- A migration 00008_seed_desenvolvimento.sql cria as contas em `auth.users`
-- informando apenas `id` e `email`. Isso é suficiente para as foreign keys de
-- `usuario_perfil`, mas não para o GoTrue: sem senha, sem `instance_id`, sem
-- `aud`/`role`, sem registro em `auth.identities` e com as colunas de token em
-- NULL, qualquer tentativa de login falha com:
--
--     "Database error querying schema"
--
-- (o GoTrue lê essas colunas como string e não aceita NULL). O resultado é um
-- banco cheio de dados de demonstração em que ninguém consegue entrar.
--
-- Este script completa essas contas. É idempotente: pode rodar quantas vezes
-- for necessário.
--
-- CREDENCIAIS RESULTANTES (somente local):
--     admin@cuthub.com   / senha123   → admin_supremo
--     ownera@cuthub.com  / senha123   → owner da "CutHub Barbearia"
--     ownerb@cuthub.com  / senha123   → owner da "Barbearia Concorrente"
--
-- As duas contas de owner existem para testar o isolamento por RLS: cada uma
-- enxerga apenas a própria barbearia.
-- =============================================================================

-- 1. Completa os campos que o GoTrue exige para autenticar
UPDATE auth.users SET
  instance_id                 = '00000000-0000-0000-0000-000000000000',
  aud                         = 'authenticated',
  role                        = 'authenticated',
  encrypted_password          = extensions.crypt('senha123', extensions.gen_salt('bf')),
  email_confirmed_at          = COALESCE(email_confirmed_at, NOW()),
  created_at                  = COALESCE(created_at, NOW()),
  updated_at                  = NOW(),
  raw_app_meta_data           = COALESCE(raw_app_meta_data, '{"provider":"email","providers":["email"]}'::jsonb),
  raw_user_meta_data          = COALESCE(raw_user_meta_data, '{}'::jsonb),
  -- Colunas de texto que o GoTrue desserializa como string: NULL quebra o login
  confirmation_token          = COALESCE(confirmation_token, ''),
  recovery_token              = COALESCE(recovery_token, ''),
  email_change                = COALESCE(email_change, ''),
  email_change_token_new      = COALESCE(email_change_token_new, ''),
  email_change_token_current  = COALESCE(email_change_token_current, ''),
  phone_change                = COALESCE(phone_change, ''),
  phone_change_token          = COALESCE(phone_change_token, ''),
  reauthentication_token      = COALESCE(reauthentication_token, ''),
  email_change_confirm_status = COALESCE(email_change_confirm_status, 0),
  is_super_admin              = COALESCE(is_super_admin, false),
  is_sso_user                 = COALESCE(is_sso_user, false),
  is_anonymous                = COALESCE(is_anonymous, false)
WHERE email LIKE '%@cuthub.com';

-- 2. Cria a identidade de e-mail, que o GoTrue consulta no login por senha
INSERT INTO auth.identities (
  id, provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  u.id::text,
  u.id,
  jsonb_build_object(
    'sub', u.id::text,
    'email', u.email,
    'email_verified', true,
    'phone_verified', false
  ),
  'email',
  NOW(), NOW(), NOW()
FROM auth.users u
WHERE u.email LIKE '%@cuthub.com'
  AND NOT EXISTS (
    SELECT 1 FROM auth.identities i
    WHERE i.user_id = u.id AND i.provider = 'email'
  );

-- 3. Confirmação visível na saída do `supabase db reset`
SELECT
  u.email                                        AS conta,
  p.tipo                                         AS perfil,
  (u.encrypted_password IS NOT NULL)             AS tem_senha,
  (i.user_id IS NOT NULL)                        AS tem_identidade,
  'senha123'                                     AS senha_local
FROM auth.users u
LEFT JOIN usuario_perfil p ON p.id = u.id
LEFT JOIN auth.identities i ON i.user_id = u.id AND i.provider = 'email'
WHERE u.email LIKE '%@cuthub.com'
ORDER BY u.email;
