-- Teste 2: Owner A tenta enviar, substituir e remover imagem na própria pasta
SET ROLE authenticated;
SET request.jwt.claims TO '{"sub":"01010101-e5f6-7a8b-9c0d-1e2f3a4b5c6d"}';

-- Remover se existir (cleanup)
DELETE FROM storage.objects WHERE bucket_id = 'servicos' AND name = 'b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d/teste-a.jpg';

-- Upload (INSERT)
INSERT INTO storage.objects (bucket_id, name, owner, owner_id)
VALUES ('servicos', 'b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d/teste-a.jpg', '01010101-e5f6-7a8b-9c0d-1e2f3a4b5c6d', '01010101-e5f6-7a8b-9c0d-1e2f3a4b5c6d');

-- Update (UPDATE)
UPDATE storage.objects SET metadata = '{"size": 100}'::jsonb WHERE bucket_id = 'servicos' AND name = 'b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d/teste-a.jpg';

-- Remover (DELETE)
DELETE FROM storage.objects WHERE bucket_id = 'servicos' AND name = 'b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d/teste-a.jpg';

-- Teste 3: Owner A tentar remover/enviar arquivo da pasta da Barbearia B (b2b2b2b2-...)
-- Upload na pasta B como A (deve falhar)
INSERT INTO storage.objects (bucket_id, name, owner, owner_id)
VALUES ('servicos', 'b2b2b2b2-e5f6-7a8b-9c0d-1e2f3a4b5c6d/teste-a.jpg', '01010101-e5f6-7a8b-9c0d-1e2f3a4b5c6d', '01010101-e5f6-7a8b-9c0d-1e2f3a4b5c6d');

-- Vamos criar um arquivo de verdade como B
SET request.jwt.claims TO '{"sub":"02020202-e5f6-7a8b-9c0d-1e2f3a4b5c6d"}';
INSERT INTO storage.objects (bucket_id, name, owner, owner_id)
VALUES ('servicos', 'b2b2b2b2-e5f6-7a8b-9c0d-1e2f3a4b5c6d/teste-b.jpg', '02020202-e5f6-7a8b-9c0d-1e2f3a4b5c6d', '02020202-e5f6-7a8b-9c0d-1e2f3a4b5c6d');

-- Agora tentar remover como A (deve falhar e retornar 0 rows afetadas)
SET request.jwt.claims TO '{"sub":"01010101-e5f6-7a8b-9c0d-1e2f3a4b5c6d"}';
DELETE FROM storage.objects WHERE bucket_id = 'servicos' AND name = 'b2b2b2b2-e5f6-7a8b-9c0d-1e2f3a4b5c6d/teste-b.jpg';

-- Teste 4: Como anon, tentar enviar arquivo
SET ROLE anon;
SET request.jwt.claims TO '{}';
INSERT INTO storage.objects (bucket_id, name, owner, owner_id)
VALUES ('servicos', 'b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d/teste-anon.jpg', null, null);
