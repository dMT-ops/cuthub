import type { Database } from '@/types/database.types';

export type TipoUsuario = Database['public']['Enums']['tipo_usuario'];

/** As três áreas logadas do produto. */
export type Area = 'gestao' | 'cliente' | 'admin';

/**
 * Quem entra em cada área.
 *
 * O `admin_supremo` saiu de `gestao` e ganhou area propria na Fase 7. Ele nunca
 * operou dentro de uma barbearia (`podeOperar` ja era false para ele), entao
 * estar em `gestao` so lhe dava uma tela onde todo botao aparecia desabilitado.
 *
 * Listas de permitidos, não de barrados — a mesma decisão da Fase 1. O enum
 * `tipo_usuario` tem cinco valores, e um papel novo acrescentado ao banco deve
 * nascer **sem** acesso até alguém decidir onde ele entra, em vez de herdar
 * acesso total por omissão.
 */
export const PAPEIS_POR_AREA: Record<Area, TipoUsuario[]> = {
  gestao: ['owner', 'gerente'],
  cliente: ['cliente'],
  admin: ['admin_supremo'],
};

export const ROTA_DA_AREA: Record<Area, string> = {
  gestao: '/dashboard',
  cliente: '/minha-conta',
  admin: '/admin',
};

/**
 * Para onde este papel vai depois do login.
 *
 * `null` significa "não tem área ainda" — hoje só `profissional`, que existe no
 * enum desde o início e nunca ganhou tela própria. Quem devolve `null` cai na
 * barreira explicativa, e não numa rota que não existe.
 */
export function areaDoPapel(tipo: TipoUsuario | null | undefined): Area | null {
  if (!tipo) return null;
  if (PAPEIS_POR_AREA.gestao.includes(tipo)) return 'gestao';
  if (PAPEIS_POR_AREA.cliente.includes(tipo)) return 'cliente';
  if (PAPEIS_POR_AREA.admin.includes(tipo)) return 'admin';
  return null;
}

/** Rota inicial do papel, ou `null` quando ele não tem área. */
export function rotaInicialDoPapel(tipo: TipoUsuario | null | undefined): string | null {
  const area = areaDoPapel(tipo);
  return area ? ROTA_DA_AREA[area] : null;
}
