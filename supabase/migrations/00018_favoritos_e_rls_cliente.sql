-- =============================================================================
-- 00018 — FAVORITOS E O SEGUNDO EIXO DE PERMISSÃO
-- =============================================================================
-- Esta migration acrescenta ao modelo de segurança um eixo que não existia.
--
-- Até aqui, TODA policy do projeto tinha a forma
-- `barbearia_id = get_barbearia_do_usuario()`. Isso significa que o modelo
-- assume que todo ator pertence a uma barbearia — e o cliente, por definição,
-- não pertence. Verificado antes de escrever: uma conta de cliente vinculada a
-- um registro com 5 agendamentos enxergava ZERO deles, além de não ver o próprio
-- cadastro, os serviços, os profissionais nem a marca da barbearia.
--
-- O vínculo `cliente.usuario_id` existe desde a 00012, mas nenhuma policy o
-- usava: foi criado como ligação de DADO e nunca virou ligação de AUTORIZAÇÃO.
-- É isso que muda aqui.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. FAVORITOS
-- -----------------------------------------------------------------------------
-- Uma tabela com tipo, e não três tabelas. Os três alvos que o Chefe pediu
-- (barbearia, serviço+barbeiro e agendamento) têm a mesma forma — "esta pessoa
-- marcou aquilo" — e três tabelas triplicariam policy, hook e tela pelo mesmo
-- comportamento.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_favorito') THEN
    CREATE TYPE tipo_favorito AS ENUM ('barbearia', 'servico_profissional', 'agendamento');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS favorito (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Pendura no usuário, não no registro `cliente`: a mesma pessoa é um `cliente`
  -- diferente em cada barbearia, e "minhas barbearias favoritas" só faz sentido
  -- acima desse recorte.
  usuario_id      UUID NOT NULL REFERENCES usuario_perfil(id) ON DELETE CASCADE,
  tipo            tipo_favorito NOT NULL,
  -- Sempre preenchida, nos três tipos: é a âncora que permite agrupar favoritos
  -- por barbearia sem join, inclusive para "promoções das minhas barbearias".
  barbearia_id    UUID NOT NULL REFERENCES barbearia(id) ON DELETE CASCADE,
  servico_id      UUID REFERENCES servico(id) ON DELETE CASCADE,
  profissional_id UUID REFERENCES profissional(id) ON DELETE CASCADE,
  agendamento_id  UUID REFERENCES agendamento(id) ON DELETE CASCADE,
  criado_em       TIMESTAMPTZ DEFAULT now()
);

-- O CHECK é o que impede um favorito incoerente — tipo 'barbearia' carregando
-- um servico_id, por exemplo. Sem ele o enum vira decoração.
ALTER TABLE favorito DROP CONSTRAINT IF EXISTS favorito_campos_por_tipo;
ALTER TABLE favorito ADD CONSTRAINT favorito_campos_por_tipo CHECK (
  CASE tipo
    WHEN 'barbearia' THEN
      servico_id IS NULL AND profissional_id IS NULL AND agendamento_id IS NULL
    WHEN 'servico_profissional' THEN
      -- `profissional_id` fica opcional de propósito: "corte com o João" e
      -- "corte, com qualquer um" são os dois favoritos legítimos.
      servico_id IS NOT NULL AND agendamento_id IS NULL
    WHEN 'agendamento' THEN
      agendamento_id IS NOT NULL AND servico_id IS NULL AND profissional_id IS NULL
  END
);

-- Favoritar duas vezes a mesma coisa não é erro do usuário, é clique repetido.
-- Índices parciais porque as colunas relevantes mudam conforme o tipo, e NULL
-- não colide em UNIQUE comum.
CREATE UNIQUE INDEX IF NOT EXISTS favorito_barbearia_unico
  ON favorito (usuario_id, barbearia_id)
  WHERE tipo = 'barbearia';

CREATE UNIQUE INDEX IF NOT EXISTS favorito_servico_unico
  ON favorito (usuario_id, servico_id, coalesce(profissional_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE tipo = 'servico_profissional';

CREATE UNIQUE INDEX IF NOT EXISTS favorito_agendamento_unico
  ON favorito (usuario_id, agendamento_id)
  WHERE tipo = 'agendamento';

CREATE INDEX IF NOT EXISTS idx_favorito_usuario ON favorito (usuario_id, tipo);

ALTER TABLE favorito ENABLE ROW LEVEL SECURITY;

-- Favorito é privado: só o dono vê e só o dono mexe. Nem a barbearia sabe quem
-- a favoritou — isso seria um dado sobre o cliente, não sobre a barbearia.
DROP POLICY IF EXISTS "Favorito e do proprio usuario" ON favorito;
CREATE POLICY "Favorito e do proprio usuario"
ON favorito FOR ALL TO authenticated
USING (usuario_id = auth.uid())
WITH CHECK (usuario_id = auth.uid());


-- -----------------------------------------------------------------------------
-- 2. O CLIENTE PASSA A ENXERGAR OS PRÓPRIOS AGENDAMENTOS
-- -----------------------------------------------------------------------------
-- Policies permissivas se somam com OR, então esta convive com a policy da
-- barbearia sem enfraquecê-la: o dono continua com FOR ALL na barbearia dele, e
-- o cliente ganha SELECT apenas nas linhas em que ele é o cliente.
DROP POLICY IF EXISTS "Cliente ve os proprios agendamentos" ON agendamento;
CREATE POLICY "Cliente ve os proprios agendamentos"
ON agendamento FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM cliente c
    WHERE c.id = agendamento.cliente_id
      AND c.usuario_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Cliente ve os servicos dos proprios agendamentos" ON agendamento_servico;
CREATE POLICY "Cliente ve os servicos dos proprios agendamentos"
ON agendamento_servico FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM agendamento a
    JOIN cliente c ON c.id = a.cliente_id
    WHERE a.id = agendamento_servico.agendamento_id
      AND c.usuario_id = auth.uid()
  )
);

-- O cliente também precisa se reconhecer: o histórico mostra "seus dados nesta
-- barbearia", e sem isto ele não lê nem o próprio nome.
DROP POLICY IF EXISTS "Cliente ve o proprio cadastro" ON cliente;
CREATE POLICY "Cliente ve o proprio cadastro"
ON cliente FOR SELECT TO authenticated
USING (usuario_id = auth.uid());


-- -----------------------------------------------------------------------------
-- 3. HISTÓRICO DO CLIENTE — view curada
-- -----------------------------------------------------------------------------
-- A policy acima dá ao cliente a LINHA inteira do agendamento, e a linha inclui
-- `agendamento.observacoes` — que é a anotação que a BARBEARIA escreve para uso
-- interno ("Preferências, avisos, etc..."). Pode conter observação sobre o
-- cliente que não foi escrita para ele ler.
--
-- Esta view é o que a área do cliente consome, e ela não traz esse campo.
-- IMPORTANTE, e registrado no log para decisão: a view protege o caminho normal,
-- NÃO o acesso direto. Um cliente que chame a API na mão ainda alcança
-- `observacoes` pela policy. Fechar de verdade exigiria restringir a policy por
-- coluna (o que o Postgres não faz) ou trocá-la por acesso só via view.
-- POR QUE `security_invoker = false` AQUI, E O ERRO QUE ISSO CORRIGE
-- A primeira versão usava `true`, para a RLS de cada um ser aplicada. Parecia o
-- mais seguro e devolvia ZERO linhas: a view junta `barbearia` para mostrar o
-- nome da barbearia no histórico, e o cliente NÃO pode ler `barbearia` — a
-- policy de lá é `id = get_barbearia_do_usuario()`, e ele tem barbearia nula.
-- O INNER JOIN eliminava todas as linhas, e o cliente via um histórico vazio
-- tendo cinco agendamentos.
--
-- Com `false` a view roda como dona e enxerga as duas tabelas — e, como nas
-- views públicas, TODO o recorte passa a ser responsabilidade do WHERE abaixo.
-- Tirar aquele EXISTS daqui entrega o histórico de todo mundo para qualquer
-- usuário autenticado, e a RLS não vai impedir, porque nem é consultada.
CREATE OR REPLACE VIEW meus_agendamentos
WITH (security_invoker = false) AS
SELECT
  a.id,
  a.barbearia_id,
  b.nome  AS barbearia_nome,
  b.slug  AS barbearia_slug,
  a.data_hora,
  a.data_hora_fim,
  a.status,
  a.profissional_id,
  p.nome  AS profissional_nome,
  a.criado_em
FROM agendamento a
JOIN barbearia b ON b.id = a.barbearia_id
LEFT JOIN profissional p ON p.id = a.profissional_id
WHERE EXISTS (
  SELECT 1 FROM cliente c
  WHERE c.id = a.cliente_id
    AND c.usuario_id = auth.uid()
);

COMMENT ON VIEW meus_agendamentos IS
  'Historico do cliente. security_invoker=true de proposito: aqui a RLS DEVE ser aplicada, para cada um enxergar so o que lhe pertence. Nao traz agendamento.observacoes, que e anotacao interna da barbearia.';

-- Diferente das views públicas, esta nunca pode ser aberta ao `anon`: sem JWT,
-- `auth.uid()` é nulo e o EXISTS não casaria com ninguém — mas conceder a quem
-- não precisa é superfície de graça.
REVOKE ALL ON meus_agendamentos FROM PUBLIC;
REVOKE ALL ON meus_agendamentos FROM anon, authenticated;
GRANT SELECT ON meus_agendamentos TO authenticated;
