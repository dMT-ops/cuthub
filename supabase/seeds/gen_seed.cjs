const fs = require('fs');
const path = require('path');

const adminId = 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';
const ownerAId = '01010101-e5f6-7a8b-9c0d-1e2f3a4b5c6d';
const ownerBId = '02020202-e5f6-7a8b-9c0d-1e2f3a4b5c6d';
const barbA = 'b1b1b1b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d';
const barbB = 'b2b2b2b2-e5f6-7a8b-9c0d-1e2f3a4b5c6d';
const profA = [
  'f1a1f1a1-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  'f1a2f1a2-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  'f1a3f1a3-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  'f1a4f1a4-e5f6-7a8b-9c0d-1e2f3a4b5c6d'
];
const profB = [
  'f2b1f2b1-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  'f2b2f2b2-e5f6-7a8b-9c0d-1e2f3a4b5c6d'
];

let sql = "-- Migration 00008_seed_desenvolvimento.sql\n" +
"-- ESTA MIGRATION É GERADA AUTOMATICAMENTE.\n" +
"-- NÃO EDITE ESTE ARQUIVO DIRETAMENTE!\n" +
"-- Para alterar o seed, edite o gerador: supabase/seeds/gen_seed.js\n" +
"-- E re-gere o arquivo rodando: node supabase/seeds/gen_seed.js\n" +
"--\n" +
"-- Script 100% pure SQL gerado sem PL/pgSQL DO blocks para evitar problemas de parsing\n\n" +
"INSERT INTO auth.users (id, email) VALUES\n" +
"  ('" + adminId + "', 'admin@cuthub.com'),\n" +
"  ('" + ownerAId + "', 'ownera@cuthub.com'),\n" +
"  ('" + ownerBId + "', 'ownerb@cuthub.com')\n" +
"ON CONFLICT DO NOTHING;\n\n" +
"INSERT INTO usuario_perfil (id, nome, tipo) VALUES\n" +
"  ('" + adminId + "', 'Admin Supremo', 'admin_supremo'),\n" +
"  ('" + ownerAId + "', 'Owner CutHub', 'owner'),\n" +
"  ('" + ownerBId + "', 'Owner Concorrente', 'owner')\n" +
"ON CONFLICT (id) DO UPDATE SET tipo = EXCLUDED.tipo, nome = EXCLUDED.nome;\n\n" +
"INSERT INTO barbearia (id, nome) VALUES\n" +
"  ('" + barbA + "', 'CutHub Barbearia'),\n" +
"  ('" + barbB + "', 'Barbearia Concorrente')\n" +
"ON CONFLICT DO NOTHING;\n\n" +
"UPDATE usuario_perfil SET barbearia_id = '" + barbA + "' WHERE id = '" + ownerAId + "';\n" +
"UPDATE usuario_perfil SET barbearia_id = '" + barbB + "' WHERE id = '" + ownerBId + "';\n\n" +
"INSERT INTO configuracao_barbearia (barbearia_id, horario_abertura, horario_fechamento) VALUES\n" +
"  ('" + barbA + "', '09:00:00', '20:00:00'),\n" +
"  ('" + barbB + "', '10:00:00', '18:00:00')\n" +
"ON CONFLICT DO NOTHING;\n\n" +
"INSERT INTO profissional (id, barbearia_id, nome, especialidade, comissao_percentual) VALUES\n" +
"  ('" + profA[0] + "', '" + barbA + "', 'João C.', 'Corte Fade', 50.00),\n" +
"  ('" + profA[1] + "', '" + barbA + "', 'Marcos B.', 'Barba Terapia', 45.00),\n" +
"  ('" + profA[2] + "', '" + barbA + "', 'Lucas S.', 'Química Capilar', 60.00),\n" +
"  ('" + profA[3] + "', '" + barbA + "', 'Pedro H.', 'Corte Infantil', 50.00)\n" +
"ON CONFLICT DO NOTHING;\n\n" +
"INSERT INTO profissional (id, barbearia_id, nome, especialidade, comissao_percentual) VALUES\n" +
"  ('" + profB[0] + "', '" + barbB + "', 'Carlos', 'Geral', 40.00),\n" +
"  ('" + profB[1] + "', '" + barbB + "', 'Alberto', 'Geral', 40.00)\n" +
"ON CONFLICT DO NOTHING;\n\n" +
"INSERT INTO horario_trabalho (barbearia_id, profissional_id, dia_semana, hora_inicio, hora_fim)\n" +
"SELECT '" + barbA + "', p_id, d, '09:00:00', '20:00:00'\n" +
"FROM unnest(ARRAY['" + profA.join("','") + "']::uuid[]) AS p_id\n" +
"CROSS JOIN generate_series(1, 6) AS d;\n\n" +
"INSERT INTO bloqueio (barbearia_id, profissional_id, data_hora_inicio, data_hora_fim, motivo)\n" +
"VALUES \n" +
"  ('" + barbA + "', '" + profA[0] + "', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day 1 hour', 'Almoço'),\n" +
"  ('" + barbA + "', '" + profA[1] + "', NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days 4 hours', 'Folga parcial'),\n" +
"  ('" + barbA + "', NULL, NOW() + INTERVAL '10 days', NOW() + INTERVAL '11 days', 'Feriado Geral');\n\n" +
"INSERT INTO horario_trabalho (barbearia_id, profissional_id, dia_semana, hora_inicio, hora_fim)\n" +
"SELECT '" + barbB + "', p_id, d, '10:00:00', '18:00:00'\n" +
"FROM unnest(ARRAY['" + profB.join("','") + "']::uuid[]) AS p_id\n" +
"CROSS JOIN generate_series(1, 5) AS d;\n\n" +
"INSERT INTO servico (barbearia_id, nome, categoria, duracao_minutos, preco) VALUES\n" +
"  ('" + barbA + "', 'Corte Clássico', 'corte', 30, 45.00),\n" +
"  ('" + barbA + "', 'Corte Fade', 'corte', 45, 55.00),\n" +
"  ('" + barbA + "', 'Barba Simples', 'barba', 20, 30.00),\n" +
"  ('" + barbA + "', 'Barboterapia', 'barba', 45, 60.00),\n" +
"  ('" + barbA + "', 'Combo Corte + Barba', 'combo', 60, 85.00),\n" +
"  ('" + barbA + "', 'Platinado', 'quimica', 120, 150.00),\n" +
"  ('" + barbA + "', 'Luzes', 'quimica', 90, 120.00),\n" +
"  ('" + barbA + "', 'Corte Infantil', 'infantil', 40, 50.00),\n" +
"  ('" + barbA + "', 'Sobrancelha', 'estetica', 15, 20.00),\n" +
"  ('" + barbA + "', 'Limpeza de Pele', 'estetica', 30, 40.00);\n\n" +
"INSERT INTO servico (barbearia_id, nome, categoria, duracao_minutos, preco) VALUES\n" +
"  ('" + barbB + "', 'Corte', 'corte', 30, 40.00),\n" +
"  ('" + barbB + "', 'Barba', 'barba', 30, 35.00),\n" +
"  ('" + barbB + "', 'Combo', 'combo', 60, 70.00);\n\n";

for (let i = 1; i <= 40; i++) {
  const t = '119999900' + String(i).padStart(2, '0');
  sql += "INSERT INTO cliente (barbearia_id, nome, telefone) VALUES ('" + barbA + "', 'Cliente A " + i + "', '" + t + "');\n";
}

for (let i = 1; i <= 5; i++) {
  const t = '118888800' + String(i).padStart(2, '0');
  sql += "INSERT INTO cliente (barbearia_id, nome, telefone) VALUES ('" + barbB + "', 'Cliente B " + i + "', '" + t + "');\n";
}

sql += "\n" +
"-- AGENDAMENTOS A\n" +
"WITH \n" +
"  clientes_a AS (SELECT id, row_number() over() as rn FROM cliente WHERE barbearia_id = '" + barbA + "'),\n" +
"  profs_a AS (SELECT id, row_number() over() as rn FROM profissional WHERE barbearia_id = '" + barbA + "'),\n" +
"  servs_a AS (SELECT id, duracao_minutos, preco, row_number() over() as rn FROM servico WHERE barbearia_id = '" + barbA + "')\n" +
"INSERT INTO agendamento (barbearia_id, cliente_id, profissional_id, data_hora, data_hora_fim, status)\n" +
"SELECT \n" +
"  '" + barbA + "', \n" +
"  c.id, \n" +
"  p.id, \n" +
"  (NOW() - INTERVAL '90 days' + (g.i * INTERVAL '22 hours'))::date + TIME '09:00:00',\n" +
"  (NOW() - INTERVAL '90 days' + (g.i * INTERVAL '22 hours'))::date + TIME '09:00:00' + (s.duracao_minutos || ' minutes')::interval,\n" +
"  CASE \n" +
"    WHEN g.i IN (118, 119) THEN 'em_atendimento'::status_agendamento\n" +
"    WHEN (NOW() - INTERVAL '90 days' + (g.i * INTERVAL '22 hours'))::date + TIME '09:00:00' < NOW() THEN \n" +
"      CASE WHEN (g.i % 100) < 85 THEN 'concluido'::status_agendamento\n" +
"           WHEN (g.i % 100) < 94 THEN 'cancelado'::status_agendamento\n" +
"           ELSE 'faltou'::status_agendamento END\n" +
"    ELSE \n" +
"      CASE WHEN (g.i % 100) < 70 THEN 'confirmado'::status_agendamento\n" +
"           WHEN (g.i % 100) < 90 THEN 'pendente'::status_agendamento\n" +
"           ELSE 'cancelado'::status_agendamento END\n" +
"  END\n" +
"FROM generate_series(1, 120) g(i)\n" +
"JOIN clientes_a c ON c.rn = (g.i % 40) + 1\n" +
"JOIN profs_a p ON p.rn = (g.i % 4) + 1\n" +
"JOIN servs_a s ON s.rn = (g.i % 10) + 1;\n\n" +
"-- AGENDAMENTOS B\n" +
"WITH \n" +
"  clientes_b AS (SELECT id, row_number() over() as rn FROM cliente WHERE barbearia_id = '" + barbB + "'),\n" +
"  profs_b AS (SELECT id, row_number() over() as rn FROM profissional WHERE barbearia_id = '" + barbB + "'),\n" +
"  servs_b AS (SELECT id, duracao_minutos, preco, row_number() over() as rn FROM servico WHERE barbearia_id = '" + barbB + "')\n" +
"INSERT INTO agendamento (barbearia_id, cliente_id, profissional_id, data_hora, data_hora_fim, status)\n" +
"SELECT \n" +
"  '" + barbB + "', \n" +
"  c.id, \n" +
"  p.id, \n" +
"  (NOW() - INTERVAL '10 days' + (g.i * INTERVAL '24 hours'))::date + TIME '10:00:00',\n" +
"  (NOW() - INTERVAL '10 days' + (g.i * INTERVAL '24 hours'))::date + TIME '10:00:00' + (s.duracao_minutos || ' minutes')::interval,\n" +
"  'concluido'::status_agendamento\n" +
"FROM generate_series(1, 10) g(i)\n" +
"JOIN clientes_b c ON c.rn = (g.i % 5) + 1\n" +
"JOIN profs_b p ON p.rn = (g.i % 2) + 1\n" +
"JOIN servs_b s ON s.rn = (g.i % 3) + 1;\n\n" +
"-- IMPORTANTE: Popular agendamento_servico PRIMEIRO para poder calcular os lancamentos baseados em servicos!\n" +
"INSERT INTO agendamento_servico (agendamento_id, servico_id, preco_cobrado)\n" +
"WITH\n" +
"  servs_a AS (SELECT id, preco, row_number() over() as rn FROM servico WHERE barbearia_id = '" + barbA + "'),\n" +
"  agend_a AS (SELECT id, row_number() over() as rn FROM agendamento WHERE barbearia_id = '" + barbA + "')\n" +
"SELECT a.id, s.id, s.preco\n" +
"FROM agend_a a\n" +
"JOIN servs_a s ON s.rn = (a.rn % 10) + 1;\n\n" +
"INSERT INTO agendamento_servico (agendamento_id, servico_id, preco_cobrado)\n" +
"WITH\n" +
"  servs_b AS (SELECT id, preco, row_number() over() as rn FROM servico WHERE barbearia_id = '" + barbB + "'),\n" +
"  agend_b AS (SELECT id, row_number() over() as rn FROM agendamento WHERE barbearia_id = '" + barbB + "')\n" +
"SELECT a.id, s.id, s.preco\n" +
"FROM agend_b a\n" +
"JOIN servs_b s ON s.rn = (a.rn % 3) + 1;\n\n" +
"-- Lancamentos financeiros (Agora baseados em agendamento_servico ja populado)\n" +
"INSERT INTO lancamento_financeiro (barbearia_id, agendamento_id, profissional_id, tipo, categoria, forma_pagamento, valor)\n" +
"SELECT \n" +
"  a.barbearia_id, a.id, a.profissional_id, 'entrada', 'atendimento', 'pix', s.preco\n" +
"FROM agendamento a\n" +
"JOIN agendamento_servico ase ON ase.agendamento_id = a.id\n" +
"JOIN servico s ON s.id = ase.servico_id\n" +
"WHERE a.status = 'concluido';\n\n";

for (let i = 1; i <= 20; i++) {
  sql += "INSERT INTO lancamento_financeiro (barbearia_id, tipo, categoria, forma_pagamento, valor, data_lancamento)\n" +
         "VALUES ('" + barbA + "', 'saida', 'aluguel', 'pix', 150, NOW() - INTERVAL '" + (i * 3) + " days');\n";
}

const outputPath = path.join(__dirname, '..', 'migrations', '00008_seed_desenvolvimento.sql');
fs.writeFileSync(outputPath, sql);
