import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { LogOut, User as UserIcon } from 'lucide-react';
import { motion } from 'framer-motion';

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
    <header className="sticky top-0 z-50 bg-[#0D1117]/95 backdrop-blur-md border-b border-[#21262D] px-9 sm:px-16 lg:px-20 py-3 transition-all">
      <div className="w-full max-w-[1700px] mx-auto flex items-center justify-between">
        
        {/* Left: Brand Identity with Large, Borderless Merged Emblem */}
        <motion.div 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-3.5 cursor-pointer select-none" 
          onClick={() => onSelectTab('landing')}
        >
          <img 
            src="/logo/rescuenex_emblem.png" 
            alt="RescueNex" 
            className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-md"
          />
          <div className="flex flex-col">
            <span className="font-extrabold text-2xl sm:text-3xl tracking-tight text-white font-sans leading-none">
              Rescue<span className="text-amber-400">Nex</span>
            </span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mt-1 hidden sm:block">
              Geotechnical Early Warning
            </span>
          </div>
        </motion.div>

        {/* Center: Borderless Navigation Links with Active Underline */}
        <nav className="hidden md:flex items-center gap-8 lg:gap-10">
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
              <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white animate-pulse">
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
                className="p-2.5 rounded-lg bg-[#161B22] border border-[#30363D] text-slate-400 hover:text-rose-400 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => onSelectTab('auth')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#161B22] hover:bg-[#21262D] text-slate-200 border border-[#30363D] text-xs font-semibold transition-all hover:border-slate-500 shadow-sm"
            >
              <UserIcon className="w-4 h-4 text-amber-400" />
              <span>Sign In</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
