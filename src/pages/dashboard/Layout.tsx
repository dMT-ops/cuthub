import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { useSidebarState } from '@/hooks/useSidebarState';

export default function DashboardLayout() {
  const sidebarState = useSidebarState();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar {...sidebarState} />

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
