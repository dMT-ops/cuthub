import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

type Bloqueio = Database['public']['Tables']['bloqueio']['Row'];
type StatusAprovacao = Database['public']['Enums']['status_aprovacao'];

export type { Bloqueio, StatusAprovacao };

export interface BloqueioComProfissional extends Bloqueio {
  profissional: { id: string; nome: string } | null;
}

export interface RequisicaoPendente {
  tipo: 'bloqueio' | 'horario';
  id: string;
  profissionalNome: string;
  descricao: string;
  quando: string;
  criadoEm: string | null;
}

export interface NovaFolga {
  barbeariaId: string;
  profissionalId: string | null;
  inicio: string;
  fim: string;
  motivo: string | null;
  /**
   * `true` quando quem pede é profissional. A RLS já obriga `pendente` no
   * INSERT dele, então mandar `aprovado` daqui só produziria um erro feio —
   * o serviço manda o que o banco aceita.
   */
  comoSolicitacao: boolean;
  solicitadoPor: string | null;
}

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/**
 * Escala: folgas (bloqueio) e jornada, com o fluxo de aprovação da Fase 9.
 *
 * Até aqui `bloqueio` era uma tabela que o app só LIA — a disponibilidade a
 * respeitava e nada no produto a alimentava. Esta é a primeira escrita.
 */
export const escalaService = {
  /** Folgas de um profissional, incluindo as que ainda aguardam resposta. */
  async listarFolgasDoProfissional(profissionalId: string): Promise<Bloqueio[]> {
    const { data, error } = await supabase
      .from('bloqueio')
      .select('*')
      .eq('profissional_id', profissionalId)
      .gte('data_hora_fim', new Date().toISOString())
      .order('data_hora_inicio');

    if (error) throw new Error(`Falha ao listar folgas: ${error.message}`);
    return data;
  },

  async criarFolga(folga: NovaFolga): Promise<Bloqueio> {
    const { data, error } = await supabase
      .from('bloqueio')
      .insert([
        {
          barbearia_id: folga.barbeariaId,
          profissional_id: folga.profissionalId,
          data_hora_inicio: folga.inicio,
          data_hora_fim: folga.fim,
          motivo: folga.motivo,
          status_aprovacao: folga.comoSolicitacao ? 'pendente' : 'aprovado',
          solicitado_por: folga.solicitadoPor,
        },
      ])
      .select()
      .single();

    if (error) {
      if (error.message.includes('row-level security')) {
        throw new Error(
          'Você só pode pedir folga para a sua própria agenda, e ela precisa da aprovação do dono.'
        );
      }
      throw new Error(`Falha ao registrar a folga: ${error.message}`);
    }
    return data;
  },

  /** Retira um pedido ainda pendente. A RLS impede apagar o que já foi aprovado. */
  async cancelarFolga(id: string): Promise<void> {
    const { data, error } = await supabase.from('bloqueio').delete().eq('id', id).select('id');

    if (error) throw new Error(`Falha ao cancelar a folga: ${error.message}`);
    if (!data || data.length === 0) {
      throw new Error('Não foi possível cancelar: a folga já foi aprovada pelo dono.');
    }
  },

  /**
   * Tudo que espera resposta do dono, nas duas tabelas.
   *
   * Duas consultas em vez de uma view: são tabelas com formatos diferentes e
   * a lista é curta por natureza — uma view nova só para juntá-las seria mais
   * schema para manter do que benefício.
   */
  async listarRequisicoesPendentes(barbeariaId: string): Promise<RequisicaoPendente[]> {
    const [bloqueiosRes, horariosRes] = await Promise.all([
      supabase
        .from('bloqueio')
        .select('*, profissional:profissional ( id, nome )')
        .eq('barbearia_id', barbeariaId)
        .eq('status_aprovacao', 'pendente')
        .order('criado_em', { ascending: false }),
      supabase
        .from('horario_trabalho')
        .select('*, profissional:profissional ( id, nome )')
        .eq('barbearia_id', barbeariaId)
        .eq('status_aprovacao', 'pendente')
        .order('criado_em', { ascending: false }),
    ]);

    if (bloqueiosRes.error) throw new Error(`Falha ao listar folgas pendentes: ${bloqueiosRes.error.message}`);
    if (horariosRes.error) throw new Error(`Falha ao listar horários pendentes: ${horariosRes.error.message}`);

    const formatador = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    const folgas: RequisicaoPendente[] = (bloqueiosRes.data as any[]).map((b) => ({
      tipo: 'bloqueio',
      id: b.id,
      profissionalNome: b.profissional?.nome ?? 'Profissional removido',
      descricao: b.motivo ? `Folga — ${b.motivo}` : 'Folga',
      quando: `${formatador.format(new Date(b.data_hora_inicio))} até ${formatador.format(new Date(b.data_hora_fim))}`,
      criadoEm: b.criado_em,
    }));

    const horarios: RequisicaoPendente[] = (horariosRes.data as any[]).map((h) => ({
      tipo: 'horario',
      id: h.id,
      profissionalNome: h.profissional?.nome ?? 'Profissional removido',
      descricao: 'Mudança de jornada',
      quando: `${DIAS[h.dia_semana] ?? h.dia_semana}, ${String(h.hora_inicio).slice(0, 5)} às ${String(h.hora_fim).slice(0, 5)}`,
      criadoEm: h.criado_em,
    }));

    return [...folgas, ...horarios].sort((a, b) =>
      (b.criadoEm ?? '').localeCompare(a.criadoEm ?? '')
    );
  },

  async responderRequisicao(
    tipo: 'bloqueio' | 'horario',
    id: string,
    status: 'aprovado' | 'rejeitado'
  ): Promise<void> {
    const tabela = tipo === 'bloqueio' ? 'bloqueio' : 'horario_trabalho';
    const { data, error } = await supabase
      .from(tabela)
      .update({ status_aprovacao: status })
      .eq('id', id)
      .select('id');

    if (error) throw new Error(`Falha ao responder a requisição: ${error.message}`);
    // Sem linha afetada = a RLS barrou. Dizer "aprovado" sem ter aprovado é
    // pior do que o erro.
    if (!data || data.length === 0) {
      throw new Error('Requisição não encontrada ou fora do seu alcance.');
    }
  },
};
