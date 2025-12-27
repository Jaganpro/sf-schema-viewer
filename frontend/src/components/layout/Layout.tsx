/**
 * Main application layout component.
 * Supports a 3-column layout: Object List | Detail Panel (optional) | Canvas
 */

import type { ReactNode } from 'react';
import Header from './Header';

interface LayoutProps {
  sidebar: ReactNode;
  detailPanel?: ReactNode;
  children: ReactNode;
}

export default function Layout({ sidebar, detailPanel, children }: LayoutProps) {
  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        {/* Object list sidebar */}
        <aside className="shrink-0 h-full">{sidebar}</aside>

        {/* Detail panel - conditional */}
        {detailPanel && (
          <aside className="shrink-0 h-full border-l border-gray-200 bg-white">
            {detailPanel}
          </aside>
        )}

        {/* Main canvas */}
        <main className="flex-1 h-full overflow-hidden bg-sf-background">{children}</main>
      </div>
    </div>
  );
}
