import { NavLink, Outlet, Link } from 'react-router-dom';
import { CalendarDays, Heart, Home, LogOut, Scissors, Store } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/lib/auth/AuthContext';

const ITENS = [
  { to: '/minha-conta', label: 'Início', icon: Home, end: true },
  { to: '/minha-conta/agendamentos', label: 'Agenda', icon: CalendarDays },
  { to: '/minha-conta/favoritos', label: 'Favoritos', icon: Heart },
  { to: '/barbearias', label: 'Explorar', icon: Store },
];

/**
 * Moldura da área do cliente.
 *
 * Identidade **neutra do CutHub**, de propósito, e não a marca de uma barbearia.
 * O cliente pode ter várias barbearias favoritas, e aqui não existe uma da qual
 * herdar cor e logo — herdar a de uma delas seria arbitrário. A marca de cada
 * barbearia aparece no contexto dela, em `/b/:slug`.
 *
 * Navegação inferior no celular e lateral no desktop: a área do cliente é o uso
 * que mais acontece no telefone, na rua, antes ou depois do corte.
 */
export function ClienteLayout() {
  const { perfil, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link to="/minha-conta" className="flex items-center gap-2 font-semibold tracking-tight">
            <Scissors className="h-6 w-6 text-primary" aria-hidden="true" />
            <span className="text-lg">CutHub</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {perfil?.nome}
            </span>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void signOut()}
              aria-label="Sair da conta"
              title="Sair"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* Navegação em abas no desktop */}
        <nav className="mx-auto hidden max-w-4xl gap-1 px-4 pb-2 sm:px-6 md:flex">
          {ITENS.map(({ to, label, icon: Icone, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-secondary font-medium text-secondary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`
              }
            >
              <Icone className="h-4 w-4" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <Outlet />
      </main>

      {/* Navegação inferior no celular */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur md:hidden">
        <div className="grid grid-cols-4">
          {ITENS.map(({ to, label, icon: Icone, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`
              }
            >
              <Icone className="h-5 w-5" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
