/**
 * Main application layout component.
 */

import type { ReactNode } from 'react';
import Header from './Header';
import './Layout.css';

interface LayoutProps {
  sidebar: ReactNode;
  children: ReactNode;
}

export default function Layout({ sidebar, children }: LayoutProps) {
  return (
    <div className="app-layout">
      <Header />
      <div className="app-content">
        <aside className="app-sidebar">{sidebar}</aside>
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}
