-- =============================================================================
-- 00025 — FLUXO DE APROVAÇÃO DE ESCALA E DEMISSÃO DO PROFISSIONAL
-- =============================================================================
-- Duas regras de RH do Chefe:
--   1. Demitir (inativar) o barbeiro tira o acesso ao painel na hora.
--   2. O barbeiro pede folga e muda a própria escala, mas nasce PENDENTE, e a
--      agenda pública ignora pendência até o dono aprovar.
--
-- O QUE A ORDEM NÃO COBRIA, E QUE QUEBRARIA A REGRA 2
--
-- A F9.2 manda filtrar `status_aprovacao = 'aprovado'` nos serviços do
-- frontend. Só que existem DOIS caminhos de disponibilidade, e o que serve o
-- cliente não passa por lá:
--
--   disponibilidade.service.ts  -> agenda INTERNA (modal do painel)
--   ocupacao_publica (RPC)      -> agenda PÚBLICA, que é a do cliente
--
-- A RPC é SECURITY DEFINER e lê `horario_trabalho` e `bloqueio` direto: nem a
-- RLS nem o filtro do frontend a alcançam. Sem o patch abaixo, a folga não
-- aprovada **bloquearia o cliente de agendar** — exatamente o contrário da
-- regra. Patch dirigido, com verificação no fim, como manda o CLAUDE.md.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_aprovacao') THEN
    CREATE TYPE status_aprovacao AS ENUM ('pendente', 'aprovado', 'rejeitado');
  END IF;
END $$;

-- Default `aprovado` salva o legado: tudo que já existe foi posto pelo dono.
ALTER TABLE public.horario_trabalho
  ADD COLUMN IF NOT EXISTS status_aprovacao status_aprovacao NOT NULL DEFAULT 'aprovado';
ALTER TABLE public.bloqueio
  ADD COLUMN IF NOT EXISTS status_aprovacao status_aprovacao NOT NULL DEFAULT 'aprovado';

-- Quem pediu, para a tela do dono dizer "Vitor solicitou" sem adivinhar pelo
-- profissional_id (num bloqueio da casa ele é nulo).
ALTER TABLE public.horario_trabalho
  ADD COLUMN IF NOT EXISTS solicitado_por UUID REFERENCES public.usuario_perfil(id) ON DELETE SET NULL;
ALTER TABLE public.bloqueio
  ADD COLUMN IF NOT EXISTS solicitado_por UUID REFERENCES public.usuario_perfil(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_horario_pendente
  ON public.horario_trabalho (barbearia_id) WHERE status_aprovacao = 'pendente';
CREATE INDEX IF NOT EXISTS idx_bloqueio_pendente
  ON public.bloqueio (barbearia_id) WHERE status_aprovacao = 'pendente';

-- -----------------------------------------------------------------------------
-- RLS: o profissional escreve a própria escala, sempre como pendente
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_tabela TEXT;
BEGIN
  FOREACH v_tabela IN ARRAY ARRAY['horario_trabalho', 'bloqueio']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_tabela || '_solicitacao_do_profissional', v_tabela);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_tabela || '_revisao_do_profissional', v_tabela);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_tabela || '_retirada_do_profissional', v_tabela);

    -- INSERT: só na própria linha, e só como pendente. `profissional_id` nulo
    -- (bloqueio da casa inteira) não casa com a comparação e fica de fora --
    -- fechar a barbearia continua sendo decisão de gestor.
    EXECUTE format($f$
      CREATE POLICY %I ON public.%I
        FOR INSERT TO authenticated
        WITH CHECK (
          barbearia_id = get_barbearia_do_usuario()
          AND profissional_id = get_profissional_id_do_usuario()
          AND status_aprovacao = 'pendente'
        )
    $f$, v_tabela || '_solicitacao_do_profissional', v_tabela);

    -- UPDATE: mexer na própria escala devolve a linha para a fila de aprovação.
    EXECUTE format($f$
      CREATE POLICY %I ON public.%I
        FOR UPDATE TO authenticated
        USING (
          barbearia_id = get_barbearia_do_usuario()
          AND profissional_id = get_profissional_id_do_usuario()
        )
        WITH CHECK (
          barbearia_id = get_barbearia_do_usuario()
          AND profissional_id = get_profissional_id_do_usuario()
          AND status_aprovacao = 'pendente'
        )
    $f$, v_tabela || '_revisao_do_profissional', v_tabela);

    -- DELETE só do que ainda está pendente. Não estava na ordem, e incluo
    -- porque um pedido que não dá para retirar é beco sem saída: o barbeiro
    -- que errou a data ficaria esperando o dono rejeitar. Não alcança nada
    -- que o dono já aprovou.
    EXECUTE format($f$
      CREATE POLICY %I ON public.%I
        FOR DELETE TO authenticated
        USING (
          barbearia_id = get_barbearia_do_usuario()
          AND profissional_id = get_profissional_id_do_usuario()
          AND status_aprovacao = 'pendente'
        )
    $f$, v_tabela || '_retirada_do_profissional', v_tabela);
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- A AGENDA PÚBLICA IGNORA PENDÊNCIA
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ocupacao_publica(
  p_profissional_id UUID,
  p_dia_semana INTEGER,
  p_inicio TIMESTAMPTZ,
  p_fim TIMESTAMPTZ
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
    AND b.listada_no_catalogo = true
    AND b.status = 'ativo';

  IF v_barbearia_id IS NULL THEN
    RAISE EXCEPTION 'Profissional nao disponivel para agendamento';
  END IF;

  -- `status_aprovacao = 'aprovado'`: escala pedida e nao aprovada nao muda o
  -- que o cliente ve. Regra do Chefe, e o motivo de esta funcao ter entrado na
  -- F9 -- ela nao passa pelos services do frontend.
  SELECT COALESCE(jsonb_agg(jsonb_build_object('hora_inicio', h.hora_inicio, 'hora_fim', h.hora_fim)
                            ORDER BY h.hora_inicio), '[]'::jsonb)
  INTO v_jornada
  FROM horario_trabalho h
  WHERE h.profissional_id = p_profissional_id
    AND h.dia_semana = p_dia_semana
    AND h.ativo = true
    AND h.status_aprovacao = 'aprovado';

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
      AND b.status_aprovacao = 'aprovado'
      AND b.data_hora_inicio < p_fim
      AND b.data_hora_fim > p_inicio
  ) x;

  RETURN jsonb_build_object('jornada', v_jornada, 'ocupados', v_ocupados);
END $$;

-- -----------------------------------------------------------------------------
-- DEMISSÃO E RECONTRATAÇÃO
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sincronizar_perfil_do_profissional()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tipo tipo_usuario;
  v_outras_fichas INTEGER;
BEGIN
  IF NEW.usuario_id IS NULL OR NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT tipo INTO v_tipo FROM usuario_perfil WHERE id = NEW.usuario_id;

  -- DEMISSÃO
  IF OLD.status = 'ativo' AND NEW.status = 'inativo' THEN
    -- Só rebaixa quem É profissional. Um `owner` que também corta cabelo na
    -- própria loja seria transformado em cliente e PERDERIA A PRÓPRIA
    -- BARBEARIA. Mesma guarda da 00024, e aqui o estrago seria maior.
    IF v_tipo <> 'profissional' THEN
      RETURN NEW;
    END IF;

    -- Ele pode trabalhar em outra casa. Rebaixar aqui o expulsaria de lá.
    SELECT count(*) INTO v_outras_fichas
      FROM profissional
     WHERE usuario_id = NEW.usuario_id
       AND id <> NEW.id
       AND status = 'ativo';

    IF v_outras_fichas > 0 THEN
      RETURN NEW;
    END IF;

    PERFORM set_config('app.vinculo_autorizado', 'on', true);
    UPDATE usuario_perfil
       SET tipo = 'cliente', barbearia_id = NULL
     WHERE id = NEW.usuario_id;

  -- RECONTRATAÇÃO
  ELSIF OLD.status = 'inativo' AND NEW.status = 'ativo' THEN
    -- Só promove de volta quem virou cliente. Não mexe em owner nem gerente.
    IF v_tipo <> 'cliente' THEN
      RETURN NEW;
    END IF;

    PERFORM set_config('app.vinculo_autorizado', 'on', true);
    UPDATE usuario_perfil
       SET tipo = 'profissional', barbearia_id = NEW.barbearia_id
     WHERE id = NEW.usuario_id;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sincronizar_perfil_do_profissional ON public.profissional;
CREATE TRIGGER trg_sincronizar_perfil_do_profissional
  AFTER UPDATE OF status ON public.profissional
  FOR EACH ROW EXECUTE FUNCTION public.sincronizar_perfil_do_profissional();

-- -----------------------------------------------------------------------------
-- VERIFICAÇÃO (regra do CLAUDE.md: patch por função termina lendo o resultado)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_def TEXT;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'ocupacao_publica';

  IF v_def NOT ILIKE '%h.status_aprovacao = ''aprovado''%'
     OR v_def NOT ILIKE '%b.status_aprovacao = ''aprovado''%' THEN
    RAISE EXCEPTION 'ocupacao_publica ficou sem o filtro de aprovacao';
  END IF;

  RAISE NOTICE 'ocupacao_publica: filtro de aprovacao confirmado nas duas leituras';
END $$;
