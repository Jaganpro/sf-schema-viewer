/**
 * Main application layout component.
 */

import type { ReactNode } from 'react';
import Header from './Header';

interface LayoutProps {
  sidebar: ReactNode;
  children: ReactNode;
}

export default function Layout({ sidebar, children }: LayoutProps) {
  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <aside className="shrink-0 h-full">{sidebar}</aside>
        <main className="flex-1 h-full overflow-hidden bg-sf-background">{children}</main>
      </div>
    </div>
  );
}
