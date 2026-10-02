-- =============================================================================
-- 00031 — A NOTIFICAÇÃO SABE DE QUAL AGENDAMENTO FALA, E A F14.2
-- =============================================================================
-- Duas coisas, nesta ordem, por decisão do Chefe em 02/10: primeiro o vínculo
-- (`agendamento_id`), depois a F14.2 que o usa. Invertido, cada notificação de
-- remarcação nasceria órfã em potencial e consertar exigiria migration MAIS
-- varredura de dados.
--
-- TRÊS DIVERGÊNCIAS ENTRE A ORDEM DA F14.2 (22/09) E O SCHEMA REAL
--
-- 1. A ordem fala em `data_hora_inicio`. Essa coluna NÃO EXISTE: o início é
--    `data_hora` e o fim é `data_hora_fim` — provavelmente o que causou o
--    lapso. Medido no `information_schema`. É a mesma classe de erro do
--    `transacao_caixa` da F14.1, que também não existia.
--
-- 2. A ordem pede a migration `00030_notificacoes_estendidas.sql`. A `00030`
--    ficou com o caixa do profissional; esta é a `00031`.
--
-- 3. A ordem manda avisar "a contraparte (cliente e/ou barbeiro)", e o padrão
--    existente faz isso mandando para os DOIS — `criar_notificacao` já pula
--    quem agiu. Logo a remarcação produz **uma linha por destinatário**. A
--    Decisão 1 diz "no máximo uma notificação de remarcação viva por
--    agendamento"; lida ao pé da letra, um dos dois ficaria sem aviso.
--    Interpretado como **uma viva por (agendamento, usuário)**, que é a única
--    leitura compatível com a Ordem. Registrado na log para o Chefe corrigir
--    se eu errei a intenção.
--
-- POR QUE `ON DELETE CASCADE`, E NÃO FOI ESCOLHA ESTÉTICA
--
-- A Decisão 1 mandou verificar o cancelamento antes de decidir. Verificado em
-- `src/services/agendamentos.service.ts`: existem OS DOIS caminhos.
--
--   `cancelar()` -> UPDATE status='cancelado', preserva a linha (soft).
--   `excluir()`  -> DELETE FÍSICO da linha, e é alcançável pelo produto
--                   (`useAgendamentos.ts:48`).
--
-- Com o delete físico existindo, o `NO ACTION` padrão faria `excluir()` passar
-- a FALHAR por violação de chave estrangeira em todo agendamento que tivesse
-- notificação de remarcação. Ou seja: sem o CASCADE, esta migration
-- introduziria uma regressão numa função que hoje funciona. O CASCADE é
-- obrigatório, não preferência.
--
-- E porque o cancelamento soft também existe, a regra do soft vai na lógica de
-- mudança de status — `limpar_remarcacao_ao_cancelar`, mais abaixo.
--
-- RLS: CONFERIDO, E A COLUNA NÃO ABRE NADA
--
-- `notificacao` tem RLS ligada e duas policies, as duas por `usuario_id`:
--   notificacao_leitura_do_dono   SELECT  usuario_id = auth.uid()
--   notificacao_marcada_pelo_dono UPDATE  usuario_id = auth.uid()
--
-- Não há policy de INSERT nem de DELETE: quem escreve é `criar_notificacao`,
-- que é SECURITY DEFINER. Isso importa para a regra de substituição — ela TEM
-- de morar em função definer, porque o cliente não consegue apagar nem a
-- própria notificação.
--
-- A coluna nova não abre leitura cruzada: a pessoa só vê as linhas de
-- `notificacao` que são dela, e nelas aparece o id de um agendamento do qual
-- ela já é parte (cliente ou profissional). O id não dá acesso ao agendamento
-- — ler `agendamento` continua passando pela RLS própria dele, que tem suas
-- SELECT policies. Nenhuma policy foi afrouxada aqui.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. O VÍNCULO
-- -----------------------------------------------------------------------------
-- Nullable de propósito: notificação antiga, e notificação que não fala de
-- horário (`escala_respondida`, por exemplo), seguem válidas sem a coluna.
-- SEM BACKFILL a partir do `link_acao` — o legado fica como está.
ALTER TABLE public.notificacao
  ADD COLUMN IF NOT EXISTS agendamento_id UUID NULL
    REFERENCES public.agendamento(id) ON DELETE CASCADE;

-- Índice parcial: a esmagadora maioria das linhas tem a coluna nula (todo o
-- legado), e índice cheio pagaria por elas sem nunca ser consultado por elas.
-- A ordem das colunas segue a consulta de substituição, que filtra pelos três.
CREATE INDEX IF NOT EXISTS notificacao_agendamento_idx
  ON public.notificacao (agendamento_id, usuario_id, tipo)
  WHERE agendamento_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 2. O HELPER PASSA A ACEITAR O VÍNCULO
-- -----------------------------------------------------------------------------
-- O parâmetro novo vai no FIM e com default, para as chamadas existentes (que
-- passam 4, 5 ou 6 argumentos) seguirem funcionando sem alteração.
--
-- MAS O `DROP` ANTES NÃO É OPCIONAL, E ISTO FOI MEDIDO.
--
-- `CREATE OR REPLACE FUNCTION` só substitui quando a assinatura é IDÊNTICA.
-- Número de parâmetros diferente — mesmo que o novo tenha default — cria uma
-- SOBRECARGA. A primeira versão desta migration não tinha o `DROP`, e o bloco
-- de verificação no fim do arquivo reprovou na hora:
--
--   ERROR: criar_notificacao ficou com 6 parametros, esperado 7
--
-- Ficariam as duas funções vivas. A de 6 continuaria atendendo quem passa 6
-- argumentos — escrevendo `agendamento_id` nulo em silêncio — e, pior, toda
-- chamada com 5 argumentos (é o que os gatilhos antigos fazem) viraria
-- AMBÍGUA entre as duas, falhando só em tempo de chamada. Esse é exatamente o
-- modo de falha que o CLAUDE.md registra para patch de função existente.
DROP FUNCTION IF EXISTS public.criar_notificacao(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN);

CREATE OR REPLACE FUNCTION public.criar_notificacao(
  p_usuario_id UUID,
  p_titulo TEXT,
  p_mensagem TEXT,
  p_tipo TEXT DEFAULT 'geral',
  p_link TEXT DEFAULT NULL,
  p_mesmo_para_o_autor BOOLEAN DEFAULT FALSE,
  p_agendamento_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
BEGIN
  IF p_usuario_id IS NULL THEN
    RETURN;
  END IF;

  IF p_usuario_id = auth.uid() AND NOT p_mesmo_para_o_autor THEN
    RETURN;
  END IF;

  INSERT INTO notificacao (usuario_id, titulo, mensagem, tipo, link_acao, agendamento_id)
  VALUES (p_usuario_id, left(p_titulo, 140), p_mensagem, p_tipo, p_link, p_agendamento_id);
END $fn$;

-- -----------------------------------------------------------------------------
-- 3. F14.2 item 1 — HORÁRIO REMARCADO
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notificar_agendamento_remarcado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_usuario_barbeiro UUID;
  v_usuario_cliente UUID;
  v_nome_cliente TEXT;
  v_nome_barbearia TEXT;
  v_quando TEXT;
BEGIN
  -- `data_hora`, e não `data_hora_inicio` — ver a divergência 1 no cabeçalho.
  IF NEW.data_hora IS NOT DISTINCT FROM OLD.data_hora THEN
    RETURN NEW;
  END IF;

  -- A Ordem pede o status `confirmado` permanecendo confirmado. Remarcação de
  -- pendente não avisa, e mudança de status é assunto dos outros gatilhos.
  IF NEW.status <> 'confirmado' OR OLD.status <> 'confirmado' THEN
    RETURN NEW;
  END IF;

  -- SUBSTITUI EM VEZ DE ACUMULAR (regra de produto da Decisão 1).
  -- Apaga as remarcações vivas deste agendamento ANTES de criar a nova. Apagar
  -- as dos dois destinatários, e não só a de quem vai receber agora, é
  -- deliberado: a linha do outro descreve um horário que já não existe, então
  -- ela está obsoleta mesmo que ele não seja avisado desta vez.
  DELETE FROM notificacao
   WHERE agendamento_id = NEW.id
     AND tipo = 'agendamento_remarcado';

  SELECT p.usuario_id INTO v_usuario_barbeiro
    FROM profissional p WHERE p.id = NEW.profissional_id;
  SELECT c.usuario_id, c.nome INTO v_usuario_cliente, v_nome_cliente
    FROM cliente c WHERE c.id = NEW.cliente_id;
  SELECT b.nome, to_char(NEW.data_hora AT TIME ZONE COALESCE(b.fuso_horario, 'America/Sao_Paulo'),
                         'DD/MM "às" HH24:MI')
    INTO v_nome_barbearia, v_quando
    FROM barbearia b WHERE b.id = NEW.barbearia_id;

  -- Mandar para os dois entrega só para a contraparte: `criar_notificacao` pula
  -- quem agiu. Mesmo padrão do `notificar_agendamento_cancelado`.
  PERFORM criar_notificacao(
    v_usuario_barbeiro,
    'Horário remarcado',
    'O horário de ' || COALESCE(v_nome_cliente, 'um cliente') ||
    ' foi remarcado para ' || v_quando || '.',
    'agendamento_remarcado',
    '/dashboard/agenda',
    FALSE,
    NEW.id
  );

  PERFORM criar_notificacao(
    v_usuario_cliente,
    'Horário remarcado',
    'Seu horário em ' || COALESCE(v_nome_barbearia, 'a barbearia') ||
    ' foi remarcado para ' || v_quando || '.',
    'agendamento_remarcado',
    '/minha-conta/agendamentos',
    FALSE,
    NEW.id
  );

  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS trg_notificar_agendamento_remarcado ON public.agendamento;
CREATE TRIGGER trg_notificar_agendamento_remarcado
  AFTER UPDATE ON public.agendamento
  FOR EACH ROW
  EXECUTE FUNCTION public.notificar_agendamento_remarcado();

-- -----------------------------------------------------------------------------
-- 4. O CANCELAMENTO TORNA A REMARCAÇÃO OBSOLETA
-- -----------------------------------------------------------------------------
-- Gatilho separado em vez de emendar `notificar_agendamento_cancelado`: o
-- CLAUDE.md registra duas ocorrências de patch por substituição de string em
-- função existente que passou em silêncio e quebrou em tempo de chamada. Função
-- nova, responsabilidade única, nada reescrito.
--
-- Apaga em vez de marcar obsoleta porque `notificacao` não tem coluna de estado
-- além de `lida`, e o próprio cancelamento já dispara o aviso
-- "Agendamento cancelado", que substitui a informação. Deixar as duas na lista
-- diria ao cliente que o horário mudou E que foi cancelado.
CREATE OR REPLACE FUNCTION public.limpar_remarcacao_ao_cancelar()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
BEGIN
  IF NEW.status = 'cancelado' AND OLD.status <> 'cancelado' THEN
    DELETE FROM notificacao
     WHERE agendamento_id = NEW.id
       AND tipo = 'agendamento_remarcado';
  END IF;

  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS trg_limpar_remarcacao_ao_cancelar ON public.agendamento;
CREATE TRIGGER trg_limpar_remarcacao_ao_cancelar
  AFTER UPDATE ON public.agendamento
  FOR EACH ROW
  EXECUTE FUNCTION public.limpar_remarcacao_ao_cancelar();

-- -----------------------------------------------------------------------------
-- 5. F14.2 item 2 — RESUMO DA AGENDA DE AMANHÃ
-- -----------------------------------------------------------------------------
-- A Ordem pede "um horário razoável, considerando o fuso da barbearia". Um cron
-- único não consegue disparar em fuso diferente por barbearia, então ele roda
-- DE HORA EM HORA e só envia para as barbearias cuja hora LOCAL é 20h. Assim o
-- "final do expediente" é o de cada uma, e não o do servidor.
--
-- A idempotência não precisou de coluna nova: a própria `notificacao` responde
-- se o resumo de hoje já saiu. Isso também torna o job seguro para rodar duas
-- vezes na mesma hora, que é o que aconteceria num restart do cron.
CREATE OR REPLACE FUNCTION public.enviar_resumo_da_agenda_de_amanha()
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
       -- 20h na hora local DELA, não na do servidor.
       AND EXTRACT(HOUR FROM (now() AT TIME ZONE COALESCE(b.fuso_horario, 'America/Sao_Paulo'))) = 20
  LOOP
    v_amanha := ((now() AT TIME ZONE v_prof.fuso)::DATE + 1);

    -- Já mandei hoje? Pergunta à própria notificacao, sem coluna de controle.
    IF EXISTS (
      SELECT 1 FROM notificacao n
       WHERE n.usuario_id = v_prof.usuario_id
         AND n.tipo = 'resumo_agenda_amanha'
         AND (n.criado_em AT TIME ZONE v_prof.fuso)::DATE
             = (now() AT TIME ZONE v_prof.fuso)::DATE
    ) THEN
      CONTINUE;
    END IF;

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

    PERFORM criar_notificacao(
      v_prof.usuario_id,
      'Sua agenda de amanhã',
      'Você tem ' || v_quantos ||
      CASE WHEN v_quantos = 1 THEN ' agendamento amanhã.' ELSE ' agendamentos amanhã.' END,
      'resumo_agenda_amanha',
      '/dashboard/agenda',
      -- O resumo é SOBRE o próprio destinatário, então ele tem de receber mesmo
      -- sendo "o autor" — e num cron `auth.uid()` é nulo de todo modo.
      TRUE
    );
    v_enviados := v_enviados + 1;
  END LOOP;

  RETURN v_enviados;
END $fn$;

REVOKE ALL ON FUNCTION public.enviar_resumo_da_agenda_de_amanha() FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $do$
BEGIN
  PERFORM cron.unschedule('resumo_da_agenda_de_amanha')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'resumo_da_agenda_de_amanha');

  PERFORM cron.schedule(
    'resumo_da_agenda_de_amanha',
    '0 * * * *',
    $cron$SELECT public.enviar_resumo_da_agenda_de_amanha()$cron$
  );
END $do$;

-- -----------------------------------------------------------------------------
-- VERIFICAÇÃO — lê o resultado, não confia no silêncio
-- -----------------------------------------------------------------------------
-- O CLAUDE.md manda: migration que altera função existente termina com uma
-- verificação que LÊ o resultado, porque um `DO` imprime sucesso mesmo quando a
-- mudança não pegou. Aqui o risco concreto é o `criar_notificacao`: se a
-- sobrecarga de 7 parâmetros não tivesse substituído a de 6, os gatilhos novos
-- chamariam a antiga e o `agendamento_id` chegaria nulo em silêncio.
DO $do$
DECLARE
  v_coluna INTEGER;
  v_fk TEXT;
  v_indice INTEGER;
  v_params INTEGER;
  v_versoes INTEGER;
  v_triggers INTEGER;
  v_job INTEGER;
BEGIN
  SELECT count(*) INTO v_coluna FROM information_schema.columns
   WHERE table_name = 'notificacao' AND column_name = 'agendamento_id';
  IF v_coluna <> 1 THEN
    RAISE EXCEPTION 'A coluna notificacao.agendamento_id nao existe';
  END IF;

  SELECT confdeltype INTO v_fk FROM pg_constraint
   WHERE conrelid = 'public.notificacao'::regclass AND contype = 'f'
     AND conkey = ARRAY[(SELECT attnum FROM pg_attribute
                          WHERE attrelid = 'public.notificacao'::regclass
                            AND attname = 'agendamento_id')];
  IF v_fk <> 'c' THEN
    RAISE EXCEPTION 'A FK de agendamento_id nao esta em CASCADE (confdeltype=%); excluir() voltaria a falhar', v_fk;
  END IF;

  SELECT count(*) INTO v_indice FROM pg_indexes
   WHERE tablename = 'notificacao' AND indexname = 'notificacao_agendamento_idx';
  IF v_indice <> 1 THEN
    RAISE EXCEPTION 'O indice notificacao_agendamento_idx nao existe';
  END IF;

  -- Conta as versões, e não o pronargs da primeira: sobrecarga sobrevivente
  -- passaria por uma checagem que só olhasse uma linha. Tem de haver UMA
  -- função com o nome, e ela com 7 parâmetros.
  SELECT count(*) INTO v_versoes FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'criar_notificacao';
  IF v_versoes <> 1 THEN
    RAISE EXCEPTION 'criar_notificacao tem % versoes; sobrecarga torna as chamadas de 5 argumentos ambiguas', v_versoes;
  END IF;

  SELECT pronargs INTO v_params FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'criar_notificacao';
  IF v_params <> 7 THEN
    RAISE EXCEPTION 'criar_notificacao ficou com % parametros, esperado 7 -- o agendamento_id chegaria nulo', v_params;
  END IF;

  SELECT count(*) INTO v_triggers FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
   WHERE NOT t.tgisinternal AND c.relname = 'agendamento'
     AND t.tgname IN ('trg_notificar_agendamento_remarcado', 'trg_limpar_remarcacao_ao_cancelar');
  IF v_triggers <> 2 THEN
    RAISE EXCEPTION 'Esperava 2 gatilhos novos em agendamento, encontrei %', v_triggers;
  END IF;

  SELECT count(*) INTO v_job FROM cron.job WHERE jobname = 'resumo_da_agenda_de_amanha';
  IF v_job <> 1 THEN
    RAISE EXCEPTION 'O job resumo_da_agenda_de_amanha nao ficou agendado';
  END IF;

  RAISE NOTICE '00031 ok: coluna, FK em CASCADE, indice, criar_notificacao com 7 params, 2 gatilhos, 1 job';
END $do$;
