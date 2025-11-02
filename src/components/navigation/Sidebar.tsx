import { NavLink } from 'react-router-dom';
import type { ComponentType } from 'react';
import { RiMenuFoldLine, RiMenuUnfoldLine } from '@remixicon/react';

export type NavigationItem = {
  id: string;
  label: string;
  description?: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
};

export type SidebarProps = {
  collapsed: boolean;
  navigationItems: NavigationItem[];
  onToggleCollapse: () => void;
};

const Sidebar = ({ collapsed, navigationItems, onToggleCollapse }: SidebarProps) => {
  return (
    <aside
      className={`flex flex-col border-r border-slate-900/70 bg-slate-950/80 backdrop-blur transition-all duration-200 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="flex items-center justify-between px-4 pb-4 pt-6">
        {!collapsed && <h1 className="text-lg font-semibold">Nodex Toolkit</h1>}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="inline-flex items-center justify-center rounded-lg border border-slate-800 bg-slate-900/70 p-2 text-slate-300 transition-colors hover:text-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
        >
          {collapsed ? (
            <RiMenuUnfoldLine className="h-5 w-5" />
          ) : (
            <RiMenuFoldLine className="h-5 w-5" />
          )}
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-3 pb-6">
        {navigationItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-400/40'
                    : 'text-slate-400 hover:bg-slate-900/70 hover:text-slate-100'
                }`
              }
              end
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && (
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">{item.label}</span>
                  {item.description && (
                    <span className="text-xs font-normal text-slate-400">{item.description}</span>
                  )}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="px-4 pb-8 text-xs text-slate-500">
          <p className="font-medium text-slate-300">Network tools for your workspace</p>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
