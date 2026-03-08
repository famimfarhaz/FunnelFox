import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Zap, Mail, Users, BarChart3, Ban, Menu, X } from 'lucide-react';

const Layout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/action', label: 'Action', icon: Zap },
    { to: '/campaigns', label: 'Campaigns', icon: Mail },
    { to: '/contacts', label: 'Contacts', icon: Users },
    { to: '/reports', label: 'Reports', icon: BarChart3 },
    { to: '/blocklist', label: 'Blocklist', icon: Ban },
  ];

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="flex min-h-screen bg-white">
      {/* Sidebar Overlay (Mobile Only) */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar (Desktop & Mobile Drawer) */}
      <aside className={`
        w-64 fixed h-full border-r border-slate-200 bg-slate-50/50 backdrop-blur-xl z-50 flex flex-col transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/fox.png" alt="FunnelFox Logo" className="w-10 h-10" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">FunnelFox</h1>
              <p className="text-sm text-slate-500">Agency Lead Gen</p>
            </div>
          </div>
          <button
            onClick={closeMobileMenu}
            className="p-2 -mr-2 text-slate-500 hover:text-slate-900 md:hidden"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
              onClick={closeMobileMenu}
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              <item.icon className="w-5 h-5" strokeWidth={1.5} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:pl-64 min-h-screen">
        {/* Header */}
        <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-20 flex items-center px-4 sm:px-6 justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleMobileMenu}
              className="p-2 -ml-2 text-slate-500 hover:text-slate-900 md:hidden"
              aria-label="Toggle menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900 truncate">
              Welcome back!
            </h2>
          </div>


        </header>

        {/* Page Content */}
        <div className="p-4 sm:p-6 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;