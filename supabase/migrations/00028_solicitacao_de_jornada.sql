-- =============================================================================
-- 00028 — PROPOSTA DE JORNADA SAI DE CIMA DA JORNADA VIGENTE (P0-1)
-- =============================================================================
-- A F10.4 deixou o profissional propor mudança na própria jornada gravando
-- direto em `horario_trabalho` com `status_aprovacao = 'pendente'`. O modelo
-- veio de `bloqueio`, onde funciona — lá a linha **é** a folga, e pendente
-- significa só "ainda não vale". Em `horario_trabalho` a linha é o **estado
-- vigente**, e a diferença passou.
--
-- O ESTRAGO, REPRODUZIDO NO BANCO (auditoria da Fase 12):
--
--   jornada aprovada (segunda 09:00-18:00) ....... 1 faixa valendo
--   barbeiro propoe 11:00 -> vira 'pendente' ..... 0 faixas valendo
--   dono RECUSA -> vira 'rejeitado' .............. 0 faixas valendo
--
-- Ou seja: pedir mudança tirava o barbeiro da agenda pública, e um "não" do
-- dono **destruía a jornada aprovada** — o valor antigo já tinha sido
-- sobrescrito e não voltava.
--
-- A CORREÇÃO NÃO É REMENDO NO UPDATE
--
-- Enquanto a proposta morar na mesma linha, qualquer estado diferente de
-- "aprovado" apaga a faixa da agenda. A proposta passa a viver em tabela
-- própria; `horario_trabalho` volta a ser **só** a jornada em vigor, e a
-- disponibilidade não precisa mais saber que aprovação existe.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.solicitacao_jornada (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbearia_id    UUID NOT NULL REFERENCES public.barbearia(id) ON DELETE CASCADE,
  profissional_id UUID NOT NULL REFERENCES public.profissional(id) ON DELETE CASCADE,

  -- Nulo quando a proposta é de faixa NOVA: ainda não existe linha vigente.
  horario_id      UUID REFERENCES public.horario_trabalho(id) ON DELETE CASCADE,
  operacao        VARCHAR(10) NOT NULL,

  dia_semana      SMALLINT,
  hora_inicio     TIME,
  hora_fim        TIME,

  status          status_aprovacao NOT NULL DEFAULT 'pendente',
  solicitado_por  UUID REFERENCES public.usuario_perfil(id) ON DELETE SET NULL,
  respondido_por  UUID REFERENCES public.usuario_perfil(id) ON DELETE SET NULL,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  respondido_em   TIMESTAMPTZ,

  CONSTRAINT solicitacao_operacao_valida CHECK (operacao IN ('criar', 'alterar', 'remover')),
  CONSTRAINT solicitacao_dia_valido CHECK (dia_semana IS NULL OR dia_semana BETWEEN 0 AND 6),
  -- `criar` e `alterar` precisam dizer qual horário; `remover` só aponta a linha.
  CONSTRAINT solicitacao_tem_horario CHECK (
    (operacao = 'criar'  AND horario_id IS NULL AND dia_semana IS NOT NULL
                          AND hora_inicio IS NOT NULL AND hora_fim IS NOT NULL) OR
    (operacao = 'alterar' AND horario_id IS NOT NULL
                          AND hora_inicio IS NOT NULL AND hora_fim IS NOT NULL) OR
    (operacao = 'remover' AND horario_id IS NOT NULL)
  ),
  CONSTRAINT solicitacao_intervalo_valido CHECK (
    hora_fim IS NULL OR hora_inicio IS NULL OR hora_fim > hora_inicio
  )
);

CREATE INDEX IF NOT EXISTS idx_solicitacao_jornada_pendente
  ON public.solicitacao_jornada (barbearia_id) WHERE status = 'pendente';

ALTER TABLE public.solicitacao_jornada ENABLE ROW LEVEL SECURITY;

-- Leitura: quem é da barbearia. O barbeiro precisa ver o que pediu.
DROP POLICY IF EXISTS "solicitacao_jornada_leitura" ON public.solicitacao_jornada;
CREATE POLICY "solicitacao_jornada_leitura" ON public.solicitacao_jornada
  FOR SELECT TO authenticated
  USING (barbearia_id = get_barbearia_do_usuario() OR is_admin_supremo());

-- O profissional pede só para si, e só como pendente.
DROP POLICY IF EXISTS "solicitacao_jornada_pedido_do_profissional" ON public.solicitacao_jornada;
CREATE POLICY "solicitacao_jornada_pedido_do_profissional" ON public.solicitacao_jornada
  FOR INSERT TO authenticated
  WITH CHECK (
    barbearia_id = get_barbearia_do_usuario()
    AND profissional_id = get_profissional_id_do_usuario()
    AND status = 'pendente'
  );

-- E pode retirar o que ainda não foi respondido.
DROP POLICY IF EXISTS "solicitacao_jornada_retirada" ON public.solicitacao_jornada;
CREATE POLICY "solicitacao_jornada_retirada" ON public.solicitacao_jornada
  FOR DELETE TO authenticated
  USING (
    barbearia_id = get_barbearia_do_usuario()
    AND profissional_id = get_profissional_id_do_usuario()
    AND status = 'pendente'
  );

-- Responder é do gestor.
DROP POLICY IF EXISTS "solicitacao_jornada_resposta_do_gestor" ON public.solicitacao_jornada;
CREATE POLICY "solicitacao_jornada_resposta_do_gestor" ON public.solicitacao_jornada
  FOR UPDATE TO authenticated
  USING (is_admin_supremo() OR (barbearia_id = get_barbearia_do_usuario() AND is_gestor()))
  WITH CHECK (is_admin_supremo() OR (barbearia_id = get_barbearia_do_usuario() AND is_gestor()));

-- -----------------------------------------------------------------------------
-- APLICAR A PROPOSTA — só na aprovação, e numa transação só
-- -----------------------------------------------------------------------------
-- RPC em vez de duas chamadas do app: aprovar e aplicar têm que cair juntos.
-- Se o app marcasse "aprovado" e o UPDATE na jornada falhasse, a fila diria
-- resolvido e a agenda continuaria a antiga.
CREATE OR REPLACE FUNCTION public.responder_solicitacao_jornada(
  p_solicitacao_id UUID,
  p_status TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s RECORD;
BEGIN
  IF p_status NOT IN ('aprovado', 'rejeitado') THEN
    RAISE EXCEPTION 'Resposta invalida: %', p_status;
  END IF;

  SELECT * INTO s FROM solicitacao_jornada WHERE id = p_solicitacao_id FOR UPDATE;

  IF s.id IS NULL THEN
    RAISE EXCEPTION 'Solicitacao nao encontrada';
  END IF;

  IF NOT (is_admin_supremo() OR (s.barbearia_id = get_barbearia_do_usuario() AND is_gestor())) THEN
    RAISE EXCEPTION 'Apenas a gestao da barbearia responde solicitacoes';
  END IF;

  -- Trava contra decisão concorrente: duas abas abertas não se sobrescrevem
  -- em silêncio (era o P1-3 da auditoria, na outra tabela).
  IF s.status <> 'pendente' THEN
    RAISE EXCEPTION 'Esta solicitacao ja foi respondida: %', s.status;
  END IF;

  UPDATE solicitacao_jornada
     SET status = p_status::status_aprovacao,
         respondido_por = auth.uid(),
         respondido_em = now()
   WHERE id = p_solicitacao_id;

  -- Recusar é NO-OP na jornada. Era exatamente isso que faltava: antes, o
  -- "não" deixava a faixa alterada e fora do ar.
  IF p_status = 'rejeitado' THEN
    RETURN;
  END IF;

  IF s.operacao = 'criar' THEN
    INSERT INTO horario_trabalho (barbearia_id, profissional_id, dia_semana, hora_inicio, hora_fim, ativo, status_aprovacao)
    VALUES (s.barbearia_id, s.profissional_id, s.dia_semana, s.hora_inicio, s.hora_fim, true, 'aprovado');

  ELSIF s.operacao = 'alterar' THEN
    UPDATE horario_trabalho
       SET hora_inicio = s.hora_inicio,
           hora_fim = s.hora_fim,
           ativo = true,
           status_aprovacao = 'aprovado'
     WHERE id = s.horario_id;

  ELSIF s.operacao = 'remover' THEN
    DELETE FROM horario_trabalho WHERE id = s.horario_id;
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.responder_solicitacao_jornada(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.responder_solicitacao_jornada(UUID, TEXT) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- `horario_trabalho` VOLTA A SER SÓ O QUE VIGORA
-- -----------------------------------------------------------------------------
-- As policies da F9 que deixavam o profissional escrever direto aqui são a
-- causa do P0-1. Saem: ele agora escreve em `solicitacao_jornada`.
DROP POLICY IF EXISTS "horario_trabalho_solicitacao_do_profissional" ON public.horario_trabalho;
DROP POLICY IF EXISTS "horario_trabalho_revisao_do_profissional" ON public.horario_trabalho;
DROP POLICY IF EXISTS "horario_trabalho_retirada_do_profissional" ON public.horario_trabalho;

-- Qualquer resíduo de pendente/rejeitado vira vigente: a tabela não guarda
-- mais proposta, e linha invisível por status seria jornada perdida.
UPDATE public.horario_trabalho SET status_aprovacao = 'aprovado' WHERE status_aprovacao <> 'aprovado';

-- O trigger de resposta de escala continua valendo para `bloqueio`, onde o
-- modelo está certo. Em `horario_trabalho` ele não tem mais o que observar.
DROP TRIGGER IF EXISTS trg_notificar_resposta_horario ON public.horario_trabalho;
DROP TRIGGER IF EXISTS trg_notificar_pedido_horario ON public.horario_trabalho;

-- -----------------------------------------------------------------------------
-- AVISOS DA NOVA TABELA
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notificar_pedido_de_jornada()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gestor RECORD;
  v_nome TEXT;
BEGIN
  SELECT nome INTO v_nome FROM profissional WHERE id = NEW.profissional_id;

  FOR v_gestor IN
    SELECT id FROM usuario_perfil
     WHERE barbearia_id = NEW.barbearia_id AND tipo IN ('owner', 'gerente')
  LOOP
    PERFORM criar_notificacao(
      v_gestor.id,
      'Pedido de jornada aguardando',
      COALESCE(v_nome, 'Um profissional') || ' quer ' ||
      CASE NEW.operacao
        WHEN 'criar' THEN 'incluir um horário'
        WHEN 'alterar' THEN 'mudar um horário'
        ELSE 'remover um horário'
      END || '. A agenda atual dele continua valendo até você responder.',
      'jornada_pedida',
      '/dashboard'
    );
  END LOOP;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notificar_pedido_de_jornada ON public.solicitacao_jornada;
CREATE TRIGGER trg_notificar_pedido_de_jornada
  AFTER INSERT ON public.solicitacao_jornada
  FOR EACH ROW EXECUTE FUNCTION public.notificar_pedido_de_jornada();

CREATE OR REPLACE FUNCTION public.notificar_resposta_de_jornada()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario UUID;
BEGIN
  IF NEW.status = OLD.status OR NEW.status = 'pendente' THEN
    RETURN NEW;
  END IF;

  SELECT usuario_id INTO v_usuario FROM profissional WHERE id = NEW.profissional_id;

  PERFORM criar_notificacao(
    v_usuario,
    'Sua mudança de jornada foi ' || CASE NEW.status WHEN 'aprovado' THEN 'aprovada' ELSE 'recusada' END,
    CASE NEW.status
      WHEN 'aprovado' THEN 'A sua agenda já reflete o novo horário.'
      ELSE 'A sua agenda continua exatamente como estava.'
    END,
    'jornada_respondida',
    '/dashboard/agenda'
  );

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notificar_resposta_de_jornada ON public.solicitacao_jornada;
CREATE TRIGGER trg_notificar_resposta_de_jornada
  AFTER UPDATE OF status ON public.solicitacao_jornada
  FOR EACH ROW EXECUTE FUNCTION public.notificar_resposta_de_jornada();

-- -----------------------------------------------------------------------------
-- P1-2 — lembrete não sai para barbearia suspensa
-- -----------------------------------------------------------------------------
-- O kill switch da Fase 7 tira do catálogo e barra agendamento novo, mas não
-- cancela o que já estava marcado. O job mandava "seu corte é amanhã" para
-- atendimento de uma barbearia fora do ar.
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
        '/minha-conta/agendamentos'
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
        '/minha-conta/agendamentos'
      );
      v_2h := v_2h + 1;
    END IF;

    UPDATE agendamento SET lembrete_2h_em = now() WHERE id = v_ag.id;
  END LOOP;

  RETURN QUERY SELECT v_24h, v_2h;
END $$;

REVOKE ALL ON FUNCTION public.enviar_lembretes_de_agendamento() FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- P1-1 — remarcar limpa os lembretes já enviados
-- -----------------------------------------------------------------------------
-- Sem isto, mover um horário de terça para sexta não gera lembrete novo — e o
-- cliente já recebeu um aviso para a data velha.
CREATE OR REPLACE FUNCTION public.limpar_lembretes_ao_remarcar()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.data_hora IS DISTINCT FROM OLD.data_hora THEN
    NEW.lembrete_24h_em := NULL;
    NEW.lembrete_2h_em := NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_limpar_lembretes_ao_remarcar ON public.agendamento;
CREATE TRIGGER trg_limpar_lembretes_ao_remarcar
  BEFORE UPDATE OF data_hora ON public.agendamento
  FOR EACH ROW EXECUTE FUNCTION public.limpar_lembretes_ao_remarcar();

-- -----------------------------------------------------------------------------
-- VERIFICAÇÃO
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM horario_trabalho WHERE status_aprovacao <> 'aprovado') THEN
    RAISE EXCEPTION 'Sobrou jornada fora de "aprovado" apos a migracao';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
     WHERE tablename = 'horario_trabalho' AND policyname LIKE '%_do_profissional'
  ) THEN
    RAISE EXCEPTION 'As policies de escrita direta do profissional ainda existem';
  END IF;

  RAISE NOTICE 'P0-1 fechado: proposta de jornada vive em solicitacao_jornada';
END $$;
