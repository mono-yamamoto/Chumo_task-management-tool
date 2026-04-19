import type { ReactNode, ComponentProps } from 'react';
import {
  Tabs as AriaTabs,
  TabList as AriaTabList,
  Tab as AriaTab,
  TabPanel as AriaTabPanel,
  type TabsProps as AriaTabsProps,
  type TabProps as AriaTabProps,
  type TabPanelProps as AriaTabPanelProps,
} from 'react-aria-components';
import { cn } from '../../lib/utils';

export function Tabs({ className, ...props }: AriaTabsProps) {
  return <AriaTabs className={cn('flex flex-col', className)} {...props} />;
}

export function TabList({ className, ...props }: ComponentProps<typeof AriaTabList>) {
  return (
    <AriaTabList className={cn('flex border-b border-border-default', className)} {...props} />
  );
}

interface TabProps extends Omit<AriaTabProps, 'children'> {
  badge?: number;
  children?: ReactNode;
}

export function Tab({ className, badge, children, ...props }: TabProps) {
  return (
    <AriaTab
      className={cn(
        'relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium cursor-pointer transition-colors',
        'text-text-tertiary hover:text-text-primary',
        'data-selected:text-primary-default data-selected:font-bold',
        'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2.5px] after:rounded-full',
        'data-selected:after:bg-primary-default',
        'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-border-focus',
        className
      )}
      {...props}
    >
      {children}
      {badge != null && badge > 0 && (
        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
    </AriaTab>
  );
}

export function TabPanel({ className, ...props }: AriaTabPanelProps) {
  return <AriaTabPanel className={cn('flex-1 overflow-auto', className)} {...props} />;
}
