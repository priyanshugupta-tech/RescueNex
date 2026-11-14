import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { 
  Activity, 
  AlertTriangle, 
  TrendingUp, 
  ShieldCheck, 
  LogOut, 
  User as UserIcon
} from 'lucide-react';

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
    <header className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 px-6 sm:px-10 py-4 shadow-lg shadow-black/40">
      <div className="w-full max-w-[1700px] mx-auto flex items-center justify-between gap-6">
        
        {/* Left: Brand Identity with prominent, clean logo */}
        <div 
          className="flex items-center gap-3.5 cursor-pointer select-none group" 
          onClick={() => onSelectTab('hud')}
        >
          <img 
            src="/logo/rescuenex_emblem.jpg" 
            alt="RescueNex Logo" 
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl border border-slate-700/80 object-cover shadow-md group-hover:border-amber-400/50 transition-colors"
          />
          <div className="flex items-center">
            <span className="font-extrabold text-2xl tracking-tight text-white font-sans">
              Rescue<span className="text-amber-400">Nex</span>
            </span>
          </div>
        </div>

        {/* Right: Functional Navigation & Auth Buttons */}
        <div className="flex items-center gap-3">
          <nav className="flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800/80 shadow-inner">
            <button
              onClick={() => onSelectTab('hud')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                currentTab === 'hud'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Mission HUD</span>
            </button>

            <button
              onClick={() => onSelectTab('alerts')}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                currentTab === 'alerts'
                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Alerts</span>
              {activeAlertCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white shadow">
                  {activeAlertCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectTab('analytics')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                currentTab === 'analytics'
                  ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Analytics</span>
            </button>

            {user?.role === 'ADMIN' && (
              <button
                onClick={() => onSelectTab('admin')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                  currentTab === 'admin'
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>HQ Command</span>
              </button>
            )}
          </nav>

          {/* User Profile / Login */}
          {user ? (
            <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-slate-200">{user.userName}</p>
                <p className="text-[10px] font-mono text-amber-400 uppercase font-semibold">
                  {user.role} {user.agency ? `• ${user.agency}` : ''}
                </p>
              </div>
              <button
                onClick={logout}
                title="Logout"
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition-colors shadow-sm"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => onSelectTab('auth')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-medium transition-colors shadow-sm"
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
