-- =============================================================================
-- 00019 — PROMOÇÕES E AGENDAMENTO PELO LADO DE FORA
-- =============================================================================
-- A parte de promoções segue o padrão já estabelecido. A parte de agendamento
-- resolve uma lacuna da especificação, medida antes de escrever.
--
-- A SPEC PEDIA ALGO QUE O CLIENTE NÃO PODE FAZER
-- A F5.3 descreve o passo 3 lendo a disponibilidade e o passo 5 fazendo
-- "o INSERT no banco associando o cliente_id". Nenhum dos dois é possível pelo
-- frontend. Verificado como a conta de cliente de teste:
--
--   horario_trabalho visíveis ....... 0
--   bloqueio visíveis ............... 0
--   servico visíveis ................ 0
--   INSERT INTO agendamento ......... ERROR: new row violates row-level
--                                     security policy for table "agendamento"
--
-- É a mesma raiz da Fase 4: as policies são `barbearia_id =
-- get_barbearia_do_usuario()` e o cliente não pertence a barbearia nenhuma.
-- Some-se a isso que um cliente agendando numa barbearia nova **não tem registro
-- em `cliente` lá** — e também não pode criar um.
--
-- Por isso as duas operações viram RPC SECURITY DEFINER, no mesmo molde das
-- funções de gestão de acesso da Fase 2. Elas são a fronteira: tudo que o
-- público pode fazer com a agenda passa por aqui, com validação explícita.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. PROMOÇÕES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS promocao (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbearia_id        UUID NOT NULL REFERENCES barbearia(id) ON DELETE CASCADE,
  titulo              VARCHAR(255) NOT NULL,
  descricao           TEXT,
  desconto_percentual NUMERIC(5,2) NOT NULL CHECK (desconto_percentual >= 0 AND desconto_percentual <= 100),
  regras              TEXT,
  data_inicio         TIMESTAMPTZ NOT NULL,
  data_fim            TIMESTAMPTZ NOT NULL,
  status              status_registro DEFAULT 'ativo',
  criado_em           TIMESTAMPTZ DEFAULT now(),
  atualizado_em       TIMESTAMPTZ DEFAULT now()
);

-- Promoção que termina antes de começar não é erro de digitação a ser tolerado:
-- ela nunca apareceria na vitrine e o gestor não saberia por quê.
ALTER TABLE promocao DROP CONSTRAINT IF EXISTS promocao_periodo_valido;
ALTER TABLE promocao ADD CONSTRAINT promocao_periodo_valido
  CHECK (data_fim > data_inicio);

CREATE INDEX IF NOT EXISTS idx_promocao_barbearia_periodo
  ON promocao (barbearia_id, status, data_inicio, data_fim);

DROP TRIGGER IF EXISTS trg_atualizado_em_promocao ON promocao;
CREATE TRIGGER trg_atualizado_em_promocao
  BEFORE UPDATE ON promocao
  FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();

ALTER TABLE promocao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Promocao isolated by barbearia" ON promocao;
CREATE POLICY "Promocao isolated by barbearia"
ON promocao FOR ALL TO authenticated
USING (barbearia_id = get_barbearia_do_usuario() OR is_admin_supremo());


-- A vitrine de promoções. Três filtros, e os três são a única proteção:
-- a view roda com security_invoker = false e NÃO aplica a RLS de `promocao`.
DROP VIEW IF EXISTS promocao_publica;
CREATE VIEW promocao_publica
WITH (security_invoker = false) AS
SELECT
  p.id,
  p.barbearia_id,
  p.titulo,
  p.descricao,
  p.desconto_percentual,
  p.regras,
  p.data_inicio,
  p.data_fim
FROM promocao p
JOIN barbearia b ON b.id = p.barbearia_id
WHERE p.status = 'ativo'
  AND p.data_inicio <= now()
  AND p.data_fim >= now()
  -- O opt-out do catálogo vale aqui também: barbearia que saiu da vitrine não
  -- deve seguir anunciando desconto para quem tiver o link.
  AND b.listada_no_catalogo = true;

COMMENT ON VIEW promocao_publica IS
  'Promocoes vigentes, legiveis sem autenticacao. Promocao expirada some sozinha: o filtro e por now(), nao por um status que alguem precise lembrar de virar.';

REVOKE ALL ON promocao_publica FROM PUBLIC;
REVOKE ALL ON promocao_publica FROM anon, authenticated;
GRANT SELECT ON promocao_publica TO anon, authenticated;


-- -----------------------------------------------------------------------------
-- 2. FUSO DA BARBEARIA
-- -----------------------------------------------------------------------------
-- `horario_trabalho.hora_inicio` é `time`: hora de parede, "abro às 9". Para
-- comparar isso com o `timestamptz` de um agendamento é preciso saber em que
-- fuso aquela parede está — e o modelo não guardava essa informação em lugar
-- nenhum. Este banco roda em UTC; sem a coluna, validar jornada no servidor
-- erraria por 3 horas para uma barbearia brasileira, aceitando horário de
-- madrugada e recusando horário do fim da tarde.
--
-- O default cobre o caso atual sem impedir que uma barbearia de outro fuso
-- funcione depois. O frontend continua montando os horários no fuso do
-- navegador; isto é o que permite ao SERVIDOR conferir a mesma coisa.
ALTER TABLE barbearia
  ADD COLUMN IF NOT EXISTS fuso_horario TEXT NOT NULL DEFAULT 'America/Sao_Paulo';

COMMENT ON COLUMN barbearia.fuso_horario IS
  'Fuso em que horario_trabalho e bloqueio devem ser lidos. Nome IANA.';


-- -----------------------------------------------------------------------------
-- 3. DISPONIBILIDADE PARA O PÚBLICO
-- -----------------------------------------------------------------------------
-- Devolve exatamente o que `disponibilidade.service.obterOcupacaoDoDia` já
-- devolvia para o painel: a jornada do dia e os intervalos ocupados. Assim o
-- frontend reaproveita `gerarHorariosDisponiveis`, que é função pura e já
-- testada, em vez de reimplementar a geração de horários do lado de fora.
--
-- Os limites do dia vêm por parâmetro, e não são calculados aqui, para manter a
-- paridade com o painel: quem decide onde o dia começa é o fuso do navegador,
-- como já acontece hoje.
CREATE OR REPLACE FUNCTION public.ocupacao_publica(
  p_profissional_id UUID,
  p_dia_semana      INTEGER,
  p_inicio          TIMESTAMPTZ,
  p_fim             TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_barbearia_id UUID;
  v_jornada JSONB;
  v_ocupados JSONB;
BEGIN
  SELECT p.barbearia_id INTO v_barbearia_id
  FROM profissional p
  JOIN barbearia b ON b.id = p.barbearia_id
  WHERE p.id = p_profissional_id
    AND p.status = 'ativo'
    AND b.listada_no_catalogo = true;

  IF v_barbearia_id IS NULL THEN
    RAISE EXCEPTION 'Profissional nao disponivel para agendamento';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('hora_inicio', h.hora_inicio, 'hora_fim', h.hora_fim)
                            ORDER BY h.hora_inicio), '[]'::jsonb)
  INTO v_jornada
  FROM horario_trabalho h
  WHERE h.profissional_id = p_profissional_id
    AND h.dia_semana = p_dia_semana
    AND h.ativo = true;

  -- Mesma condição do constraint agendamento_sem_sobreposicao: cancelado e
  -- faltou liberam o horário. Só os limites do intervalo saem daqui — nada de
  -- quem marcou, nem do que foi marcado.
  SELECT COALESCE(jsonb_agg(jsonb_build_object('inicio', x.inicio, 'fim', x.fim)), '[]'::jsonb)
  INTO v_ocupados
  FROM (
    SELECT a.data_hora AS inicio, a.data_hora_fim AS fim
    FROM agendamento a
    WHERE a.profissional_id = p_profissional_id
      AND a.status NOT IN ('cancelado', 'faltou')
      AND a.data_hora < p_fim
      AND a.data_hora_fim > p_inicio
    UNION ALL
    SELECT b.data_hora_inicio, b.data_hora_fim
    FROM bloqueio b
    WHERE b.barbearia_id = v_barbearia_id
      AND (b.profissional_id = p_profissional_id OR b.profissional_id IS NULL)
      AND b.data_hora_inicio < p_fim
      AND b.data_hora_fim > p_inicio
  ) x;

  RETURN jsonb_build_object('jornada', v_jornada, 'ocupados', v_ocupados);
END;
$$;

REVOKE ALL ON FUNCTION public.ocupacao_publica(UUID, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ocupacao_publica(UUID, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ) TO anon, authenticated;


-- -----------------------------------------------------------------------------
-- 4. AGENDAR PELO LADO DE FORA
-- -----------------------------------------------------------------------------
-- Exige login: `anon` não recebe EXECUTE. Agendamento sem dono não tem como ser
-- consultado nem cancelado depois.
CREATE OR REPLACE FUNCTION public.agendar_como_cliente(
  p_barbearia_id    UUID,
  p_profissional_id UUID,
  p_servico_ids     UUID[],
  p_data_hora       TIMESTAMPTZ,
  p_observacoes     TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cliente_id UUID;
  v_agendamento_id UUID;
  v_duracao INTEGER;
  v_qtd INTEGER;
  v_fim TIMESTAMPTZ;
  v_nome TEXT;
  v_fuso TEXT;
  v_inicio_local TIMESTAMP;
  v_fim_local TIMESTAMP;
  v_cabe BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticacao obrigatoria';
  END IF;

  IF p_servico_ids IS NULL OR array_length(p_servico_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Selecione ao menos um servico';
  END IF;

  IF p_data_hora <= now() THEN
    RAISE EXCEPTION 'Escolha um horario no futuro';
  END IF;

  -- A barbearia precisa estar no catálogo. Sem isto, uma barbearia que optou por
  -- sair continuaria recebendo agendamento de quem guardou o link.
  SELECT fuso_horario INTO v_fuso
  FROM barbearia
  WHERE id = p_barbearia_id AND listada_no_catalogo = true;

  IF v_fuso IS NULL THEN
    RAISE EXCEPTION 'Esta barbearia nao esta aceitando agendamentos pelo site';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM profissional
    WHERE id = p_profissional_id AND barbearia_id = p_barbearia_id AND status = 'ativo'
  ) THEN
    RAISE EXCEPTION 'Profissional indisponivel nesta barbearia';
  END IF;

  -- Todos os serviços precisam ser desta barbearia e estar ativos. Sem esta
  -- checagem, daria para montar um agendamento com o preco de outra barbearia.
  SELECT count(*), COALESCE(sum(duracao_minutos), 0)
  INTO v_qtd, v_duracao
  FROM servico
  WHERE id = ANY(p_servico_ids)
    AND barbearia_id = p_barbearia_id
    AND status = 'ativo';

  IF v_qtd <> array_length(p_servico_ids, 1) THEN
    RAISE EXCEPTION 'Algum servico selecionado nao esta disponivel';
  END IF;

  v_fim := p_data_hora + make_interval(mins => v_duracao);

  -- O constraint de exclusão barra sobreposição, mas NÃO sabe nada de jornada de
  -- trabalho nem de bloqueio. Sem esta validação, daria para agendar de
  -- madrugada montando a chamada na mão, fora do que a tela oferece.
  --
  -- A conversão para o fuso da barbearia é o que torna a comparação honesta:
  -- `horario_trabalho` é hora de parede e o agendamento é instante absoluto.
  v_inicio_local := timezone(v_fuso, p_data_hora);
  v_fim_local    := timezone(v_fuso, v_fim);

  SELECT EXISTS (
    SELECT 1 FROM horario_trabalho h
    WHERE h.profissional_id = p_profissional_id
      AND h.ativo = true
      AND h.dia_semana = EXTRACT(DOW FROM v_inicio_local)::INTEGER
      AND v_inicio_local::time >= h.hora_inicio
      AND v_fim_local::time <= h.hora_fim
  ) INTO v_cabe;

  IF NOT v_cabe THEN
    RAISE EXCEPTION 'Horario fora da jornada de trabalho do profissional';
  END IF;

  IF EXISTS (
    SELECT 1 FROM bloqueio b
    WHERE b.barbearia_id = p_barbearia_id
      AND (b.profissional_id = p_profissional_id OR b.profissional_id IS NULL)
      AND b.data_hora_inicio < v_fim
      AND b.data_hora_fim > p_data_hora
  ) THEN
    RAISE EXCEPTION 'Horario indisponivel nesta barbearia';
  END IF;

  -- O cliente pode nunca ter sido atendido aqui. Neste caso o cadastro dele
  -- nasce agora, vinculado a conta — e nao duplica se ele voltar.
  SELECT id INTO v_cliente_id
  FROM cliente
  WHERE barbearia_id = p_barbearia_id AND usuario_id = auth.uid()
  LIMIT 1;

  IF v_cliente_id IS NULL THEN
    SELECT nome INTO v_nome FROM usuario_perfil WHERE id = auth.uid();

    INSERT INTO cliente (barbearia_id, usuario_id, nome, status)
    VALUES (p_barbearia_id, auth.uid(), COALESCE(NULLIF(btrim(v_nome), ''), 'Cliente'), 'ativo')
    RETURNING id INTO v_cliente_id;
  END IF;

  INSERT INTO agendamento (
    barbearia_id, cliente_id, profissional_id, data_hora, data_hora_fim, status, observacoes
  )
  VALUES (
    p_barbearia_id, v_cliente_id, p_profissional_id, p_data_hora, v_fim, 'pendente',
    NULLIF(btrim(COALESCE(p_observacoes, '')), '')
  )
  RETURNING id INTO v_agendamento_id;

  -- `preco_cobrado` congela o preço do momento, como o painel já faz: mudar a
  -- tabela depois não pode reescrever o que foi combinado.
  INSERT INTO agendamento_servico (agendamento_id, servico_id, preco_cobrado)
  SELECT v_agendamento_id, s.id, s.preco
  FROM servico s
  WHERE s.id = ANY(p_servico_ids) AND s.barbearia_id = p_barbearia_id;

  RETURN v_agendamento_id;
END;
$$;

REVOKE ALL ON FUNCTION public.agendar_como_cliente(UUID, UUID, UUID[], TIMESTAMPTZ, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.agendar_como_cliente(UUID, UUID, UUID[], TIMESTAMPTZ, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.agendar_como_cliente(UUID, UUID, UUID[], TIMESTAMPTZ, TEXT) TO authenticated;
