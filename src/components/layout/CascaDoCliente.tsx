import type { ReactNode } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { CalendarDays, Heart, Home, LogOut, Percent, Plus, Scissors, Store } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/tema/ThemeToggle';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { useAuth } from '@/lib/auth/AuthContext';
import { useSair } from '@/lib/auth/useSair';
import { GRADE_DO_CLIENTE } from '@/lib/ui/grade';
import { TRANSICAO } from '@/lib/ui/movimento';

const ITENS = [
  { to: '/minha-conta', label: 'Início', icon: Home, end: true },
  { to: '/minha-conta/agendamentos', label: 'Agenda', icon: CalendarDays },
  { to: '/minha-conta/favoritos', label: 'Favoritos', icon: Heart },
  { to: '/minha-conta/promocoes', label: 'Ofertas', icon: Percent },
  { to: '/barbearias', label: 'Explorar', icon: Store },
];

/**
 * A casca da área do cliente: cabeçalho, abas do desktop e barra inferior do
 * celular. Separada do `ClienteLayout` para poder **envolver também o catálogo
 * público** quando quem olha é um cliente logado.
 *
 * Identidade **neutra do CutHub**, de propósito, e não a marca de uma barbearia.
 * O cliente pode ter várias barbearias favoritas, e aqui não existe uma da qual
 * herdar cor e logo — herdar a de uma delas seria arbitrário. A marca de cada
 * barbearia aparece no contexto dela, em `/b/:slug`.
 *
 * Navegação inferior no celular e em abas no desktop: a área do cliente é o uso
 * que mais acontece no telefone, na rua, antes ou depois do corte.
 *
 * **Por que virou componente, em 25/09.** `/barbearias` era uma página solta,
 * com cabeçalho próprio de 65px contra os 109px daqui. Clicar em "Explorar" ou
 * em "Novo agendamento" apagava as abas e subia todo o conteúdo 44px de uma vez
 * — o Chefe descreveu como "ir para uma tela que o cliente não conhece". Com a
 * casca compartilhada a navegação não some, e clicar numa aba traz de volta.
 */
export function CascaDoCliente({ children }: { children: ReactNode }) {
  const { perfil } = useAuth();
  const sair = useSair();

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* `view-transition-name` tira a casca do instantâneo da página, para ela
          ficar PARADA enquanto o miolo desliza. Sem isto o cabeçalho piscaria a
          cada navegação — o oposto do que a casca compartilhada resolve. */}
      <header
        style={{ viewTransitionName: TRANSICAO.casca }}
        className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur"
      >
        <div className={`${GRADE_DO_CLIENTE} flex h-16 items-center justify-between`}>
          <Link to="/minha-conta" className="flex items-center gap-2 font-semibold tracking-tight">
            <Scissors className="h-6 w-6 text-primary" aria-hidden="true" />
            <span className="text-lg">CutHub</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {perfil?.nome}
            </span>
            <NotificationBell />
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void sair()}
              aria-label="Sair da conta"
              title="Sair"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* Navegação em abas no desktop, com a ação principal na mesma linha.
            `items-center` + `size="sm"` alinham o botão à altura das abas: a
            aba é `px-3 py-2 text-sm`, que fecha nos mesmos 36px do botão. */}
        <nav className={`${GRADE_DO_CLIENTE} hidden items-center gap-1 pb-2 md:flex`}>
          {ITENS.map(({ to, label, icon: Icone, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              viewTransition
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

          {/* `ml-auto` empurra para a direita, do lado oposto às abas: é ação,
              não navegação, e misturá-la à fileira faria parecer mais uma aba.
              Leva para `/barbearias` porque o cliente não marca sem antes
              escolher onde — quem abre o formulário é a barbearia. */}
          <Button asChild size="sm" className="ml-auto gap-1.5">
            <Link to="/barbearias" viewTransition>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Novo agendamento
            </Link>
          </Button>
        </nav>
      </header>

      {/* Largura por breakpoint, e nao fixa: com max-w-4xl (896px) uma tela de
          1920px deixava mais de 500px vazios de cada lado. O teto existe para
          o texto nao virar linha de 2000px, que e ilegivel.
          O degrau `2xl` entrou em 23/09: mesmo com xl:max-w-7xl (1280px),
          medido em 1920 sobravam 320px de cada lado. */}
      <main style={{ viewTransitionName: TRANSICAO.miolo }} className={`${GRADE_DO_CLIENTE} py-6`}>
        {children}
      </main>

      {/* Navegação inferior no celular */}
      <nav
        style={{ viewTransitionName: TRANSICAO.cascaInferior }}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur md:hidden"
      >
        <div className="grid grid-cols-5">
          {ITENS.map(({ to, label, icon: Icone, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              viewTransition
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
