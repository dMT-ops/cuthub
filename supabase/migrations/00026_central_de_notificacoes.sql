-- =============================================================================
-- 00026 — CENTRAL DE NOTIFICAÇÕES
-- =============================================================================
-- As notificações nascem no banco, por trigger, e não no frontend. O motivo é
-- bom: o agendamento público entra por RPC, o cancelamento entra por três
-- telas diferentes, e a aprovação de folga por outra. Espalhar o "avisar" por
-- todos esses caminhos garantiria que um deles esqueceria.
--
-- MEDIDO ANTES DE ESCREVER: A MAIORIA DOS ALVOS NÃO TEM CONTA
--
--   profissionais ... 9 no total, 1 com conta
--   clientes ........ 54 no total, 6 com conta
--
-- Cliente cadastrado no balcão e barbeiro sem login são a regra, não a
-- exceção. Por isso `criar_notificacao` **ignora destinatário nulo em
-- silêncio**: se ela levantasse erro, um `INSERT` em `agendamento` passaria a
-- falhar sempre que o cliente não tivesse conta — ou seja, a notificação
-- derrubaria o agendamento. Trigger de aviso não pode quebrar a operação que
-- o disparou.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.notificacao (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES public.usuario_perfil(id) ON DELETE CASCADE,
  titulo     VARCHAR(140) NOT NULL,
  mensagem   TEXT,
  tipo       VARCHAR(40) NOT NULL DEFAULT 'geral',
  lida       BOOLEAN NOT NULL DEFAULT false,
  link_acao  VARCHAR(255),
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A consulta do sino é sempre "as minhas, não lidas primeiro, recentes antes".
CREATE INDEX IF NOT EXISTS idx_notificacao_caixa
  ON public.notificacao (usuario_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_notificacao_nao_lida
  ON public.notificacao (usuario_id) WHERE lida = false;

ALTER TABLE public.notificacao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notificacao_leitura_do_dono" ON public.notificacao;
CREATE POLICY "notificacao_leitura_do_dono" ON public.notificacao
  FOR SELECT TO authenticated
  USING (usuario_id = auth.uid());

-- UPDATE existe só para marcar como lida. O `WITH CHECK` impede repassar a
-- notificação para outra pessoa mudando o `usuario_id`.
DROP POLICY IF EXISTS "notificacao_marcada_pelo_dono" ON public.notificacao;
CREATE POLICY "notificacao_marcada_pelo_dono" ON public.notificacao
  FOR UPDATE TO authenticated
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

-- Sem policy de INSERT nem de DELETE: a RLS nega por padrão. Notificação
-- nasce por trigger e não se apaga -- some da caixa quando é lida, e o
-- histórico fica.

-- -----------------------------------------------------------------------------
-- O EMISSOR
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.criar_notificacao(
  p_usuario_id UUID,
  p_titulo TEXT,
  p_mensagem TEXT,
  p_tipo TEXT DEFAULT 'geral',
  p_link TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Destinatário sem conta: não há para quem avisar, e isso é o caso comum.
  IF p_usuario_id IS NULL THEN
    RETURN;
  END IF;

  -- Não avisar quem acabou de agir. Contar para a pessoa, no mesmo segundo,
  -- aquilo que ela mesma fez é ruído -- a tela dela já mostrou o resultado.
  IF p_usuario_id = auth.uid() THEN
    RETURN;
  END IF;

  INSERT INTO notificacao (usuario_id, titulo, mensagem, tipo, link_acao)
  VALUES (p_usuario_id, left(p_titulo, 140), p_mensagem, p_tipo, p_link);
END $$;

REVOKE ALL ON FUNCTION public.criar_notificacao(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- AGENDAMENTO CRIADO
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notificar_agendamento_criado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario_barbeiro UUID;
  v_usuario_cliente UUID;
  v_nome_cliente TEXT;
  v_nome_barbearia TEXT;
  v_quando TEXT;
BEGIN
  SELECT p.usuario_id INTO v_usuario_barbeiro FROM profissional p WHERE p.id = NEW.profissional_id;
  SELECT c.usuario_id, c.nome INTO v_usuario_cliente, v_nome_cliente FROM cliente c WHERE c.id = NEW.cliente_id;
  SELECT b.nome INTO v_nome_barbearia FROM barbearia b WHERE b.id = NEW.barbearia_id;

  -- Horário no fuso da barbearia, não no do servidor: um aviso que mostra a
  -- hora errada é pior do que não avisar.
  SELECT to_char(NEW.data_hora AT TIME ZONE COALESCE(b.fuso_horario, 'America/Sao_Paulo'),
                 'DD/MM "às" HH24:MI')
    INTO v_quando
    FROM barbearia b WHERE b.id = NEW.barbearia_id;

  PERFORM criar_notificacao(
    v_usuario_barbeiro,
    'Novo agendamento',
    COALESCE(v_nome_cliente, 'Um cliente') || ' marcou com você em ' || v_quando || '.',
    'agendamento_criado',
    '/dashboard/agenda'
  );

  PERFORM criar_notificacao(
    v_usuario_cliente,
    'Agendamento confirmado',
    'Seu horário em ' || COALESCE(v_nome_barbearia, 'a barbearia') || ' ficou para ' || v_quando || '.',
    'agendamento_criado',
    '/minha-conta/agendamentos'
  );

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notificar_agendamento_criado ON public.agendamento;
CREATE TRIGGER trg_notificar_agendamento_criado
  AFTER INSERT ON public.agendamento
  FOR EACH ROW EXECUTE FUNCTION public.notificar_agendamento_criado();

-- -----------------------------------------------------------------------------
-- AGENDAMENTO CANCELADO — avisa a contraparte
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notificar_agendamento_cancelado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario_barbeiro UUID;
  v_usuario_cliente UUID;
  v_nome_cliente TEXT;
  v_nome_barbearia TEXT;
  v_quando TEXT;
BEGIN
  IF NEW.status <> 'cancelado' OR OLD.status = 'cancelado' THEN
    RETURN NEW;
  END IF;

  SELECT p.usuario_id INTO v_usuario_barbeiro FROM profissional p WHERE p.id = NEW.profissional_id;
  SELECT c.usuario_id, c.nome INTO v_usuario_cliente, v_nome_cliente FROM cliente c WHERE c.id = NEW.cliente_id;
  SELECT b.nome, to_char(NEW.data_hora AT TIME ZONE COALESCE(b.fuso_horario, 'America/Sao_Paulo'),
                         'DD/MM "às" HH24:MI')
    INTO v_nome_barbearia, v_quando
    FROM barbearia b WHERE b.id = NEW.barbearia_id;

  -- `criar_notificacao` já pula quem agiu, então mandar para os dois entrega
  -- só para a contraparte, sem o trigger precisar adivinhar quem cancelou.
  PERFORM criar_notificacao(
    v_usuario_barbeiro,
    'Agendamento cancelado',
    'O horário de ' || COALESCE(v_nome_cliente, 'um cliente') || ' em ' || v_quando || ' foi cancelado.',
    'agendamento_cancelado',
    '/dashboard/agenda'
  );

  PERFORM criar_notificacao(
    v_usuario_cliente,
    'Agendamento cancelado',
    'Seu horário em ' || COALESCE(v_nome_barbearia, 'a barbearia') || ' (' || v_quando || ') foi cancelado.',
    'agendamento_cancelado',
    '/minha-conta/agendamentos'
  );

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notificar_agendamento_cancelado ON public.agendamento;
CREATE TRIGGER trg_notificar_agendamento_cancelado
  AFTER UPDATE OF status ON public.agendamento
  FOR EACH ROW EXECUTE FUNCTION public.notificar_agendamento_cancelado();

-- -----------------------------------------------------------------------------
-- ESCALA: resposta do dono, e pedido chegando para ele
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notificar_resposta_de_escala()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario_barbeiro UUID;
  v_assunto TEXT;
  v_veredito TEXT;
BEGIN
  IF NEW.status_aprovacao IS NOT DISTINCT FROM OLD.status_aprovacao THEN
    RETURN NEW;
  END IF;
  IF NEW.status_aprovacao = 'pendente' THEN
    RETURN NEW;
  END IF;

  SELECT p.usuario_id INTO v_usuario_barbeiro FROM profissional p WHERE p.id = NEW.profissional_id;

  v_assunto := CASE TG_TABLE_NAME WHEN 'bloqueio' THEN 'folga' ELSE 'mudança de jornada' END;
  v_veredito := CASE NEW.status_aprovacao WHEN 'aprovado' THEN 'aprovada' ELSE 'recusada' END;

  PERFORM criar_notificacao(
    v_usuario_barbeiro,
    'Sua ' || v_assunto || ' foi ' || v_veredito,
    CASE NEW.status_aprovacao
      WHEN 'aprovado' THEN 'Já vale na agenda: os clientes não conseguem marcar nesse período.'
      ELSE 'A sua agenda segue como estava. Fale com a gestão se precisar.'
    END,
    'escala_respondida',
    '/dashboard/agenda'
  );

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notificar_resposta_bloqueio ON public.bloqueio;
CREATE TRIGGER trg_notificar_resposta_bloqueio
  AFTER UPDATE OF status_aprovacao ON public.bloqueio
  FOR EACH ROW EXECUTE FUNCTION public.notificar_resposta_de_escala();

DROP TRIGGER IF EXISTS trg_notificar_resposta_horario ON public.horario_trabalho;
CREATE TRIGGER trg_notificar_resposta_horario
  AFTER UPDATE OF status_aprovacao ON public.horario_trabalho
  FOR EACH ROW EXECUTE FUNCTION public.notificar_resposta_de_escala();

-- O outro lado do laço da Fase 9: sem isto o pedido fica parado esperando o
-- dono lembrar de olhar o painel.
CREATE OR REPLACE FUNCTION public.notificar_pedido_de_escala()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gestor RECORD;
  v_nome_barbeiro TEXT;
BEGIN
  IF NEW.status_aprovacao <> 'pendente' THEN
    RETURN NEW;
  END IF;

  SELECT nome INTO v_nome_barbeiro FROM profissional WHERE id = NEW.profissional_id;

  FOR v_gestor IN
    SELECT id FROM usuario_perfil
     WHERE barbearia_id = NEW.barbearia_id AND tipo IN ('owner', 'gerente')
  LOOP
    PERFORM criar_notificacao(
      v_gestor.id,
      'Pedido da equipe aguardando',
      COALESCE(v_nome_barbeiro, 'Um profissional') || ' fez um pedido de ' ||
      CASE TG_TABLE_NAME WHEN 'bloqueio' THEN 'folga' ELSE 'jornada' END ||
      '. Enquanto você não responder, a agenda segue aberta.',
      'escala_pedida',
      '/dashboard'
    );
  END LOOP;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notificar_pedido_bloqueio ON public.bloqueio;
CREATE TRIGGER trg_notificar_pedido_bloqueio
  AFTER INSERT ON public.bloqueio
  FOR EACH ROW EXECUTE FUNCTION public.notificar_pedido_de_escala();

DROP TRIGGER IF EXISTS trg_notificar_pedido_horario ON public.horario_trabalho;
CREATE TRIGGER trg_notificar_pedido_horario
  AFTER INSERT ON public.horario_trabalho
  FOR EACH ROW EXECUTE FUNCTION public.notificar_pedido_de_escala();

-- -----------------------------------------------------------------------------
-- VERIFICAÇÃO
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_triggers INTEGER;
BEGIN
  SELECT count(*) INTO v_triggers
    FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
   WHERE NOT t.tgisinternal AND t.tgname LIKE 'trg_notificar_%';

  IF v_triggers <> 6 THEN
    RAISE EXCEPTION 'Esperava 6 triggers de notificacao, encontrei %', v_triggers;
  END IF;

  RAISE NOTICE 'Central de notificacoes: 6 triggers no lugar';
END $$;
