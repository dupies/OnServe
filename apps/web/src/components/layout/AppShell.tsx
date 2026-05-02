import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: ReactNode;
  className?: string;
}

export function AppShell({ children, className }: AppShellProps) {
  return (
    <div className="min-h-svh bg-background flex justify-center">
      <div className={cn('w-full max-w-sm relative flex flex-col', className)}>
        {children}
      </div>
    </div>
  );
}
