import { useState } from 'react';
import type { ReactNode } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { MobileHeader } from './MobileNav';

interface PageLayoutProps {
  children: ReactNode;
}

export function PageLayout({ children }: PageLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex bg-background min-h-svh flex-col md:flex-row">
      {/* Desktop sidebar — toggled by hamburger */}
      {sidebarOpen && <Sidebar onCollapse={() => setSidebarOpen(false)} />}

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile: slide-in drawer header */}
        <MobileHeader />

        {/* Desktop: thin bar with reopen button, only when sidebar is collapsed */}
        {!sidebarOpen && (
          <div className="hidden md:flex items-center gap-3 h-14 px-4 border-b border-border bg-background sticky top-0 z-40">
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" aria-hidden>
                  <circle cx="12" cy="9" r="5" fill="var(--primary)" />
                  <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-foreground">OnServe</span>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-4 py-6 md:px-8 md:py-8 pb-24 md:pb-8">
            {children}
          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
