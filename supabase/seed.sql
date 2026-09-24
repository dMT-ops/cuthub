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
--     admin@cuthub.com     / senha123   → admin_supremo
--     ownera@cuthub.com    / senha123   → owner da "Cuthub barbearia"
--     ownerb@cuthub.com    / senha123   → owner da "Barbearia Concorrente"
--     barbeiro@cuthub.com  / senha123   → profissional "João C." da b1b1b1b1
--     cliente@cuthub.com   / senha123   → cliente "Cliente A 1"
--
-- As duas contas de owner existem para testar o isolamento por RLS: cada uma
-- enxerga apenas a própria barbearia.
--
-- POR QUE BARBEIRO E CLIENTE ENTRARAM (24/09)
-- Até aqui o seed só cobria admin e os dois owners, e a consequência apareceu
-- em toda fase: **nenhuma tela de profissional ou de cliente jamais foi
-- inspecionada**, porque não havia como entrar como um. As contas que existiam
-- nesses papéis (`vitor@`, `medina@`) nasceram pelo app durante o uso, não pela
-- `00008` — logo não sobrevivem a um `db reset` e têm senha que ninguém sabe.
-- Um seed que não cobre todos os papéis é um seed que esconde metade do
-- produto.
-- =============================================================================

-- 0. As contas que a 00008 NÃO cria: um profissional e um cliente.
--
-- Elas se ancoram em registros que a 00008 já cria, em vez de inventar gente
-- nova: o profissional "João C." e o "Cliente A 1", os dois da b1b1b1b1. Assim
-- o barbeiro entra numa agenda que já tem serviço, horário e movimento, e o
-- cliente entra com histórico — que é o que torna a tela digna de inspeção.
--
-- O `tipo` vai em `raw_user_meta_data` porque o trigger `ao_criar_usuario` lê
-- dali para montar o `usuario_perfil`. O UPDATE logo abaixo existe mesmo assim:
-- o trigger não sabe de `barbearia_id`, e o `ON CONFLICT DO NOTHING` dele
-- deixaria um perfil antigo intacto.
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('03030303-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'barbeiro@cuthub.com',
   '{"nome":"João C.","tipo":"profissional"}'::jsonb),
  ('04040404-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'cliente@cuthub.com',
   '{"nome":"Cliente A 1","tipo":"cliente"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- O perfil do profissional pertence à barbearia; o do cliente NÃO pertence a
-- nenhuma, de propósito — é assim que ele pode receber acesso depois pelo
-- "Conceder acesso" das Configurações, que recusa quem já pertence a alguma.
--
-- `app.vinculo_autorizado` é obrigatório aqui, e NÃO é um contorno.
-- O trigger `proteger_campos_de_autorizacao` recusa qualquer mudança de
-- `tipo`, `barbearia_id` ou `status` em perfil existente — é ele que impede um
-- usuário de se promover ou de se mudar de barbearia pela policy do próprio
-- perfil. A chave de sessão é a válvula que o próprio trigger oferece, e é o
-- mesmo caminho que os fluxos legítimos do app usam para vincular alguém.
-- Precisa dela porque o trigger `ao_criar_usuario` já criou o perfil (sem
-- barbearia) no INSERT acima, então isto aqui cai no ramo de UPDATE.
SET app.vinculo_autorizado = 'on';

INSERT INTO usuario_perfil (id, nome, tipo, barbearia_id) VALUES
  ('03030303-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'João C.', 'profissional',
   'b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d'),
  ('04040404-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cliente A 1', 'cliente', NULL)
ON CONFLICT (id) DO UPDATE SET
  nome         = EXCLUDED.nome,
  tipo         = EXCLUDED.tipo,
  barbearia_id = EXCLUDED.barbearia_id;

-- Liga a conta ao registro de negócio. Sem isto o login funciona e a tela vem
-- vazia: `get_profissional_id_do_usuario()` devolve NULL e a RLS do caixa (a
-- da 00030) não reconhece ninguém.
UPDATE profissional
   SET usuario_id = '03030303-e5f6-7a8b-9c0d-1e2f3a4b5c6d'
 WHERE id = 'f1a1f1a1-e5f6-7a8b-9c0d-1e2f3a4b5c6d';

-- O cliente é localizado por nome e barbearia porque a 00008 o insere sem id
-- fixo. São dados de seed, então o par (barbearia, nome) é único na prática.
UPDATE cliente
   SET usuario_id = '04040404-e5f6-7a8b-9c0d-1e2f3a4b5c6d'
 WHERE barbearia_id = 'b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d'
   AND nome = 'Cliente A 1';

-- A válvula fecha aqui. Deixá-la aberta faria o resto do seed rodar sem a
-- proteção de vínculo, que é justamente o que ela existe para impedir.
RESET app.vinculo_autorizado;

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
-- O `vinculo` não é enfeite: conta de profissional sem linha em `profissional`
-- (ou de cliente sem linha em `cliente`) loga e mostra tela vazia, que é o
-- modo de falhar mais caro — parece bug de produto e é seed pela metade.
SELECT
  u.email                                        AS conta,
  p.tipo                                         AS perfil,
  (u.encrypted_password IS NOT NULL)             AS tem_senha,
  (i.user_id IS NOT NULL)                        AS tem_identidade,
  CASE
    WHEN p.tipo = 'profissional' THEN
      COALESCE((SELECT 'profissional: ' || f.nome FROM profissional f
                 WHERE f.usuario_id = u.id LIMIT 1), 'SEM VINCULO')
    WHEN p.tipo = 'cliente' THEN
      COALESCE((SELECT 'cliente: ' || c.nome FROM cliente c
                 WHERE c.usuario_id = u.id LIMIT 1), 'sem ficha (ok)')
    ELSE '-'
  END                                            AS vinculo,
  'senha123'                                     AS senha_local
FROM auth.users u
LEFT JOIN usuario_perfil p ON p.id = u.id
LEFT JOIN auth.identities i ON i.user_id = u.id AND i.provider = 'email'
WHERE u.email LIKE '%@cuthub.com'
ORDER BY u.email;
