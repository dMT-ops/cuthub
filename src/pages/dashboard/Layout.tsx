import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { useSidebarState } from '@/hooks/useSidebarState';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { TemaDaBarbearia } from '@/components/tema/TemaDaBarbearia';
import { TituloDaAba } from '@/components/tema/TituloDaAba';

export default function DashboardLayout() {
  const sidebarState = useSidebarState();

  const recuoDaSidebar =
    sidebarState.isPinned && !sidebarState.isMobile ? 'md:ml-60' : 'md:ml-16';

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Nao renderizam nada: pintam o painel com a cor da barbearia e poem o
          nome dela na aba do navegador. Vivem aqui, e nao no App, para o tema
          nao vazar para a area do cliente nem para o console do admin. */}
      <TemaDaBarbearia />
      <TituloDaAba />

      <Sidebar {...sidebarState} />

      {/* Coluna de conteúdo: o recuo da sidebar passou para cá, e não para o
          `main`, porque agora o cabeçalho precisa acompanhar o mesmo recuo.
          Antes o sino era um botão `fixed` solto sobre a tela e caía em cima
          do primeiro card do painel. */}
      <div
        className={`
          flex min-w-0 flex-1 flex-col
          transition-[margin] duration-200 ease-in-out motion-reduce:transition-none
          ml-0 ${recuoDaSidebar}
        `}
      >
        {/* Mesma anatomia do ClienteLayout e do AdminLayout: faixa de altura
            fixa, borda embaixo, ações à direita. `pl-16` no mobile reserva o
            canto do botão de menu da sidebar, que é `fixed` e passa por cima. */}
        <header className="flex h-14 shrink-0 items-center justify-end gap-2 border-b border-border/60 bg-background px-4 pl-16 md:px-8 md:pl-8">
          <NotificationBell />
        </header>

        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
