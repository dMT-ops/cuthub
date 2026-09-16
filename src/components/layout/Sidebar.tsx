import { useState } from 'react';
import { Menu, Pin, PinOff, LogOut } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/lib/auth/AuthContext';
import { useSidebarState } from '@/hooks/useSidebarState';
import { navigationItems } from './navigation.config';
import { SidebarItem } from './SidebarItem';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

export function Sidebar(props: ReturnType<typeof useSidebarState>) {
  const { user, signOut } = useAuth();
  const {
    isPinned,
    isMobile,
    isExpanded,
    togglePin,
    handleMouseEnter,
    handleMouseLeave,
    handleFocus,
    handleBlur
  } = props;

  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Mobile Render via Sheet
  if (isMobile) {
    return (
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetTrigger asChild>
          <button className="fixed top-4 left-4 z-50 p-2 bg-card rounded-md shadow-sm border text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Menu size={24} />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0 flex flex-col">
          <SheetHeader className="p-6 border-b text-left">
            <SheetTitle className="text-2xl font-bold">CutHub</SheetTitle>
            <p className="text-xs text-muted-foreground mt-1">Gestão de Barbearias</p>
          </SheetHeader>
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto" aria-label="Menu Principal Mobile">
            {navigationItems.map(item => (
              <SidebarItem
                key={item.path}
                icon={item.icon}
                label={item.label}
                path={item.path}
                end={'end' in item ? item.end : undefined}
                isExpanded={true} // Sempre expandido no mobile
                onClick={() => setIsMobileOpen(false)}
              />
            ))}
          </nav>
          <div className="p-4 border-t space-y-4">
            <div className="px-2">
              <p className="text-sm font-medium text-foreground truncate">{user?.email}</p>
              <p className="text-xs text-muted-foreground">Administrador</p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                variant="ghost"
                className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10 justify-start px-2"
                onClick={() => signOut()}
              >
                <LogOut size={18} className="mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop Render
  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={`
        fixed inset-y-0 left-0 z-40 bg-card border-r flex flex-col 
        transition-[width] duration-200 ease-in-out motion-reduce:transition-none
        ${isExpanded ? 'w-60' : 'w-16'}
      `}
    >
      <div className="p-4 border-b flex items-center h-[73px] box-border relative">
        {/* Title area fades in/out */}
        <div className={`overflow-hidden transition-all duration-200 ease-in-out motion-reduce:transition-none ${isExpanded ? 'w-full opacity-100' : 'w-0 opacity-0'}`}>
          <h1 className="text-xl font-bold text-foreground whitespace-nowrap">CutHub</h1>
        </div>
        
        {/* Ícone fixo quando recolhido (opcional, para dar identidade visual, mas no req só pede ícones. Deixamos o titulo sumir e botamos o PIN) */}
        {isExpanded && (
          <Button
            variant="ghost"
            size="icon"
            onClick={togglePin}
            aria-label={isPinned ? "Desafixar menu" : "Fixar menu"}
            aria-pressed={isPinned}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            {isPinned ? <Pin size={16} className="rotate-45" /> : <PinOff size={16} />}
          </Button>
        )}
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-x-hidden overflow-y-auto" aria-label="Menu Principal">
        {navigationItems.map(item => (
          <SidebarItem
            key={item.path}
            icon={item.icon}
            label={item.label}
            path={item.path}
            end={'end' in item ? item.end : undefined}
            isExpanded={isExpanded}
          />
        ))}
      </nav>

      <div className="p-2 border-t flex flex-col gap-2 overflow-x-hidden">
        {/* User Info */}
        <div className={`px-2 py-2 transition-all duration-200 ease-in-out motion-reduce:transition-none whitespace-nowrap ${isExpanded ? 'opacity-100 h-auto' : 'opacity-0 h-0 overflow-hidden py-0'}`}>
          <p className="text-sm font-medium text-foreground truncate w-44">{user?.email}</p>
          <p className="text-xs text-muted-foreground">Administrador</p>
        </div>

        {/* Actions */}
        <div className={`flex items-center gap-2 ${isExpanded ? 'px-1' : 'justify-center flex-col'}`}>
          <div className="flex-shrink-0">
            <ThemeToggle />
          </div>
          
          <Button
            variant="ghost"
            onClick={() => signOut()}
            aria-label="Sair"
            className={`
              text-destructive hover:text-destructive hover:bg-destructive/10 
              transition-all duration-200 ease-in-out motion-reduce:transition-none
              ${isExpanded ? 'flex-1 justify-start px-2' : 'h-10 w-10 p-0 justify-center'}
            `}
          >
            <LogOut size={18} className={isExpanded ? 'mr-2' : ''} />
            <span className={`overflow-hidden transition-all duration-200 ease-in-out motion-reduce:transition-none ${isExpanded ? 'w-auto opacity-100' : 'w-0 opacity-0'}`}>
              Sair
            </span>
          </Button>
        </div>
      </div>
    </aside>
  );
}
