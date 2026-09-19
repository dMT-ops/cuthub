-- =============================================================================
-- 00027 — QUATRO AVISOS NOVOS E O LEMBRETE ANTES DO HORÁRIO
-- =============================================================================
-- A F10 entregou seis triggers, e todos avisam sobre o que **acabou de
-- acontecer**. O objetivo declarado da fase, porém, era combate a faltas — e
-- isso exige avisar **antes**, o que nenhum trigger faz. É o que entra aqui,
-- com `pg_cron` (disponível e no `shared_preload_libraries` deste Supabase).
--
-- Decisões do Chefe nesta rodada: lembrete em 24h e 2h, mais os quatro avisos
-- de evento (reserva confirmada, comissão paga, promoção em barbearia
-- favoritada, cliente faltou).
--
-- UM TEXTO ERRADO QUE VAI JUNTO
--
-- O aviso de criação dizia "Agendamento confirmado" **qualquer que fosse o
-- status**. O agendamento público nasce `pendente`, e o painel deixa o dono
-- escolher `pendente` — nesses casos o cliente lia "confirmado" sobre algo que
-- ainda não estava. Corrigido: o título segue o status real.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. NÚMERO EM PORTUGUÊS
-- -----------------------------------------------------------------------------
-- `to_char` com `G`/`D` usa o locale do servidor, que aqui não é pt-BR: a
-- primeira versão mandou "R$ 250.50" e "20.00% de desconto" para o usuário
-- final. Estas duas funções deixam o formato explícito, sem depender de como o
-- banco foi configurado.
CREATE OR REPLACE FUNCTION public.formatar_dinheiro(p_valor NUMERIC)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT replace(replace(replace(to_char(p_valor, 'FM999,999,999.00'), ',', '|'), '.', ','), '|', '.');
$$;

/* Percentual sem zero à toa: 20.00 -> "20", 12.50 -> "12,5". */
CREATE OR REPLACE FUNCTION public.formatar_percentual(p_valor NUMERIC)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT replace(rtrim(rtrim(to_char(p_valor, 'FM999990.00'), '0'), '.'), '.', ',');
$$;

-- -----------------------------------------------------------------------------
-- 1. O EMISSOR GANHA UMA EXCEÇÃO CONTROLADA
-- -----------------------------------------------------------------------------
-- `criar_notificacao` pula quem agiu, e isso é certo na maioria dos casos. Mas
-- "cliente faltou" é marcado pelo próprio gestor: com a regra normal, numa
-- barbearia de um dono só **ninguém receberia nada**. E ali a informação nova
-- não é o fato (ele acabou de marcar), é a REINCIDÊNCIA — quantas vezes
-- aquele cliente já faltou. Por isso a exceção existe, e é explícita.
-- O DROP é obrigatório e não é zelo: acrescentar um parâmetro **cria uma
-- sobrecarga**, não substitui a função. Com as duas versões vivas, toda
-- chamada de 5 argumentos (ou seja, os seis triggers da F10) passou a dar
-- `function criar_notificacao(...) is not unique` -- e criar agendamento
-- quebrou. Peguei rodando o teste; a migration sozinha dizia CREATE FUNCTION
-- e parecia bem.
DROP FUNCTION IF EXISTS public.criar_notificacao(UUID, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.criar_notificacao(
  p_usuario_id UUID,
  p_titulo TEXT,
  p_mensagem TEXT,
  p_tipo TEXT DEFAULT 'geral',
  p_link TEXT DEFAULT NULL,
  p_mesmo_para_o_autor BOOLEAN DEFAULT false
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_usuario_id IS NULL THEN
    RETURN;
  END IF;

  IF p_usuario_id = auth.uid() AND NOT p_mesmo_para_o_autor THEN
    RETURN;
  END IF;

  INSERT INTO notificacao (usuario_id, titulo, mensagem, tipo, link_acao)
  VALUES (p_usuario_id, left(p_titulo, 140), p_mensagem, p_tipo, p_link);
END $$;

REVOKE ALL ON FUNCTION public.criar_notificacao(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2. O TÍTULO DO AVISO DE CRIAÇÃO PASSA A DIZER A VERDADE
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
  SELECT b.nome, to_char(NEW.data_hora AT TIME ZONE COALESCE(b.fuso_horario, 'America/Sao_Paulo'),
                         'DD/MM "às" HH24:MI')
    INTO v_nome_barbearia, v_quando
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
    CASE WHEN NEW.status = 'pendente' THEN 'Pedido de horário enviado' ELSE 'Agendamento confirmado' END,
    CASE WHEN NEW.status = 'pendente'
      THEN 'Você pediu ' || v_quando || ' em ' || COALESCE(v_nome_barbearia, 'a barbearia') ||
           '. Avisamos assim que confirmarem.'
      ELSE 'Seu horário em ' || COALESCE(v_nome_barbearia, 'a barbearia') || ' ficou para ' || v_quando || '.'
    END,
    'agendamento_criado',
    '/minha-conta/agendamentos'
  );

  RETURN NEW;
END $$;

-- -----------------------------------------------------------------------------
-- 3. RESERVA CONFIRMADA PELA BARBEARIA
-- -----------------------------------------------------------------------------
-- O único momento em que o cliente ficava no escuro: ele marca pelo site, o
-- agendamento nasce `pendente`, e nada dizia quando saiu a resposta.
CREATE OR REPLACE FUNCTION public.notificar_reserva_confirmada()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario_cliente UUID;
  v_nome_barbearia TEXT;
  v_quando TEXT;
BEGIN
  IF OLD.status <> 'pendente' OR NEW.status <> 'confirmado' THEN
    RETURN NEW;
  END IF;

  SELECT c.usuario_id INTO v_usuario_cliente FROM cliente c WHERE c.id = NEW.cliente_id;
  SELECT b.nome, to_char(NEW.data_hora AT TIME ZONE COALESCE(b.fuso_horario, 'America/Sao_Paulo'),
                         'DD/MM "às" HH24:MI')
    INTO v_nome_barbearia, v_quando
    FROM barbearia b WHERE b.id = NEW.barbearia_id;

  PERFORM criar_notificacao(
    v_usuario_cliente,
    'Horário confirmado',
    COALESCE(v_nome_barbearia, 'A barbearia') || ' confirmou o seu horário de ' || v_quando || '.',
    'reserva_confirmada',
    '/minha-conta/agendamentos'
  );

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notificar_reserva_confirmada ON public.agendamento;
CREATE TRIGGER trg_notificar_reserva_confirmada
  AFTER UPDATE OF status ON public.agendamento
  FOR EACH ROW EXECUTE FUNCTION public.notificar_reserva_confirmada();

-- -----------------------------------------------------------------------------
-- 4. CLIENTE FALTOU — para o gestor, com a reincidência junto
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notificar_falta_do_cliente()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gestor RECORD;
  v_nome_cliente TEXT;
  v_faltas INTEGER;
  v_mensagem TEXT;
BEGIN
  IF NEW.status <> 'faltou' OR OLD.status = 'faltou' THEN
    RETURN NEW;
  END IF;

  SELECT c.nome INTO v_nome_cliente FROM cliente c WHERE c.id = NEW.cliente_id;

  SELECT count(*) INTO v_faltas
    FROM agendamento a
   WHERE a.cliente_id = NEW.cliente_id
     AND a.status = 'faltou'
     AND a.data_hora > now() - interval '90 days';

  v_mensagem := CASE
    WHEN v_faltas > 1 THEN 'É a ' || v_faltas || 'ª falta dele(a) em 90 dias.'
    ELSE 'Primeira falta dele(a) em 90 dias.'
  END;

  FOR v_gestor IN
    SELECT id FROM usuario_perfil
     WHERE barbearia_id = NEW.barbearia_id AND tipo IN ('owner', 'gerente')
  LOOP
    PERFORM criar_notificacao(
      v_gestor.id,
      COALESCE(v_nome_cliente, 'Um cliente') || ' faltou',
      v_mensagem,
      'cliente_faltou',
      '/dashboard/agenda',
      -- Vai para o autor também: quem marca a falta é o próprio gestor, e a
      -- informação nova aqui é a contagem, não o fato.
      true
    );
  END LOOP;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notificar_falta_do_cliente ON public.agendamento;
CREATE TRIGGER trg_notificar_falta_do_cliente
  AFTER UPDATE OF status ON public.agendamento
  FOR EACH ROW EXECUTE FUNCTION public.notificar_falta_do_cliente();

-- -----------------------------------------------------------------------------
-- 5. COMISSÃO PAGA
-- -----------------------------------------------------------------------------
-- A saída de comissão existe no caixa desde a F6.1 e o barbeiro nunca soube
-- que tinha recebido.
CREATE OR REPLACE FUNCTION public.notificar_comissao_paga()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario_barbeiro UUID;
BEGIN
  IF NEW.tipo <> 'saida' OR NEW.categoria <> 'comissao' OR NEW.profissional_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT p.usuario_id INTO v_usuario_barbeiro FROM profissional p WHERE p.id = NEW.profissional_id;

  PERFORM criar_notificacao(
    v_usuario_barbeiro,
    'Comissão registrada',
    'A barbearia lançou R$ ' || formatar_dinheiro(NEW.valor) || ' de comissão para você.'
      || COALESCE(' (' || NEW.descricao || ')', ''),
    'comissao_paga',
    '/dashboard/financeiro'
  );

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notificar_comissao_paga ON public.lancamento_financeiro;
CREATE TRIGGER trg_notificar_comissao_paga
  AFTER INSERT ON public.lancamento_financeiro
  FOR EACH ROW EXECUTE FUNCTION public.notificar_comissao_paga();

-- -----------------------------------------------------------------------------
-- 6. PROMOÇÃO EM BARBEARIA FAVORITADA
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notificar_promocao_para_favoritos()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fa RECORD;
  v_nome_barbearia TEXT;
BEGIN
  -- Só quando a promoção passa a valer: criada ativa, ou reativada depois.
  IF NEW.status <> 'ativo' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'ativo' THEN
    RETURN NEW;
  END IF;
  IF NEW.data_fim < now() THEN
    RETURN NEW;
  END IF;

  SELECT nome INTO v_nome_barbearia FROM barbearia WHERE id = NEW.barbearia_id;

  FOR v_fa IN
    SELECT DISTINCT usuario_id FROM favorito
     WHERE tipo = 'barbearia' AND barbearia_id = NEW.barbearia_id AND usuario_id IS NOT NULL
  LOOP
    PERFORM criar_notificacao(
      v_fa.usuario_id,
      COALESCE(v_nome_barbearia, 'Uma barbearia que você segue') || ' lançou uma promoção',
      NEW.titulo || COALESCE(' — ' || formatar_percentual(NEW.desconto_percentual) || '% de desconto', '') || '.',
      'promocao_nova',
      '/b/' || COALESCE((SELECT slug FROM barbearia WHERE id = NEW.barbearia_id), '')
    );
  END LOOP;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notificar_promocao_nova ON public.promocao;
CREATE TRIGGER trg_notificar_promocao_nova
  AFTER INSERT OR UPDATE OF status ON public.promocao
  FOR EACH ROW EXECUTE FUNCTION public.notificar_promocao_para_favoritos();

-- -----------------------------------------------------------------------------
-- 7. O LEMBRETE — 24h e 2h antes
-- -----------------------------------------------------------------------------
-- Duas colunas em vez de uma tabela de controle: a pergunta "já mandei?" é do
-- próprio agendamento, e a coluna torna impossível mandar duas vezes mesmo se
-- o job rodar duas vezes no mesmo minuto.
ALTER TABLE public.agendamento
  ADD COLUMN IF NOT EXISTS lembrete_24h_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lembrete_2h_em TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_agendamento_lembrete_pendente
  ON public.agendamento (data_hora)
  WHERE lembrete_2h_em IS NULL AND status IN ('pendente', 'confirmado');

CREATE OR REPLACE FUNCTION public.enviar_lembretes_de_agendamento()
RETURNS TABLE(enviados_24h INTEGER, enviados_2h INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ag RECORD;
  v_24h INTEGER := 0;
  v_2h INTEGER := 0;
  v_quando TEXT;
  v_destinatario UUID;
BEGIN
  -- ---- 24 horas antes ----
  -- A janela é "daqui até 24h", e não "entre 23h e 25h": se o job perder uma
  -- execução, o lembrete sai atrasado em vez de não sair. Só não sai para
  -- agendamento a menos de 3h, porque aí ele não é mais um aviso de véspera --
  -- o de 2h cobre, e a coluna é marcada para não tentar de novo.
  FOR v_ag IN
    SELECT a.id, a.data_hora, a.cliente_id, a.barbearia_id
      FROM agendamento a
     WHERE a.lembrete_24h_em IS NULL
       AND a.status IN ('pendente', 'confirmado')
       AND a.data_hora > now()
       AND a.data_hora <= now() + interval '24 hours'
  LOOP
    SELECT usuario_id INTO v_destinatario FROM cliente WHERE id = v_ag.cliente_id;

    -- Conta só o que virou aviso de verdade. A primeira versão somava mesmo
    -- quando o cliente não tinha conta, e o job devolvia "4 enviados" com 3
    -- notificações no banco -- número de observabilidade que mente é pior do
    -- que nenhum.
    IF v_ag.data_hora > now() + interval '3 hours' AND v_destinatario IS NOT NULL THEN
      SELECT to_char(v_ag.data_hora AT TIME ZONE COALESCE(b.fuso_horario, 'America/Sao_Paulo'),
                     'DD/MM "às" HH24:MI')
        INTO v_quando FROM barbearia b WHERE b.id = v_ag.barbearia_id;

      PERFORM criar_notificacao(
        v_destinatario,
        'Seu corte é amanhã',
        'Você tem horário marcado para ' || v_quando ||
        '. Se não puder ir, cancele para liberar a vaga.',
        'lembrete_24h',
        '/minha-conta/agendamentos'
      );
      v_24h := v_24h + 1;
    END IF;

    UPDATE agendamento SET lembrete_24h_em = now() WHERE id = v_ag.id;
  END LOOP;

  -- ---- 2 horas antes ----
  FOR v_ag IN
    SELECT a.id, a.data_hora, a.cliente_id, a.barbearia_id
      FROM agendamento a
     WHERE a.lembrete_2h_em IS NULL
       AND a.status IN ('pendente', 'confirmado')
       AND a.data_hora > now()
       AND a.data_hora <= now() + interval '2 hours'
  LOOP
    SELECT usuario_id INTO v_destinatario FROM cliente WHERE id = v_ag.cliente_id;

    IF v_destinatario IS NOT NULL THEN
      SELECT to_char(v_ag.data_hora AT TIME ZONE COALESCE(b.fuso_horario, 'America/Sao_Paulo'),
                     'HH24:MI')
        INTO v_quando FROM barbearia b WHERE b.id = v_ag.barbearia_id;

      PERFORM criar_notificacao(
        v_destinatario,
        'Seu horário é hoje às ' || v_quando,
        'Daqui a pouco. Chegue com alguns minutos de antecedência.',
        'lembrete_2h',
        '/minha-conta/agendamentos'
      );
      v_2h := v_2h + 1;
    END IF;

    UPDATE agendamento SET lembrete_2h_em = now() WHERE id = v_ag.id;
  END LOOP;

  RETURN QUERY SELECT v_24h, v_2h;
END $$;

REVOKE ALL ON FUNCTION public.enviar_lembretes_de_agendamento() FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- A cada 15 minutos. O lembrete de 2h tolera esse atraso, e rodar de minuto em
-- minuto varreria a agenda 1440 vezes por dia para nada.
DO $$
BEGIN
  PERFORM cron.unschedule('lembretes_de_agendamento')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'lembretes_de_agendamento');

  PERFORM cron.schedule(
    'lembretes_de_agendamento',
    '*/15 * * * *',
    $cron$SELECT public.enviar_lembretes_de_agendamento()$cron$
  );
END $$;

-- Agendamento que já existe e já passou não deve gerar lembrete retroativo no
-- primeiro ciclo: marca tudo que está fora da janela como já tratado.
UPDATE public.agendamento
   SET lembrete_24h_em = COALESCE(lembrete_24h_em, now()),
       lembrete_2h_em = COALESCE(lembrete_2h_em, now())
 WHERE data_hora <= now();

-- -----------------------------------------------------------------------------
-- VERIFICAÇÃO
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_triggers INTEGER;
  v_job INTEGER;
BEGIN
  SELECT count(*) INTO v_triggers
    FROM pg_trigger t WHERE NOT t.tgisinternal AND t.tgname LIKE 'trg_notificar_%';
  SELECT count(*) INTO v_job FROM cron.job WHERE jobname = 'lembretes_de_agendamento';

  IF v_triggers <> 10 THEN
    RAISE EXCEPTION 'Esperava 10 triggers de notificacao, encontrei %', v_triggers;
  END IF;
  IF v_job <> 1 THEN
    RAISE EXCEPTION 'O job de lembretes nao foi agendado';
  END IF;

  -- Uma assinatura só. Duas tornam ambígua toda chamada de 5 argumentos.
  IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public' AND p.proname = 'criar_notificacao') <> 1 THEN
    RAISE EXCEPTION 'criar_notificacao ficou com mais de uma assinatura';
  END IF;

  RAISE NOTICE 'Avisos: 10 triggers e 1 job de lembrete no lugar';
END $$;
