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
    <header className="sticky top-0 z-50 bg-[#0D1117]/95 backdrop-blur-md border-b border-[#21262D] px-6 sm:px-10 py-3.5">
      <div className="w-full max-w-[1700px] mx-auto flex items-center justify-between gap-6">
        
        {/* Left: Brand Identity with prominent, clean logo */}
        <div 
          className="flex items-center gap-3 cursor-pointer select-none group" 
          onClick={() => onSelectTab('hud')}
        >
          <img 
            src="/logo/rescuenex_emblem.jpg" 
            alt="RescueNex Logo" 
            className="w-10 h-10 rounded-lg border border-slate-700 object-cover shadow-sm group-hover:border-amber-400 transition-colors"
          />
          <div className="flex items-center">
            <span className="font-extrabold text-2xl tracking-tight text-white font-sans">
              Rescue<span className="text-amber-400">Nex</span>
            </span>
          </div>
        </div>

        {/* Right: Simple, Relatable Navigation & Auth Buttons */}
        <div className="flex items-center gap-3">
          <nav className="flex items-center gap-1 bg-[#161B22] p-1 rounded-lg border border-[#30363D]">
            <button
              onClick={() => onSelectTab('hud')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                currentTab === 'hud'
                  ? 'bg-[#21262D] text-white border border-[#30363D]'
                  : 'text-slate-400 hover:text-white hover:bg-[#21262D]/50'
              }`}
            >
              <Activity className="w-4 h-4 text-amber-400" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => onSelectTab('alerts')}
              className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                currentTab === 'alerts'
                  ? 'bg-[#21262D] text-white border border-[#30363D]'
                  : 'text-slate-400 hover:text-white hover:bg-[#21262D]/50'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Alerts</span>
              {activeAlertCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-600 text-white">
                  {activeAlertCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectTab('analytics')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                currentTab === 'analytics'
                  ? 'bg-[#21262D] text-white border border-[#30363D]'
                  : 'text-slate-400 hover:text-white hover:bg-[#21262D]/50'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-sky-400" />
              <span>Analytics</span>
            </button>

            {user?.role === 'ADMIN' && (
              <button
                onClick={() => onSelectTab('admin')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  currentTab === 'admin'
                    ? 'bg-[#21262D] text-white border border-[#30363D]'
                    : 'text-slate-400 hover:text-white hover:bg-[#21262D]/50'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Admin</span>
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
                className="p-1.5 rounded-lg bg-[#161B22] border border-[#30363D] text-slate-400 hover:text-rose-400 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => onSelectTab('auth')}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#161B22] hover:bg-[#21262D] text-slate-200 border border-[#30363D] text-xs font-medium transition-colors"
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
