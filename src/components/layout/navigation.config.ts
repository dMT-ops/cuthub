import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Scissors, 
  DollarSign, 
  Settings,
  Tag,
  ShoppingBag
} from 'lucide-react';

export const navigationItems = [
  { label: 'Dashboard',     icon: LayoutDashboard, path: '/dashboard', end: true },
  { label: 'Agenda',        icon: Calendar,        path: '/dashboard/agenda' },
  { label: 'Clientes',      icon: Users,           path: '/dashboard/clientes' },
  { label: 'Profissionais', icon: Scissors,        path: '/dashboard/profissionais' },
  { label: 'Serviços',      icon: Tag,             path: '/dashboard/servicos' },
  { label: 'Produtos',      icon: ShoppingBag,     path: '/dashboard/produtos' },
  { label: 'Financeiro',    icon: DollarSign,      path: '/dashboard/financeiro' },
  { label: 'Configurações', icon: Settings,        path: '/dashboard/configuracoes' },
] as const;
