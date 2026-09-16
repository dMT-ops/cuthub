-- Migration 00008_seed_desenvolvimento.sql
-- ESTA MIGRATION É GERADA AUTOMATICAMENTE.
-- NÃO EDITE ESTE ARQUIVO DIRETAMENTE!
-- Para alterar o seed, edite o gerador: supabase/seeds/gen_seed.js
-- E re-gere o arquivo rodando: node supabase/seeds/gen_seed.js
--
-- Script 100% pure SQL gerado sem PL/pgSQL DO blocks para evitar problemas de parsing

INSERT INTO auth.users (id, email) VALUES
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'admin@cuthub.com'),
  ('01010101-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'ownera@cuthub.com'),
  ('02020202-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'ownerb@cuthub.com')
ON CONFLICT DO NOTHING;

INSERT INTO usuario_perfil (id, nome, tipo) VALUES
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Admin Supremo', 'admin_supremo'),
  ('01010101-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Owner CutHub', 'owner'),
  ('02020202-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Owner Concorrente', 'owner')
ON CONFLICT (id) DO UPDATE SET tipo = EXCLUDED.tipo, nome = EXCLUDED.nome;

INSERT INTO barbearia (id, nome) VALUES
  ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'CutHub Barbearia'),
  ('b2b2b2b2-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Barbearia Concorrente')
ON CONFLICT DO NOTHING;

UPDATE usuario_perfil SET barbearia_id = 'b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d' WHERE id = '01010101-e5f6-7a8b-9c0d-1e2f3a4b5c6d';
UPDATE usuario_perfil SET barbearia_id = 'b2b2b2b2-e5f6-7a8b-9c0d-1e2f3a4b5c6d' WHERE id = '02020202-e5f6-7a8b-9c0d-1e2f3a4b5c6d';

INSERT INTO configuracao_barbearia (barbearia_id, horario_abertura, horario_fechamento) VALUES
  ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', '09:00:00', '20:00:00'),
  ('b2b2b2b2-e5f6-7a8b-9c0d-1e2f3a4b5c6d', '10:00:00', '18:00:00')
ON CONFLICT DO NOTHING;

INSERT INTO profissional (id, barbearia_id, nome, especialidade, comissao_percentual) VALUES
  ('f1a1f1a1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'João C.', 'Corte Fade', 50.00),
  ('f1a2f1a2-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Marcos B.', 'Barba Terapia', 45.00),
  ('f1a3f1a3-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Lucas S.', 'Química Capilar', 60.00),
  ('f1a4f1a4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Pedro H.', 'Corte Infantil', 50.00)
ON CONFLICT DO NOTHING;

INSERT INTO profissional (id, barbearia_id, nome, especialidade, comissao_percentual) VALUES
  ('f2b1f2b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'b2b2b2b2-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Carlos', 'Geral', 40.00),
  ('f2b2f2b2-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'b2b2b2b2-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Alberto', 'Geral', 40.00)
ON CONFLICT DO NOTHING;

INSERT INTO horario_trabalho (barbearia_id, profissional_id, dia_semana, hora_inicio, hora_fim)
SELECT 'b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', p_id, d, '09:00:00', '20:00:00'
FROM unnest(ARRAY['f1a1f1a1-e5f6-7a8b-9c0d-1e2f3a4b5c6d','f1a2f1a2-e5f6-7a8b-9c0d-1e2f3a4b5c6d','f1a3f1a3-e5f6-7a8b-9c0d-1e2f3a4b5c6d','f1a4f1a4-e5f6-7a8b-9c0d-1e2f3a4b5c6d']::uuid[]) AS p_id
CROSS JOIN generate_series(1, 6) AS d;

INSERT INTO bloqueio (barbearia_id, profissional_id, data_hora_inicio, data_hora_fim, motivo)
VALUES 
  ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'f1a1f1a1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day 1 hour', 'Almoço'),
  ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'f1a2f1a2-e5f6-7a8b-9c0d-1e2f3a4b5c6d', NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days 4 hours', 'Folga parcial'),
  ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', NULL, NOW() + INTERVAL '10 days', NOW() + INTERVAL '11 days', 'Feriado Geral');

INSERT INTO horario_trabalho (barbearia_id, profissional_id, dia_semana, hora_inicio, hora_fim)
SELECT 'b2b2b2b2-e5f6-7a8b-9c0d-1e2f3a4b5c6d', p_id, d, '10:00:00', '18:00:00'
FROM unnest(ARRAY['f2b1f2b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d','f2b2f2b2-e5f6-7a8b-9c0d-1e2f3a4b5c6d']::uuid[]) AS p_id
CROSS JOIN generate_series(1, 5) AS d;

INSERT INTO servico (barbearia_id, nome, categoria, duracao_minutos, preco) VALUES
  ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Corte Clássico', 'corte', 30, 45.00),
  ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Corte Fade', 'corte', 45, 55.00),
  ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Barba Simples', 'barba', 20, 30.00),
  ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Barboterapia', 'barba', 45, 60.00),
  ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Combo Corte + Barba', 'combo', 60, 85.00),
  ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Platinado', 'quimica', 120, 150.00),
  ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Luzes', 'quimica', 90, 120.00),
  ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Corte Infantil', 'infantil', 40, 50.00),
  ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Sobrancelha', 'estetica', 15, 20.00),
  ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Limpeza de Pele', 'estetica', 30, 40.00);

INSERT INTO servico (barbearia_id, nome, categoria, duracao_minutos, preco) VALUES
  ('b2b2b2b2-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Corte', 'corte', 30, 40.00),
  ('b2b2b2b2-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Barba', 'barba', 30, 35.00),
  ('b2b2b2b2-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Combo', 'combo', 60, 70.00);

INSERT INTO cliente (barbearia_id, nome, telefone) VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cliente A 1', '11999990001');
INSERT INTO cliente (barbearia_id, nome, telefone) VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cliente A 2', '11999990002');
INSERT INTO cliente (barbearia_id, nome, telefone) VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cliente A 3', '11999990003');
INSERT INTO cliente (barbearia_id, nome, telefone) VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cliente A 4', '11999990004');
INSERT INTO cliente (barbearia_id, nome, telefone) VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cliente A 5', '11999990005');
INSERT INTO cliente (barbearia_id, nome, telefone) VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cliente A 6', '11999990006');
INSERT INTO cliente (barbearia_id, nome, telefone) VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cliente A 7', '11999990007');
INSERT INTO cliente (barbearia_id, nome, telefone) VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cliente A 8', '11999990008');
INSERT INTO cliente (barbearia_id, nome, telefone) VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cliente A 9', '11999990009');
INSERT INTO cliente (barbearia_id, nome, telefone) VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cliente A 10', '11999990010');
INSERT INTO cliente (barbearia_id, nome, telefone) VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cliente A 11', '11999990011');
INSERT INTO cliente (barbearia_id, nome, telefone) VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cliente A 12', '11999990012');
INSERT INTO cliente (barbearia_id, nome, telefone) VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cliente A 13', '11999990013');
INSERT INTO cliente (barbearia_id, nome, telefone) VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cliente A 14', '11999990014');
INSERT INTO cliente (barbearia_id, nome, telefone) VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cliente A 15', '11999990015');
INSERT INTO cliente (barbearia_id, nome, telefone) VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cliente A 16', '11999990016');
INSERT INTO cliente (barbearia_id, nome, telefone) VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cliente A 17', '11999990017');
INSERT INTO cliente (barbearia_id, nome, telefone) VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cliente A 18', '11999990018');
INSERT INTO cliente (barbearia_id, nome, telefone) VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cliente A 19', '11999990019');
INSERT INTO cliente (barbearia_id, nome, telefone) VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cliente A 20', '11999990020');
INSERT INTO cliente (barbearia_id, nome, telefone) VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cliente A 21', '11999990021');
INSERT INTO cliente (barbearia_id, nome, telefone) VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cliente A 22', '11999990022');
INSERT INTO cliente (barbearia_id, nome, telefone) VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cliente A 23', '11999990023');
INSERT INTO cliente (barbearia_id, nome, telefone) VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cliente A 24', '11999990024');
INSERT INTO cliente (barbearia_id, nome, telefone) VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cliente A 25', '11999990025');
INSERT INTO cliente (barbearia_id, nome, telefone) VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cliente A 26', '11999990026');
INSERT INTO cliente (barbearia_id, nome, telefone) VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cliente A 27', '11999990027');
INSERT INTO cliente (barbearia_id, nome, telefone) VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cliente A 28', '11999990028');
INSERT INTO cliente (barbearia_id, nome, telefone) VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cliente A 29', '11999990029');
INSERT INTO cliente (barbearia_id, nome, telefone) VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cliente A 30', '11999990030');
INSERT INTO cliente (barbearia_id, nome, telefone) VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cliente A 31', '11999990031');
INSERT INTO cliente (barbearia_id, nome, telefone) VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cliente A 32', '11999990032');
INSERT INTO cliente (barbearia_id, nome, telefone) VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cliente A 33', '11999990033');
INSERT INTO cliente (barbearia_id, nome, telefone) VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cliente A 34', '11999990034');
INSERT INTO cliente (barbearia_id, nome, telefone) VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cliente A 35', '11999990035');
INSERT INTO cliente (barbearia_id, nome, telefone) VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cliente A 36', '11999990036');
INSERT INTO cliente (barbearia_id, nome, telefone) VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cliente A 37', '11999990037');
INSERT INTO cliente (barbearia_id, nome, telefone) VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cliente A 38', '11999990038');
INSERT INTO cliente (barbearia_id, nome, telefone) VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cliente A 39', '11999990039');
INSERT INTO cliente (barbearia_id, nome, telefone) VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cliente A 40', '11999990040');
INSERT INTO cliente (barbearia_id, nome, telefone) VALUES ('b2b2b2b2-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cliente B 1', '11888880001');
INSERT INTO cliente (barbearia_id, nome, telefone) VALUES ('b2b2b2b2-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cliente B 2', '11888880002');
INSERT INTO cliente (barbearia_id, nome, telefone) VALUES ('b2b2b2b2-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cliente B 3', '11888880003');
INSERT INTO cliente (barbearia_id, nome, telefone) VALUES ('b2b2b2b2-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cliente B 4', '11888880004');
INSERT INTO cliente (barbearia_id, nome, telefone) VALUES ('b2b2b2b2-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Cliente B 5', '11888880005');

-- AGENDAMENTOS A
WITH 
  clientes_a AS (SELECT id, row_number() over() as rn FROM cliente WHERE barbearia_id = 'b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d'),
  profs_a AS (SELECT id, row_number() over() as rn FROM profissional WHERE barbearia_id = 'b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d'),
  servs_a AS (SELECT id, duracao_minutos, preco, row_number() over() as rn FROM servico WHERE barbearia_id = 'b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d')
INSERT INTO agendamento (barbearia_id, cliente_id, profissional_id, data_hora, data_hora_fim, status)
SELECT 
  'b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 
  c.id, 
  p.id, 
  (NOW() - INTERVAL '90 days' + (g.i * INTERVAL '22 hours'))::date + TIME '09:00:00',
  (NOW() - INTERVAL '90 days' + (g.i * INTERVAL '22 hours'))::date + TIME '09:00:00' + (s.duracao_minutos || ' minutes')::interval,
  CASE 
    WHEN g.i IN (118, 119) THEN 'em_atendimento'::status_agendamento
    WHEN (NOW() - INTERVAL '90 days' + (g.i * INTERVAL '22 hours'))::date + TIME '09:00:00' < NOW() THEN 
      CASE WHEN (g.i % 100) < 85 THEN 'concluido'::status_agendamento
           WHEN (g.i % 100) < 94 THEN 'cancelado'::status_agendamento
           ELSE 'faltou'::status_agendamento END
    ELSE 
      CASE WHEN (g.i % 100) < 70 THEN 'confirmado'::status_agendamento
           WHEN (g.i % 100) < 90 THEN 'pendente'::status_agendamento
           ELSE 'cancelado'::status_agendamento END
  END
FROM generate_series(1, 120) g(i)
JOIN clientes_a c ON c.rn = (g.i % 40) + 1
JOIN profs_a p ON p.rn = (g.i % 4) + 1
JOIN servs_a s ON s.rn = (g.i % 10) + 1;

-- AGENDAMENTOS B
WITH 
  clientes_b AS (SELECT id, row_number() over() as rn FROM cliente WHERE barbearia_id = 'b2b2b2b2-e5f6-7a8b-9c0d-1e2f3a4b5c6d'),
  profs_b AS (SELECT id, row_number() over() as rn FROM profissional WHERE barbearia_id = 'b2b2b2b2-e5f6-7a8b-9c0d-1e2f3a4b5c6d'),
  servs_b AS (SELECT id, duracao_minutos, preco, row_number() over() as rn FROM servico WHERE barbearia_id = 'b2b2b2b2-e5f6-7a8b-9c0d-1e2f3a4b5c6d')
INSERT INTO agendamento (barbearia_id, cliente_id, profissional_id, data_hora, data_hora_fim, status)
SELECT 
  'b2b2b2b2-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 
  c.id, 
  p.id, 
  (NOW() - INTERVAL '10 days' + (g.i * INTERVAL '24 hours'))::date + TIME '10:00:00',
  (NOW() - INTERVAL '10 days' + (g.i * INTERVAL '24 hours'))::date + TIME '10:00:00' + (s.duracao_minutos || ' minutes')::interval,
  'concluido'::status_agendamento
FROM generate_series(1, 10) g(i)
JOIN clientes_b c ON c.rn = (g.i % 5) + 1
JOIN profs_b p ON p.rn = (g.i % 2) + 1
JOIN servs_b s ON s.rn = (g.i % 3) + 1;

-- IMPORTANTE: Popular agendamento_servico PRIMEIRO para poder calcular os lancamentos baseados em servicos!
INSERT INTO agendamento_servico (agendamento_id, servico_id, preco_cobrado)
WITH
  servs_a AS (SELECT id, preco, row_number() over() as rn FROM servico WHERE barbearia_id = 'b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d'),
  agend_a AS (SELECT id, row_number() over() as rn FROM agendamento WHERE barbearia_id = 'b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d')
SELECT a.id, s.id, s.preco
FROM agend_a a
JOIN servs_a s ON s.rn = (a.rn % 10) + 1;

INSERT INTO agendamento_servico (agendamento_id, servico_id, preco_cobrado)
WITH
  servs_b AS (SELECT id, preco, row_number() over() as rn FROM servico WHERE barbearia_id = 'b2b2b2b2-e5f6-7a8b-9c0d-1e2f3a4b5c6d'),
  agend_b AS (SELECT id, row_number() over() as rn FROM agendamento WHERE barbearia_id = 'b2b2b2b2-e5f6-7a8b-9c0d-1e2f3a4b5c6d')
SELECT a.id, s.id, s.preco
FROM agend_b a
JOIN servs_b s ON s.rn = (a.rn % 3) + 1;

-- Lancamentos financeiros (Agora baseados em agendamento_servico ja populado)
INSERT INTO lancamento_financeiro (barbearia_id, agendamento_id, profissional_id, tipo, categoria, forma_pagamento, valor)
SELECT 
  a.barbearia_id, a.id, a.profissional_id, 'entrada', 'atendimento', 'pix', s.preco
FROM agendamento a
JOIN agendamento_servico ase ON ase.agendamento_id = a.id
JOIN servico s ON s.id = ase.servico_id
WHERE a.status = 'concluido';

INSERT INTO lancamento_financeiro (barbearia_id, tipo, categoria, forma_pagamento, valor, data_lancamento)
VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'saida', 'aluguel', 'pix', 150, NOW() - INTERVAL '3 days');
INSERT INTO lancamento_financeiro (barbearia_id, tipo, categoria, forma_pagamento, valor, data_lancamento)
VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'saida', 'aluguel', 'pix', 150, NOW() - INTERVAL '6 days');
INSERT INTO lancamento_financeiro (barbearia_id, tipo, categoria, forma_pagamento, valor, data_lancamento)
VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'saida', 'aluguel', 'pix', 150, NOW() - INTERVAL '9 days');
INSERT INTO lancamento_financeiro (barbearia_id, tipo, categoria, forma_pagamento, valor, data_lancamento)
VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'saida', 'aluguel', 'pix', 150, NOW() - INTERVAL '12 days');
INSERT INTO lancamento_financeiro (barbearia_id, tipo, categoria, forma_pagamento, valor, data_lancamento)
VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'saida', 'aluguel', 'pix', 150, NOW() - INTERVAL '15 days');
INSERT INTO lancamento_financeiro (barbearia_id, tipo, categoria, forma_pagamento, valor, data_lancamento)
VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'saida', 'aluguel', 'pix', 150, NOW() - INTERVAL '18 days');
INSERT INTO lancamento_financeiro (barbearia_id, tipo, categoria, forma_pagamento, valor, data_lancamento)
VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'saida', 'aluguel', 'pix', 150, NOW() - INTERVAL '21 days');
INSERT INTO lancamento_financeiro (barbearia_id, tipo, categoria, forma_pagamento, valor, data_lancamento)
VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'saida', 'aluguel', 'pix', 150, NOW() - INTERVAL '24 days');
INSERT INTO lancamento_financeiro (barbearia_id, tipo, categoria, forma_pagamento, valor, data_lancamento)
VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'saida', 'aluguel', 'pix', 150, NOW() - INTERVAL '27 days');
INSERT INTO lancamento_financeiro (barbearia_id, tipo, categoria, forma_pagamento, valor, data_lancamento)
VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'saida', 'aluguel', 'pix', 150, NOW() - INTERVAL '30 days');
INSERT INTO lancamento_financeiro (barbearia_id, tipo, categoria, forma_pagamento, valor, data_lancamento)
VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'saida', 'aluguel', 'pix', 150, NOW() - INTERVAL '33 days');
INSERT INTO lancamento_financeiro (barbearia_id, tipo, categoria, forma_pagamento, valor, data_lancamento)
VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'saida', 'aluguel', 'pix', 150, NOW() - INTERVAL '36 days');
INSERT INTO lancamento_financeiro (barbearia_id, tipo, categoria, forma_pagamento, valor, data_lancamento)
VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'saida', 'aluguel', 'pix', 150, NOW() - INTERVAL '39 days');
INSERT INTO lancamento_financeiro (barbearia_id, tipo, categoria, forma_pagamento, valor, data_lancamento)
VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'saida', 'aluguel', 'pix', 150, NOW() - INTERVAL '42 days');
INSERT INTO lancamento_financeiro (barbearia_id, tipo, categoria, forma_pagamento, valor, data_lancamento)
VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'saida', 'aluguel', 'pix', 150, NOW() - INTERVAL '45 days');
INSERT INTO lancamento_financeiro (barbearia_id, tipo, categoria, forma_pagamento, valor, data_lancamento)
VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'saida', 'aluguel', 'pix', 150, NOW() - INTERVAL '48 days');
INSERT INTO lancamento_financeiro (barbearia_id, tipo, categoria, forma_pagamento, valor, data_lancamento)
VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'saida', 'aluguel', 'pix', 150, NOW() - INTERVAL '51 days');
INSERT INTO lancamento_financeiro (barbearia_id, tipo, categoria, forma_pagamento, valor, data_lancamento)
VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'saida', 'aluguel', 'pix', 150, NOW() - INTERVAL '54 days');
INSERT INTO lancamento_financeiro (barbearia_id, tipo, categoria, forma_pagamento, valor, data_lancamento)
VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'saida', 'aluguel', 'pix', 150, NOW() - INTERVAL '57 days');
INSERT INTO lancamento_financeiro (barbearia_id, tipo, categoria, forma_pagamento, valor, data_lancamento)
VALUES ('b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'saida', 'aluguel', 'pix', 150, NOW() - INTERVAL '60 days');
