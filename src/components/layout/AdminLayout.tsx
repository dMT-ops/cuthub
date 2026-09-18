import { Link, NavLink, Outlet } from 'react-router-dom';
import { LogOut, ScrollText, Shield, Store } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/lib/auth/AuthContext';
import { cn } from '@/lib/utils';

const ITENS = [
  { para: '/admin', rotulo: 'Visão geral', icone: Shield, fim: true },
  { para: '/admin/barbearias', rotulo: 'Barbearias', icone: Store, fim: false },
  { para: '/admin/auditoria', rotulo: 'Auditoria', icone: ScrollText, fim: false },
];

/**
 * Console da plataforma.
 *
 * O visual é deliberadamente diferente do painel da barbearia: faixa vermelha
 * fixa no topo e sidebar escura. Quem está aqui age sobre os dados de TODOS os
 * clientes do produto, e confundir esta tela com a de uma barbearia é
 * exatamente o erro que não pode acontecer.
 */
export function AdminLayout() {
  const { perfil, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-center gap-2 bg-red-600 px-4 py-1.5 text-center text-xs font-semibold text-white">
        <Shield className="h-3.5 w-3.5" aria-hidden="true" />
        Console da plataforma — ações aqui afetam todas as barbearias do CutHub
      </div>

      <div className="flex">
        <aside className="hidden w-60 shrink-0 border-r bg-muted/40 md:block">
          <div className="flex h-16 items-center gap-2 border-b px-5">
            <Shield className="h-5 w-5 text-red-600" aria-hidden="true" />
            <Link to="/admin" className="font-bold tracking-tight">
              CutHub <span className="text-red-600">Admin</span>
            </Link>
          </div>
          <nav className="space-y-1 p-3">
            {ITENS.map(({ para, rotulo, icone: Icone, fim }) => (
              <NavLink
                key={para}
                to={para}
                end={fim}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-red-600/10 text-red-700 dark:text-red-400'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )
                }
              >
                <Icone className="h-4 w-4" aria-hidden="true" />
                {rotulo}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex h-16 items-center justify-between gap-3 border-b px-4 sm:px-6">
            {/* Em telas estreitas a sidebar some; a navegacao vira esta faixa,
                para o console nao ficar inacessivel no celular. */}
            <nav className="flex items-center gap-1 md:hidden">
              {ITENS.map(({ para, rotulo, fim }) => (
                <NavLink
                  key={para}
                  to={para}
                  end={fim}
                  className={({ isActive }) =>
                    cn(
                      'rounded-md px-2.5 py-1.5 text-xs font-medium',
                      isActive ? 'bg-red-600/10 text-red-700 dark:text-red-400' : 'text-muted-foreground'
                    )
                  }
                >
                  {rotulo}
                </NavLink>
              ))}
            </nav>
            <span className="hidden text-sm text-muted-foreground md:inline">
              {perfil?.nome ? `Autenticado como ${perfil.nome}` : 'Administrador da plataforma'}
            </span>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                <LogOut className="mr-2 h-4 w-4" /> Sair
              </Button>
            </div>
          </header>

          <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
