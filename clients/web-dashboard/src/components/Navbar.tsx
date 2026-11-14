import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { LogOut, User as UserIcon } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  activeAlertCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  activeAlertCount
}) => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-[#0D1117]/95 backdrop-blur-md border-b border-[#21262D] px-6 sm:px-10 py-2.5">
      <div className="w-full max-w-[1700px] mx-auto flex items-center justify-between">
        
        {/* Left: Brand Identity with borderless merged emblem */}
        <div 
          className="flex items-center gap-3 cursor-pointer select-none" 
          onClick={() => onSelectTab('landing')}
        >
          <img 
            src="/logo/rescuenex_emblem.png" 
            alt="RescueNex" 
            className="w-12 h-12 object-contain"
          />
          <span className="font-extrabold text-2xl tracking-tight text-white font-sans">
            Rescue<span className="text-amber-400">Nex</span>
          </span>
        </div>

        {/* Center: Borderless Navigation Links with Active Underline */}
        <nav className="hidden md:flex items-center gap-8">
          <button
            onClick={() => onSelectTab('landing')}
            className={`text-sm transition-colors pb-1.5 pt-1 border-b-2 ${
              currentTab === 'landing'
                ? 'text-white border-amber-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 border-transparent font-medium'
            }`}
          >
            Overview
          </button>

          <button
            onClick={() => onSelectTab('hud')}
            className={`text-sm transition-colors pb-1.5 pt-1 border-b-2 ${
              currentTab === 'hud'
                ? 'text-white border-amber-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 border-transparent font-medium'
            }`}
          >
            Dashboard
          </button>

          <button
            onClick={() => onSelectTab('alerts')}
            className={`text-sm transition-colors pb-1.5 pt-1 border-b-2 flex items-center ${
              currentTab === 'alerts'
                ? 'text-white border-amber-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 border-transparent font-medium'
            }`}
          >
            <span>Alerts</span>
            {activeAlertCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-600 text-white">
                {activeAlertCount}
              </span>
            )}
          </button>

          {user && (
            <button
              onClick={() => onSelectTab('analytics')}
              className={`text-sm transition-colors pb-1.5 pt-1 border-b-2 ${
                currentTab === 'analytics'
                  ? 'text-white border-amber-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 border-transparent font-medium'
              }`}
            >
              Analytics
            </button>
          )}

          {user?.role === 'ADMIN' && (
            <button
              onClick={() => onSelectTab('admin')}
              className={`text-sm transition-colors pb-1.5 pt-1 border-b-2 ${
                currentTab === 'admin'
                  ? 'text-white border-amber-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 border-transparent font-medium'
              }`}
            >
              Admin
            </button>
          )}
        </nav>

        {/* Right: User Profile or Sign In */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-slate-200">{user.userName}</p>
                <p className="text-[10px] font-mono text-amber-400 uppercase font-semibold">
                  {user.role} {user.agency ? `• ${user.agency}` : ''}
                </p>
              </div>
              <button
                onClick={logout}
                title="Logout"
                className="p-2 rounded-lg bg-[#161B22] border border-[#30363D] text-slate-400 hover:text-rose-400 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => onSelectTab('auth')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#161B22] hover:bg-[#21262D] text-slate-200 border border-[#30363D] text-xs font-semibold transition-colors"
            >
              <UserIcon className="w-4 h-4" />
              <span>Sign In</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
