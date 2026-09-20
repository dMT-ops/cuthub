import {
  LayoutDashboard,
  Calendar,
  Users,
  Scissors,
  DollarSign,
  Settings,
  Tag,
  ShoppingBag,
  Percent,
} from 'lucide-react';

import type { TipoUsuario } from '@/lib/auth/areas';

/** Quem toca a loja. Atalho para não repetir o par em quase todo item. */
const GESTAO: TipoUsuario[] = ['owner', 'gerente'];

export interface ItemDeNavegacao {
  label: string;
  icon: typeof LayoutDashboard;
  path: string;
  end?: boolean;
  /**
   * Papéis que enxergam este item — lista de permitidos, não de barrados,
   * como em `PAPEIS_POR_AREA`. Papel novo no enum nasce **sem** ver nada até
   * alguém decidir onde ele entra, em vez de herdar acesso por omissão.
   */
  papeis: TipoUsuario[];
}

/**
 * Fonte única do menu E da autorização de rota.
 *
 * O `GuardaDoDashboard` lê esta mesma lista para bloquear a URL digitada à
 * mão. Se `papeis` vivesse só aqui e a regra da rota fosse escrita de novo em
 * outro lugar, as duas divergiriam no primeiro item novo — e o item ficaria
 * escondido no menu mas acessível pela barra de endereço.
 */
export const navigationItems: ItemDeNavegacao[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', end: true, papeis: GESTAO },
  { label: 'Agenda', icon: Calendar, path: '/dashboard/agenda', papeis: [...GESTAO, 'profissional'] },
  { label: 'Clientes', icon: Users, path: '/dashboard/clientes', papeis: GESTAO },
  { label: 'Profissionais', icon: Scissors, path: '/dashboard/profissionais', papeis: GESTAO },
  { label: 'Serviços', icon: Tag, path: '/dashboard/servicos', papeis: GESTAO },
  { label: 'Produtos', icon: ShoppingBag, path: '/dashboard/produtos', papeis: GESTAO },
  { label: 'Promoções', icon: Percent, path: '/dashboard/promocoes', papeis: GESTAO },
  { label: 'Financeiro', icon: DollarSign, path: '/dashboard/financeiro', papeis: [...GESTAO, 'profissional'] },
  { label: 'Configurações', icon: Settings, path: '/dashboard/configuracoes', papeis: GESTAO },
];

/** Itens que este papel pode ver no menu. */
export function itensDoPapel(tipo: TipoUsuario | null | undefined): ItemDeNavegacao[] {
  if (!tipo) return [];
  return navigationItems.filter((item) => item.papeis.includes(tipo));
}

/**
 * Este papel pode abrir esta URL do dashboard?
 *
 * Casa pelo caminho mais específico: `/dashboard/agenda/semana` tem que casar
 * com o item `/dashboard/agenda`, e não com o `/dashboard` (que é `end: true`
 * justamente por isso). Caminho que não casa com item nenhum é negado — de
 * novo, permitidos e não barrados.
 */
export function podeAbrir(tipo: TipoUsuario | null | undefined, pathname: string): boolean {
  if (!tipo) return false;

  const candidatos = navigationItems
    .filter((item) => (item.end ? pathname === item.path : pathname.startsWith(item.path)))
    .sort((a, b) => b.path.length - a.path.length);

  const item = candidatos[0];
  return item ? item.papeis.includes(tipo) : false;
}
