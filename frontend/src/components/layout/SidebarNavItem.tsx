import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';
import type { ReactNode } from 'react';

interface SidebarNavItemProps {
  to: string;
  icon: ReactNode;
  label: string;
}

export function SidebarNavItem({ to, icon, label }: SidebarNavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex h-10 items-center gap-3 rounded-lg px-3 text-base transition-colors',
          isActive
            ? 'bg-teal-700 font-medium text-white [&_svg]:text-teal-200'
            : 'text-teal-300 [&_svg]:text-teal-400 hover:bg-teal-800/50 hover:text-teal-200'
        )
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}
