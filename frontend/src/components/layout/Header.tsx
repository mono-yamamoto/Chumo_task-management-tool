import type { ReactNode } from 'react';

interface HeaderProps {
  title: string;
  children?: ReactNode;
}

export function Header({ title, children }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border-default px-8">
      <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </header>
  );
}
