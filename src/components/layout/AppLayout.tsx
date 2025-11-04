import { useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar, { NavigationItem } from '../navigation/Sidebar';

export type AppLayoutProps = {
  navigationItems: NavigationItem[];
};

const AppLayout = ({ navigationItems }: AppLayoutProps) => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const activeItem = useMemo(
    () => navigationItems.find((item) => item.path === location.pathname) ?? null,
    [navigationItems, location.pathname]
  );

  return (
    <div className="flex h-full min-h-screen bg-slate-950 text-slate-100">
      <Sidebar
        collapsed={isCollapsed}
        navigationItems={navigationItems}
        onToggleCollapse={() => setIsCollapsed((current) => !current)}
      />

      <div className="flex h-full flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-slate-900/80 bg-slate-950/80 px-6 py-4 backdrop-blur">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {activeItem?.label ?? 'Welcome'}
            </p>
            {activeItem?.description && (
              <p className="mt-1 text-sm text-slate-400">{activeItem.description}</p>
            )}
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col">
          <section className="flex-1 overflow-y-auto bg-slate-950 min-h-0">
            <Outlet />
          </section>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
