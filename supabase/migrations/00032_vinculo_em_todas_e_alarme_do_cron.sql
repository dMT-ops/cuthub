-- =============================================================================
-- 00032 — O VÍNCULO VALE PARA TODAS AS NOTIFICAÇÕES DE AGENDAMENTO,
--         O RESUMO FICA TESTÁVEL, E O CRON GANHA ALARME
-- =============================================================================
-- Três coisas que o `/start` de 05/10 achou cruzando a entrega de 02/10 com o
-- banco. Nenhuma é pedido novo: são buracos do que já foi entregue.
--
-- 1. O `agendamento_id` da 00031 era preenchido por 1 de 6 produtores de
--    notificação ligados a agendamento. Medido:
--
--      agendamento_remarcado  -> passa NEW.id
--      agendamento_criado     -> NULL   (4 linhas no banco, todas sem vínculo)
--      reserva_confirmada     -> NULL
--      agendamento_cancelado  -> NULL
--      cliente_faltou         -> NULL   (3 linhas)
--      lembrete_24h / _2h     -> NULL   (9 + 9 linhas)
--
--    Com isso o `ON DELETE CASCADE` só limpava as remarcações: apagar um
--    agendamento deixava as outras cinco apontando para o nada pelo `link_acao`,
--    que é exatamente o defeito que a 00031 existiu para fechar. A coluna estava
--    1/6 realizada.
--
-- 2. **O corpo de envio do resumo da agenda NUNCA executou** — nem em produção
--    nem em teste. O job rodou 65 vezes com 0 falhas entre 02/10 e 05/10, mas só
--    3 dessas caíram na hora 20 local, e nas três não havia agendamento elegível
--    para o dia seguinte (conferido: os confirmados de 05/10 foram criados no
--    próprio dia 05, às 09:02 e 09:03). O silêncio estava CORRETO, e é justamente
--    isso que esconde o risco: código em produção com o caminho principal
--    inexercitado.
--
--    A causa de não haver teste é de desenho, e é minha: a função lia `now()`
--    direto, então só era exercível esperando as 20h. Aqui ela passa a receber
--    `p_agora` com default `now()` — o cron segue chamando sem argumento e o
--    teste escolhe a hora. **Horário não é dado de ambiente, é entrada.**
--
-- 3. Os jobs do `pg_cron` não tinham quem avisasse na primeira falha. Hoje são
--    dois, com 1.227 + 65 execuções e 0 falhas — ou seja, o alarme nasce sem
--    nada para dizer, que é a hora certa de nascer. O `supabase_vector` é a
--    prova do custo de não ter: ele reinicia desde 11/09 saindo com **exit 0**,
--    e ninguém viu por três semanas.
--
-- COMO AS CINCO FUNÇÕES FORAM REESCRITAS, E POR QUE ISSO IMPORTA
--
-- O `CLAUDE.md` proíbe patch por substituição de string sobre
-- `pg_get_functiondef` dentro de `DO` — o bloco imprime sucesso mesmo quando a
-- substituição não casa, e já custou duas ocorrências neste projeto. Então a
-- edição foi feita **no momento de escrever a migration**, por script, e o
-- resultado conferido por `diff` contra a definição que estava no banco: as
-- únicas linhas alteradas são os argumentos acrescentados.
--
-- O script errou duas vezes antes de acertar, e as duas valem registro porque
-- quem repetir vai cair nelas:
--
--   - contar vírgulas para descobrir quantos argumentos a chamada tem erra
--     dentro de **comentário** (prosa tem vírgula) e dentro de **string** — foi
--     uma vírgula na mensagem do lembrete de 24h ("Se não puder ir, cancele
--     para liberar a vaga") que fez contar 6 argumentos onde havia 5. Com 6, o
--     `v_ag.id` cairia na posição do booleano `p_mesmo_para_o_autor`.
--   - a indentação do fecha-parênteses tem de vir da original, não de palpite.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. AS CINCO FUNÇÕES QUE PASSAM A LEVAR O VÍNCULO
-- -----------------------------------------------------------------------------
-- Corpos idênticos aos do banco, com `FALSE, <id>` (ou só `<id>` onde o
-- booleano já era explícito) acrescentado em cada `criar_notificacao`.


-- ----------------------------------------------------------------------------
-- notificar_agendamento_criado
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notificar_agendamento_criado()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    '/dashboard/agenda',
    FALSE,
    NEW.id   -- p_agendamento_id, novo em 00032
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
    '/minha-conta/agendamentos',
    FALSE,
    NEW.id   -- p_agendamento_id, novo em 00032
  );

  RETURN NEW;
END $function$;


-- ----------------------------------------------------------------------------
-- notificar_reserva_confirmada
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notificar_reserva_confirmada()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    '/minha-conta/agendamentos',
    FALSE,
    NEW.id   -- p_agendamento_id, novo em 00032
  );

  RETURN NEW;
END $function$;


-- ----------------------------------------------------------------------------
-- notificar_agendamento_cancelado
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notificar_agendamento_cancelado()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    '/dashboard/agenda',
    FALSE,
    NEW.id   -- p_agendamento_id, novo em 00032
  );

  PERFORM criar_notificacao(
    v_usuario_cliente,
    'Agendamento cancelado',
    'Seu horário em ' || COALESCE(v_nome_barbearia, 'a barbearia') || ' (' || v_quando || ') foi cancelado.',
    'agendamento_cancelado',
    '/minha-conta/agendamentos',
    FALSE,
    NEW.id   -- p_agendamento_id, novo em 00032
  );

  RETURN NEW;
END $function$;


-- ----------------------------------------------------------------------------
-- notificar_falta_do_cliente
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notificar_falta_do_cliente()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      true,
      NEW.id   -- p_agendamento_id, novo em 00032
    );
  END LOOP;

  RETURN NEW;
END $function$;


-- ----------------------------------------------------------------------------
-- enviar_lembretes_de_agendamento
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enviar_lembretes_de_agendamento()
 RETURNS TABLE(enviados_24h integer, enviados_2h integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ag RECORD;
  v_24h INTEGER := 0;
  v_2h INTEGER := 0;
  v_quando TEXT;
  v_destinatario UUID;
BEGIN
  FOR v_ag IN
    SELECT a.id, a.data_hora, a.cliente_id, a.barbearia_id
      FROM agendamento a
      JOIN barbearia b ON b.id = a.barbearia_id
     WHERE a.lembrete_24h_em IS NULL
       AND a.status IN ('pendente', 'confirmado')
       AND b.status = 'ativo'
       AND a.data_hora > now()
       AND a.data_hora <= now() + interval '24 hours'
  LOOP
    SELECT usuario_id INTO v_destinatario FROM cliente WHERE id = v_ag.cliente_id;

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
        '/minha-conta/agendamentos',
        FALSE,
        v_ag.id   -- p_agendamento_id, novo em 00032
      );
      v_24h := v_24h + 1;
    END IF;

    UPDATE agendamento SET lembrete_24h_em = now() WHERE id = v_ag.id;
  END LOOP;

  FOR v_ag IN
    SELECT a.id, a.data_hora, a.cliente_id, a.barbearia_id
      FROM agendamento a
      JOIN barbearia b ON b.id = a.barbearia_id
     WHERE a.lembrete_2h_em IS NULL
       AND a.status IN ('pendente', 'confirmado')
       AND b.status = 'ativo'
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
        '/minha-conta/agendamentos',
        FALSE,
        v_ag.id   -- p_agendamento_id, novo em 00032
      );
      v_2h := v_2h + 1;
    END IF;

    UPDATE agendamento SET lembrete_2h_em = now() WHERE id = v_ag.id;
  END LOOP;

  RETURN QUERY SELECT v_24h, v_2h;
END $function$;


-- -----------------------------------------------------------------------------
-- 2. O RESUMO DA AGENDA PASSA A RECEBER A HORA
-- -----------------------------------------------------------------------------
-- `DROP` antes porque mudar a aridade de `()` para `(timestamptz)` cria
-- SOBRECARGA, não substituição — a lição que a verificação da 00031 pegou. Com
-- as duas vivas, a chamada do cron (sem argumento) ficaria ambígua.
DROP FUNCTION IF EXISTS public.enviar_resumo_da_agenda_de_amanha();

CREATE OR REPLACE FUNCTION public.enviar_resumo_da_agenda_de_amanha(
  p_agora TIMESTAMPTZ DEFAULT now()
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_prof RECORD;
  v_enviados INTEGER := 0;
  v_quantos INTEGER;
  v_amanha DATE;
BEGIN
  FOR v_prof IN
    SELECT p.id, p.usuario_id,
           COALESCE(b.fuso_horario, 'America/Sao_Paulo') AS fuso
      FROM profissional p
      JOIN barbearia b ON b.id = p.barbearia_id
     WHERE p.status = 'ativo'
       AND b.status = 'ativo'
       AND p.usuario_id IS NOT NULL
       -- 20h na hora local DELA, não na do servidor. Um cron só não dispara em
       -- fuso por barbearia, então ele roda de hora em hora e filtra aqui.
       AND EXTRACT(HOUR FROM (p_agora AT TIME ZONE COALESCE(b.fuso_horario, 'America/Sao_Paulo'))) = 20
  LOOP
    v_amanha := ((p_agora AT TIME ZONE v_prof.fuso)::DATE + 1);

    -- Já mandei hoje? Pergunta à própria notificacao, sem coluna de controle.
    -- Isso também torna o job seguro para rodar duas vezes na mesma hora.
    IF EXISTS (
      SELECT 1 FROM notificacao n
       WHERE n.usuario_id = v_prof.usuario_id
         AND n.tipo = 'resumo_agenda_amanha'
         AND (n.criado_em AT TIME ZONE v_prof.fuso)::DATE
             = (p_agora AT TIME ZONE v_prof.fuso)::DATE
    ) THEN
      CONTINUE;
    END IF;

    -- `em_atendimento`, `concluido`, `cancelado` e `faltou` ficam fora, e isso
    -- foi revisado em 05/10: o resumo fala do dia seguinte, e nenhum desses
    -- descreve um horário que ainda vai acontecer amanhã.
    SELECT count(*) INTO v_quantos
      FROM agendamento a
     WHERE a.profissional_id = v_prof.id
       AND a.status IN ('pendente', 'confirmado')
       AND (a.data_hora AT TIME ZONE v_prof.fuso)::DATE = v_amanha;

    -- Agenda vazia não gera aviso: "você tem 0 agendamentos amanhã" é ruído
    -- diário para quem está de folga, e ruído diário faz desligar o sino.
    IF v_quantos = 0 THEN
      CONTINUE;
    END IF;

    -- Sem `agendamento_id`: o resumo fala de N agendamentos, não de um. Vincular
    -- a um deles seria arbitrário, e o CASCADE apagaria o resumo inteiro quando
    -- esse um fosse excluído.
    PERFORM criar_notificacao(
      v_prof.usuario_id,
      'Sua agenda de amanhã',
      'Você tem ' || v_quantos ||
      CASE WHEN v_quantos = 1 THEN ' agendamento amanhã.' ELSE ' agendamentos amanhã.' END,
      'resumo_agenda_amanha',
      '/dashboard/agenda',
      -- O resumo é SOBRE o próprio destinatário, então ele recebe mesmo sendo
      -- "o autor" — e num cron `auth.uid()` é nulo de todo modo.
      TRUE
    );
    v_enviados := v_enviados + 1;
  END LOOP;

  RETURN v_enviados;
END $fn$;

REVOKE ALL ON FUNCTION public.enviar_resumo_da_agenda_de_amanha(TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. ALARME PARA OS JOBS DO pg_cron
-- -----------------------------------------------------------------------------
-- Uma linha só, com o último `runid` já examinado. Marcador explícito em vez de
-- "falhas na última hora": janela de tempo perde falha se o alarme atrasar, e
-- repete aviso se ele adiantar.
CREATE TABLE IF NOT EXISTS public.cron_alarme_estado (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  ultimo_runid BIGINT NOT NULL DEFAULT 0,
  verificado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.cron_alarme_estado (id) VALUES (TRUE) ON CONFLICT (id) DO NOTHING;

-- RLS ligada e NENHUMA policy: é estado interno do alarme, e ninguém pelo
-- cliente tem o que fazer aqui. Quem escreve é a função, que é SECURITY
-- DEFINER. Tabela sem RLS neste projeto é apontada pelos advisors e,
-- pior, seria legível por qualquer `authenticated`.
ALTER TABLE public.cron_alarme_estado ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.verificar_falhas_do_cron()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_ultimo BIGINT;
  v_maior BIGINT;
  v_falha RECORD;
  v_admin RECORD;
  v_avisos INTEGER := 0;
BEGIN
  SELECT ultimo_runid INTO v_ultimo FROM cron_alarme_estado WHERE id;

  SELECT max(runid) INTO v_maior FROM cron.job_run_details;
  IF v_maior IS NULL THEN
    RETURN 0;
  END IF;

  FOR v_falha IN
    SELECT d.runid, j.jobname, d.status,
           left(COALESCE(d.return_message, '(sem mensagem)'), 180) AS msg,
           d.start_time
      FROM cron.job_run_details d
      JOIN cron.job j ON j.jobid = d.jobid
     WHERE d.runid > v_ultimo
       -- `running` e `sending` são estados de passagem, não falha.
       AND d.status NOT IN ('succeeded', 'running', 'sending', 'starting')
     ORDER BY d.runid
  LOOP
    FOR v_admin IN
      SELECT id FROM usuario_perfil WHERE tipo = 'admin_supremo' AND status = 'ativo'
    LOOP
      PERFORM criar_notificacao(
        v_admin.id,
        'Job do banco falhou: ' || v_falha.jobname,
        'A execução de ' ||
        to_char(v_falha.start_time AT TIME ZONE 'America/Sao_Paulo', 'DD/MM "às" HH24:MI') ||
        ' terminou em "' || v_falha.status || '". ' || v_falha.msg,
        'alarme_cron',
        '/admin/auditoria',
        -- Vai para o autor também: num cron não há autor, e o admin tem de
        -- receber mesmo que por acaso seja ele quem disparou algo.
        TRUE
      );
      v_avisos := v_avisos + 1;
    END LOOP;
  END LOOP;

  -- Avança o marcador até o maior runid VISTO, e não até o da última falha:
  -- senão as execuções bem-sucedidas seriam relidas para sempre.
  UPDATE cron_alarme_estado
     SET ultimo_runid = v_maior, verificado_em = now()
   WHERE id;

  RETURN v_avisos;
END $fn$;

REVOKE ALL ON FUNCTION public.verificar_falhas_do_cron() FROM PUBLIC, anon, authenticated;

-- Começa do presente: as 1.292 execuções que já existem são todas
-- `succeeded`, mas se amanhã alguém restaurar um dump antigo o alarme não deve
-- despejar histórico no sino do admin.
UPDATE public.cron_alarme_estado
   SET ultimo_runid = COALESCE((SELECT max(runid) FROM cron.job_run_details), 0)
 WHERE id;

DO $do$
BEGIN
  PERFORM cron.unschedule('alarme_de_falhas_do_cron')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'alarme_de_falhas_do_cron');

  PERFORM cron.schedule(
    'alarme_de_falhas_do_cron',
    '*/15 * * * *',
    $cron$SELECT public.verificar_falhas_do_cron()$cron$
  );
END $do$;

-- -----------------------------------------------------------------------------
-- VERIFICAÇÃO — lê o resultado, não confia no silêncio
-- -----------------------------------------------------------------------------
DO $do$
DECLARE
  v_sem_vinculo TEXT;
  v_resumo_versoes INTEGER;
  v_resumo_args INTEGER;
  v_jobs INTEGER;
  v_rls BOOLEAN;
BEGIN
  -- Toda função que chama `criar_notificacao` por causa de um agendamento TEM
  -- de passar o id. Checagem por conteúdo da definição, porque é o único jeito
  -- de provar que a reescrita pegou nas cinco.
  SELECT string_agg(p.proname, ', ' ORDER BY p.proname) INTO v_sem_vinculo
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname IN ('notificar_agendamento_criado', 'notificar_reserva_confirmada',
                       'notificar_agendamento_cancelado', 'notificar_falta_do_cliente',
                       'notificar_agendamento_remarcado', 'enviar_lembretes_de_agendamento')
     AND pg_get_functiondef(p.oid) NOT LIKE '%p_agendamento_id%'
     AND pg_get_functiondef(p.oid) NOT LIKE '%NEW.id%'
     AND pg_get_functiondef(p.oid) NOT LIKE '%v_ag.id%';
  IF v_sem_vinculo IS NOT NULL THEN
    RAISE EXCEPTION 'Estas funcoes nao passam o agendamento_id: %', v_sem_vinculo;
  END IF;

  SELECT count(*), max(pronargs) INTO v_resumo_versoes, v_resumo_args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'enviar_resumo_da_agenda_de_amanha';
  IF v_resumo_versoes <> 1 THEN
    RAISE EXCEPTION 'enviar_resumo_da_agenda_de_amanha tem % versoes; a chamada do cron ficaria ambigua', v_resumo_versoes;
  END IF;
  IF v_resumo_args <> 1 THEN
    RAISE EXCEPTION 'enviar_resumo_da_agenda_de_amanha ficou com % parametros, esperado 1 (p_agora)', v_resumo_args;
  END IF;

  SELECT relrowsecurity INTO v_rls FROM pg_class WHERE relname = 'cron_alarme_estado';
  IF NOT v_rls THEN
    RAISE EXCEPTION 'cron_alarme_estado ficou sem RLS; qualquer authenticated leria o estado do alarme';
  END IF;

  SELECT count(*) INTO v_jobs FROM cron.job
   WHERE jobname IN ('lembretes_de_agendamento', 'resumo_da_agenda_de_amanha', 'alarme_de_falhas_do_cron');
  IF v_jobs <> 3 THEN
    RAISE EXCEPTION 'Esperava 3 jobs agendados, encontrei %', v_jobs;
  END IF;

  RAISE NOTICE '00032 ok: 6 produtores levam o vinculo, resumo com p_agora, alarme com RLS, 3 jobs';
END $do$;
