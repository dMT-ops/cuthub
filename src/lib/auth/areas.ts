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
  gestao: ['owner', 'gerente', 'profissional'],
  // Todo mundo tem direito de ser consumidor: o barbeiro corta cabelo em
  // outra barbearia, o dono agenda na propria. Quem gerencia entra aqui
  // tambem, e `areaDoPapel` continua devolvendo `gestao` para eles porque
  // checa a gestao primeiro -- e a area de trabalho que manda no login.
  cliente: ['cliente', 'profissional', 'gerente', 'owner'],
  admin: ['admin_supremo'],
};

export const ROTA_DA_AREA: Record<Area, string> = {
  gestao: '/dashboard',
  cliente: '/minha-conta',
  admin: '/admin',
};

/**
 * Rota inicial por papel, quando ela difere da porta da área.
 *
 * O profissional entra em `gestao` desde a Fase 8, mas não pelo índice: o
 * `/dashboard` é o painel de métricas da loja, que não é dele. Ele cai na
 * agenda, que é o trabalho dele.
 */
const ROTA_INICIAL_DO_PAPEL: Partial<Record<TipoUsuario, string>> = {
  profissional: '/dashboard/agenda',
};

/**
 * Para onde este papel vai depois do login.
 *
 * `null` significa "não tem área ainda". Desde a Fase 8 os cinco papéis do
 * enum têm destino; fica como rede para o próximo papel que alguém acrescente
 * ao banco sem decidir onde ele entra.
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
  const especifica = tipo ? ROTA_INICIAL_DO_PAPEL[tipo] : undefined;
  if (especifica) return especifica;

  const area = areaDoPapel(tipo);
  return area ? ROTA_DA_AREA[area] : null;
}

/**
 * Para onde "Minha área" leva, respeitando o **chapéu que a pessoa está
 * usando** — e não só o papel dela.
 *
 * `rotaInicialDoPapel` responde "onde este papel trabalha", e para quem tem
 * dois chapéus a resposta é sempre a gestão, porque `areaDoPapel` checa a
 * gestão primeiro. Isso está certo no login e **errado** em qualquer volta:
 * o profissional que escolheu a área do cliente, foi ao catálogo público
 * (`/barbearias`, que fica fora dos dois layouts) e clicou em "Minha área"
 * caía no painel do barbeiro, sem caminho de volta. Bug relatado em 24/09.
 *
 * A `area` vem de armazenamento do navegador, que o usuário edita à vontade.
 * Por isso ela é **validada contra o papel**: área que o papel não pode ocupar
 * é descartada em favor do destino de sempre. Isto não é controle de acesso —
 * quem barra continua sendo o `ProtectedRoute`. É só o link não mentir.
 */
export function rotaDaAreaAtual(
  area: Area | null | undefined,
  tipo: TipoUsuario | null | undefined
): string | null {
  if (!tipo) return null;
  if (!area || !PAPEIS_POR_AREA[area].includes(tipo)) return rotaInicialDoPapel(tipo);

  // Dentro da gestão o papel ainda manda na porta: o profissional entra pela
  // agenda, não pelo índice de métricas, que não é dele.
  if (area === 'gestao') return ROTA_INICIAL_DO_PAPEL[tipo] ?? ROTA_DA_AREA.gestao;

  return ROTA_DA_AREA[area];
}
