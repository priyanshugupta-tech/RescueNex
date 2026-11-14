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
          <nav className="flex items-center gap-1.5 bg-slate-900/95 p-1.5 rounded-xl border border-slate-800 shadow-lg shadow-black/40">
            <button
              onClick={() => onSelectTab('hud')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs transition-all ${
                currentTab === 'hud'
                  ? 'bg-gradient-to-b from-amber-500 via-amber-600 to-amber-700 text-white font-bold border-t border-amber-300/80 border-x border-amber-600 border-b border-amber-950 shadow-lg shadow-black/50 ring-1 ring-amber-400/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80 font-medium'
              }`}
            >
              <Activity className={`w-4 h-4 ${currentTab === 'hud' ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' : 'text-slate-400'}`} />
              <span className={currentTab === 'hud' ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] tracking-wide' : ''}>Mission HUD</span>
            </button>

            <button
              onClick={() => onSelectTab('alerts')}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-xs transition-all ${
                currentTab === 'alerts'
                  ? 'bg-gradient-to-b from-rose-500 via-rose-600 to-rose-700 text-white font-bold border-t border-rose-300/80 border-x border-rose-600 border-b border-rose-950 shadow-lg shadow-black/50 ring-1 ring-rose-400/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80 font-medium'
              }`}
            >
              <AlertTriangle className={`w-4 h-4 ${currentTab === 'alerts' ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' : 'text-slate-400'}`} />
              <span className={currentTab === 'alerts' ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] tracking-wide' : ''}>Alerts</span>
              {activeAlertCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-white text-rose-700 shadow-md">
                  {activeAlertCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectTab('analytics')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs transition-all ${
                currentTab === 'analytics'
                  ? 'bg-gradient-to-b from-sky-500 via-sky-600 to-sky-700 text-white font-bold border-t border-sky-300/80 border-x border-sky-600 border-b border-sky-950 shadow-lg shadow-black/50 ring-1 ring-sky-400/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80 font-medium'
              }`}
            >
              <TrendingUp className={`w-4 h-4 ${currentTab === 'analytics' ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' : 'text-slate-400'}`} />
              <span className={currentTab === 'analytics' ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] tracking-wide' : ''}>Analytics</span>
            </button>

            {user?.role === 'ADMIN' && (
              <button
                onClick={() => onSelectTab('admin')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs transition-all ${
                  currentTab === 'admin'
                    ? 'bg-gradient-to-b from-amber-500 via-amber-600 to-amber-700 text-white font-bold border-t border-amber-300/80 border-x border-amber-600 border-b border-amber-950 shadow-lg shadow-black/50 ring-1 ring-amber-400/50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80 font-medium'
                }`}
              >
                <ShieldCheck className={`w-4 h-4 ${currentTab === 'admin' ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' : 'text-amber-400'}`} />
                <span className={currentTab === 'admin' ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] tracking-wide' : ''}>HQ Command</span>
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
