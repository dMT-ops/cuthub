import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

type Auditoria = Database['public']['Tables']['auditoria_plataforma']['Row'];

export type StatusTenant = 'ativo' | 'suspenso';

export interface BarbeariaNaPlataforma {
  id: string;
  nome: string;
  slug: string | null;
  cidade: string | null;
  estado: string | null;
  status: StatusTenant;
  listadaNoCatalogo: boolean;
  criadoEm: string | null;
  donos: string[];
}

export interface MetricasDaPlataforma {
  barbeariasAtivas: number;
  barbeariasSuspensas: number;
  usuariosPorTipo: Record<string, number>;
  usuariosSuspensos: number;
  agendamentosNoMes: number;
  agendamentosTotais: number;
}

export interface RegistroDeAuditoria extends Auditoria {
  adminEmail: string | null;
}

/**
 * Consultas globais do console da plataforma.
 *
 * Não há filtro de tenant aqui de propósito: as policies já trazem
 * `OR is_admin_supremo()`, então o admin enxerga tudo pela própria RLS. Quem
 * não é admin recebe zero linhas nas mesmas consultas — o serviço não é o que
 * protege, e não deve parecer que é.
 */
export const adminService = {
  async listarBarbearias(): Promise<BarbeariaNaPlataforma[]> {
    const [barbeariasRes, perfisRes] = await Promise.all([
      supabase
        .from('barbearia')
        .select('id, nome, slug, cidade, estado, status, listada_no_catalogo, criado_em')
        .order('criado_em', { ascending: false }),
      supabase.from('usuario_perfil').select('barbearia_id, nome, tipo').eq('tipo', 'owner'),
    ]);

    if (barbeariasRes.error) {
      throw new Error(`Falha ao listar barbearias: ${barbeariasRes.error.message}`);
    }
    if (perfisRes.error) {
      throw new Error(`Falha ao listar donos: ${perfisRes.error.message}`);
    }

    const donosPorBarbearia = new Map<string, string[]>();
    for (const perfil of perfisRes.data) {
      if (!perfil.barbearia_id) continue;
      const atual = donosPorBarbearia.get(perfil.barbearia_id) ?? [];
      atual.push(perfil.nome);
      donosPorBarbearia.set(perfil.barbearia_id, atual);
    }

    return barbeariasRes.data.map((b) => ({
      id: b.id,
      nome: b.nome,
      slug: b.slug,
      cidade: b.cidade,
      estado: b.estado,
      status: (b.status as StatusTenant) ?? 'ativo',
      listadaNoCatalogo: b.listada_no_catalogo ?? false,
      criadoEm: b.criado_em,
      donos: donosPorBarbearia.get(b.id) ?? [],
    }));
  },

  async metricas(): Promise<MetricasDaPlataforma> {
    const inicioDoMes = new Date();
    inicioDoMes.setDate(1);
    inicioDoMes.setHours(0, 0, 0, 0);

    const [barbeariasRes, perfisRes, agendamentosMesRes, agendamentosTotaisRes] = await Promise.all([
      supabase.from('barbearia').select('status'),
      supabase.from('usuario_perfil').select('tipo, status'),
      supabase
        .from('agendamento')
        .select('id', { count: 'exact', head: true })
        .gte('data_hora', inicioDoMes.toISOString()),
      supabase.from('agendamento').select('id', { count: 'exact', head: true }),
    ]);

    if (barbeariasRes.error) throw new Error(`Falha nas métricas: ${barbeariasRes.error.message}`);
    if (perfisRes.error) throw new Error(`Falha nas métricas: ${perfisRes.error.message}`);

    const usuariosPorTipo: Record<string, number> = {};
    let usuariosSuspensos = 0;
    for (const perfil of perfisRes.data) {
      usuariosPorTipo[perfil.tipo] = (usuariosPorTipo[perfil.tipo] ?? 0) + 1;
      if (perfil.status === 'suspenso') usuariosSuspensos += 1;
    }

    return {
      barbeariasAtivas: barbeariasRes.data.filter((b) => b.status !== 'suspenso').length,
      barbeariasSuspensas: barbeariasRes.data.filter((b) => b.status === 'suspenso').length,
      usuariosPorTipo,
      usuariosSuspensos,
      agendamentosNoMes: agendamentosMesRes.count ?? 0,
      agendamentosTotais: agendamentosTotaisRes.count ?? 0,
    };
  },

  /**
   * Suspende ou reativa um tenant.
   *
   * Vai por RPC, e não por UPDATE direto, por dois motivos medidos: o banco
   * BLOQUEIA o UPDATE de `status` fora dela (trigger da migration 00021), e a
   * RPC grava a auditoria na mesma transação — não existe suspensão sem
   * registro nem registro sem suspensão.
   */
  async definirStatusDaBarbearia(barbeariaId: string, status: StatusTenant, motivo?: string) {
    const { error } = await supabase.rpc('admin_definir_status_barbearia', {
      p_barbearia_id: barbeariaId,
      p_status: status,
      p_motivo: motivo ?? undefined,
    });
    if (error) throw new Error(error.message);
  },

  async definirStatusDoUsuario(usuarioId: string, status: StatusTenant, motivo?: string) {
    const { error } = await supabase.rpc('admin_definir_status_usuario', {
      p_usuario_id: usuarioId,
      p_status: status,
      p_motivo: motivo ?? undefined,
    });
    if (error) throw new Error(error.message);
  },

  async listarAuditoria(limite = 100): Promise<RegistroDeAuditoria[]> {
    const { data, error } = await supabase
      .from('auditoria_plataforma')
      .select('*')
      .order('criado_em', { ascending: false })
      .limit(limite);

    if (error) throw new Error(`Falha ao ler a auditoria: ${error.message}`);

    // `auth.users` não é legível pelo app; o nome de quem agiu sai do perfil.
    const ids = [...new Set(data.map((l) => l.admin_id).filter(Boolean))] as string[];
    if (ids.length === 0) return data.map((l) => ({ ...l, adminEmail: null }));

    const { data: perfis } = await supabase
      .from('usuario_perfil')
      .select('id, nome')
      .in('id', ids);

    const nomePorId = new Map((perfis ?? []).map((p) => [p.id, p.nome]));
    return data.map((l) => ({
      ...l,
      adminEmail: l.admin_id ? (nomePorId.get(l.admin_id) ?? null) : null,
    }));
  },
};
