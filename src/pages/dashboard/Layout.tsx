import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { useSidebarState } from '@/hooks/useSidebarState';
import { NotificationBell } from '@/components/NotificationBell';

export default function DashboardLayout() {
  const sidebarState = useSidebarState();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar {...sidebarState} />

      {/* Este layout nao tem barra superior -- a sidebar e a moldura inteira.
          Em vez de inventar um header so para o sino, ele fica ancorado no
          canto, acima do conteudo e fora do caminho do botao de menu mobile,
          que mora no canto esquerdo. */}
      <div className="fixed right-4 top-3 z-40">
        <NotificationBell />
      </div>

      {/* Main Content */}
      <main 
        className={`
          flex-1 overflow-y-auto p-4 md:p-8 pt-16 md:pt-8 bg-background
          transition-[margin] duration-200 ease-in-out motion-reduce:transition-none
          ml-0 ${sidebarState.isPinned && !sidebarState.isMobile ? 'md:ml-60' : 'md:ml-16'}
        `}
      >
        <Outlet />
      </main>
    </div>
  );
}
