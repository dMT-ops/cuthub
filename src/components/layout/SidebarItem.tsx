import { NavLink } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  path: string;
  end?: boolean;
  isExpanded: boolean;
  onClick?: () => void;
}

export function SidebarItem({ icon: Icon, label, path, end, isExpanded, onClick }: SidebarItemProps) {
  const linkContent = (
    <NavLink
      to={path}
      end={end}
      onClick={onClick}
      aria-label={label}
      className={({ isActive }) => `
        flex items-center gap-3 px-3 py-2 rounded-lg 
        transition-all duration-200 ease-in-out motion-reduce:transition-none
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
        ${isActive 
          ? 'bg-primary/10 text-primary font-medium' 
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }
      `}
    >
      {/* Icon Wrapper: fixed width to align nicely */}
      <div className="flex items-center justify-center min-w-[20px]">
        <Icon size={20} />
      </div>
      
      {/* Label: fades and expands */}
      <div 
        className={`
          overflow-hidden whitespace-nowrap transition-all duration-200 ease-in-out motion-reduce:transition-none
          ${isExpanded ? 'w-40 opacity-100' : 'w-0 opacity-0'}
        `}
      >
        <span className="truncate block">{label}</span>
      </div>
    </NavLink>
  );

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip open={isExpanded ? false : undefined}>
        <TooltipTrigger asChild>
          {linkContent}
        </TooltipTrigger>
        {!isExpanded && (
          <TooltipContent side="right" sideOffset={10}>
            {label}
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
