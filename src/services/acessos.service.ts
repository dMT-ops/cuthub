import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

type UsuarioPerfil = Database['public']['Tables']['usuario_perfil']['Row'];
type TipoUsuario = Database['public']['Enums']['tipo_usuario'];

/** Papéis que administram uma barbearia. Os demais não aparecem nesta tela. */
export type PapelDeGestao = Extract<TipoUsuario, 'owner' | 'gerente'>;

export interface Gestor {
  id: string;
  nome: string;
  tipo: TipoUsuario;
  criadoEm: string | null;
}

/**
 * As mensagens das RPCs vêm do `RAISE EXCEPTION` do Postgres, que está sem
 * acentuação para não depender do encoding do banco. Aqui elas viram texto de
 * produto. O casamento é por trecho, como já se faz em `agendamentos.service.ts`
 * com o nome da constraint — trocar o texto no SQL exige trocar aqui também.
 */
const MENSAGENS: Array<[string, string]> = [
  ['Nao existe conta com este e-mail', 'Não existe conta com este e-mail. Peça para a pessoa criar a conta primeiro.'],
  ['Esta conta ja tem acesso', 'Esta conta já tem acesso a esta barbearia.'],
  ['Esta conta ja pertence a outra barbearia', 'Esta conta já pertence a outra barbearia.'],
  ['O fundador da barbearia nao pode ser removido', 'O fundador da barbearia não pode ser removido.'],
  ['O fundador da barbearia nao pode ter o papel alterado', 'O fundador da barbearia não pode ter o papel alterado.'],
  ['Nao e possivel remover o proprio acesso', 'Você não pode remover o próprio acesso.'],
  ['Nao e possivel alterar o proprio papel', 'Você não pode alterar o próprio papel.'],
  ['Nao e possivel remover um administrador', 'Não é possível remover um administrador.'],
  ['Nao e possivel alterar o vinculo de um administrador', 'Não é possível alterar o vínculo de um administrador.'],
  ['Apenas o proprietario pode gerenciar acessos', 'Apenas o proprietário pode gerenciar acessos.'],
  ['Operacao nao permitida para esta barbearia', 'Operação não permitida para esta barbearia.'],
  ['Papel invalido', 'Papel inválido: use proprietário ou gerente.'],
];

function traduzir(mensagem: string): string {
  const achado = MENSAGENS.find(([trecho]) => mensagem.includes(trecho));
  return achado ? achado[1] : mensagem;
}

export const acessosService = {
  /**
   * Quem administra esta barbearia.
   *
   * Não devolve e-mail: ele mora em `auth.users`, que a RLS não expõe ao app.
   * A tela identifica as pessoas por nome e papel.
   */
  async listarGestores(barbeariaId: string): Promise<Gestor[]> {
    const { data, error } = await supabase
      .from('usuario_perfil')
      .select('id, nome, tipo, criado_em')
      .eq('barbearia_id', barbeariaId)
      .in('tipo', ['owner', 'gerente'])
      .order('criado_em');

    if (error) throw new Error(`Falha ao listar os acessos: ${error.message}`);

    return (data as Pick<UsuarioPerfil, 'id' | 'nome' | 'tipo' | 'criado_em'>[]).map((u) => ({
      id: u.id,
      nome: u.nome,
      tipo: u.tipo,
      criadoEm: u.criado_em,
    }));
  },

  async adicionarGestor(params: {
    email: string;
    nome?: string;
    tipo: PapelDeGestao;
    barbeariaId: string;
  }): Promise<string> {
    const { data, error } = await supabase.rpc('adicionar_gestor', {
      p_email: params.email,
      p_nome: params.nome ?? undefined,
      p_tipo: params.tipo,
      p_barbearia_id: params.barbeariaId,
    });

    if (error) throw new Error(traduzir(error.message));
    return data as string;
  },

  async alterarPapel(usuarioId: string, novoTipo: PapelDeGestao): Promise<void> {
    const { error } = await supabase.rpc('alterar_papel_gestor', {
      p_usuario_id: usuarioId,
      p_novo_tipo: novoTipo,
    });

    if (error) throw new Error(traduzir(error.message));
  },

  async removerGestor(usuarioId: string): Promise<void> {
    const { error } = await supabase.rpc('remover_gestor', {
      p_usuario_id: usuarioId,
    });

    if (error) throw new Error(traduzir(error.message));
  },
};
