import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

export type HorarioTrabalho = Database['public']['Tables']['horario_trabalho']['Row'];
export type HorarioTrabalhoInsert = Database['public']['Tables']['horario_trabalho']['Insert'];

export const horariosService = {
  async obterJornada(profissionalId: string): Promise<HorarioTrabalho[]> {
    const { data, error } = await supabase
      .from('horario_trabalho')
      .select('*')
      .eq('profissional_id', profissionalId)
      .order('dia_semana')
      .order('hora_inicio');

    if (error) throw new Error(`Falha ao obter jornada: ${error.message}`);
    return data || [];
  },

  /**
   * @param comoSolicitacao quando o próprio profissional está salvando. Muda
   * duas coisas, e as duas são exigência da RLS da Fase 9:
   *
   *   1. tudo que entra ou muda nasce `pendente`;
   *   2. **remover deixa de ser DELETE**. A policy só deixa o profissional
   *      apagar linha pendente, então apagar uma faixa já aprovada afetaria
   *      zero linhas **sem erro** — a tela diria "salvo" e o horário
   *      continuaria lá. No lugar disso, a faixa é proposta como inativa e vai
   *      para a fila do dono.
   */
  async salvarJornada(
    barbeariaId: string,
    profissionalId: string,
    faixasAtuais: HorarioTrabalho[],
    novasFaixas: Array<Omit<HorarioTrabalhoInsert, 'id' | 'barbearia_id' | 'profissional_id'>>,
    comoSolicitacao = false,
    solicitadoPor: string | null = null
  ): Promise<void> {
    // Montar listas para as três operações (diff por ID e valores)
    const faixasAntigasMap = new Map(faixasAtuais.map(f => [f.id, f]));
    
    // Como novasFaixas vêm da UI, as que já existiam podem ter um "id" na estrutura se passarmos adiante,
    // mas a tipagem Omit indica que não. Vamos supor que na UI passaremos { id?: string, dia_semana, hora_inicio, hora_fim, ativo }
    
    const idsParaDeletar: string[] = [];
    const faixasParaInserir: HorarioTrabalhoInsert[] = [];
    const faixasParaAtualizar: Partial<HorarioTrabalho>[] = [];

    const idsNaNovaJornada = new Set<string>();

    for (const nova of novasFaixas as any[]) {
      if (nova.id && faixasAntigasMap.has(nova.id)) {
        idsNaNovaJornada.add(nova.id);
        const antiga = faixasAntigasMap.get(nova.id)!;
        
        // Verifica se mudou algo
        if (
          antiga.dia_semana !== nova.dia_semana ||
          antiga.hora_inicio !== nova.hora_inicio ||
          antiga.hora_fim !== nova.hora_fim ||
          antiga.ativo !== nova.ativo
        ) {
          faixasParaAtualizar.push({
            id: nova.id,
            dia_semana: nova.dia_semana,
            hora_inicio: nova.hora_inicio,
            hora_fim: nova.hora_fim,
            ativo: nova.ativo,
            status_aprovacao: comoSolicitacao ? 'pendente' : 'aprovado'
          });
        }
      } else {
        // Inserir nova faixa
        faixasParaInserir.push({
          barbearia_id: barbeariaId,
          profissional_id: profissionalId,
          dia_semana: nova.dia_semana,
          hora_inicio: nova.hora_inicio,
          hora_fim: nova.hora_fim,
          ativo: nova.ativo,
          status_aprovacao: comoSolicitacao ? 'pendente' : 'aprovado',
          solicitado_por: comoSolicitacao ? solicitadoPor : null
        });
      }
    }

    // O que estava nas antigas e não está nas novas, deletamos
    faixasAtuais.forEach(antiga => {
      if (!idsNaNovaJornada.has(antiga.id)) {
        idsParaDeletar.push(antiga.id);
      }
    });

    // Validar sobreposições na aplicação (mesmo dia)
    const faixasFinais = [
      ...faixasParaInserir,
      ...faixasAtuais.filter(a => idsNaNovaJornada.has(a.id)).map(a => {
        const update = faixasParaAtualizar.find(u => u.id === a.id);
        return update ? { ...a, ...update } : a;
      })
    ];

    for (let dia = 0; dia <= 6; dia++) {
      const faixasDoDia = faixasFinais
        .filter(f => f.dia_semana === dia && f.ativo)
        .sort((a, b) => (a.hora_inicio as string).localeCompare(b.hora_inicio as string));
      
      for (let i = 0; i < faixasDoDia.length - 1; i++) {
        const f1 = faixasDoDia[i];
        const f2 = faixasDoDia[i+1];
        if ((f1.hora_fim as string) > (f2.hora_inicio as string)) {
          throw new Error(`Sobreposição detectada no dia ${dia}. Faixa 1 termina às ${f1.hora_fim} e Faixa 2 começa às ${f2.hora_inicio}.`);
        }
      }
    }

    // ---- Caminho do PROFISSIONAL: nada toca a jornada vigente ----
    //
    // Antes, a "proposta" era gravada em cima da propria linha de
    // horario_trabalho com status pendente. Como a disponibilidade exige
    // `aprovado`, pedir mudanca tirava o barbeiro da agenda -- e um "nao" do
    // dono destruia a jornada, porque o valor antigo ja tinha sido
    // sobrescrito. Ver P0-1 na auditoria da Fase 12.
    //
    // Agora a proposta vira linha em `solicitacao_jornada`, e a jornada so
    // muda quando o gestor aprova (RPC responder_solicitacao_jornada).
    if (comoSolicitacao) {
      const solicitacoes = [
        ...faixasParaInserir.map((f) => ({
          barbearia_id: barbeariaId,
          profissional_id: profissionalId,
          horario_id: null,
          operacao: 'criar' as const,
          dia_semana: f.dia_semana,
          hora_inicio: f.hora_inicio,
          hora_fim: f.hora_fim,
          solicitado_por: solicitadoPor,
        })),
        ...faixasParaAtualizar.map((f) => ({
          barbearia_id: barbeariaId,
          profissional_id: profissionalId,
          horario_id: f.id!,
          operacao: 'alterar' as const,
          dia_semana: f.dia_semana ?? null,
          hora_inicio: f.hora_inicio!,
          hora_fim: f.hora_fim!,
          solicitado_por: solicitadoPor,
        })),
        ...idsParaDeletar.map((id) => ({
          barbearia_id: barbeariaId,
          profissional_id: profissionalId,
          horario_id: id,
          operacao: 'remover' as const,
          dia_semana: null,
          hora_inicio: null,
          hora_fim: null,
          solicitado_por: solicitadoPor,
        })),
      ];

      if (solicitacoes.length === 0) return;

      const { error } = await supabase.from('solicitacao_jornada').insert(solicitacoes as never);
      if (error) {
        if (error.message.includes('row-level security')) {
          throw new Error('Você só pode pedir mudança na sua própria jornada.');
        }
        throw new Error(`Falha ao enviar o pedido de jornada: ${error.message}`);
      }
      return;
    }

    // ---- Caminho do GESTOR: escreve direto, vale na hora ----
    const promises: any[] = [];

    if (idsParaDeletar.length > 0) {
      promises.push(
        comoSolicitacao
          // Ver o comentário da assinatura: o profissional não apaga faixa
          // aprovada, ele PROPÕE desativá-la.
          ? supabase
              .from('horario_trabalho')
              .update({ ativo: false, status_aprovacao: 'pendente' })
              .in('id', idsParaDeletar)
              .then(res => res)
          : supabase.from('horario_trabalho').delete().in('id', idsParaDeletar).then(res => res)
      );
    }

    if (faixasParaInserir.length > 0) {
      promises.push(
        supabase.from('horario_trabalho').insert(faixasParaInserir).then(res => res)
      );
    }

    if (faixasParaAtualizar.length > 0) {
      promises.push(
        supabase.from('horario_trabalho').upsert(
          faixasParaAtualizar.map(f => ({
            ...faixasAntigasMap.get(f.id!),
            ...f
          })) as HorarioTrabalhoInsert[]
        ).then(res => res)
      );
    }

    if (promises.length > 0) {
      const results = await Promise.all(promises);
      const errors = results.filter((r: any) => r.error);
      if (errors.length > 0) {
        throw new Error(`Falha parcial ao salvar jornada. Um ou mais registros não puderam ser alterados.`);
      }
    }
  }
};
