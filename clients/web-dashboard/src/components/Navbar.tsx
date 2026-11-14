import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { LogOut, User as UserIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface NavbarProps {
  onProtectedNavigate: (path: string) => void;
  activeAlertCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onProtectedNavigate,
  activeAlertCount
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const getUserDisplayName = (u: any): string => {
    if (!u) return '';
    if (u.fullName && u.fullName.trim() !== '') return u.fullName;
    if (u.name && u.name.trim() !== '') return u.name;

    const email = (u.email || '').toLowerCase();
    const raw = (u.userName || u.email || '').replace(/_oauth$/i, '').toLowerCase();

    if (email.includes('priyanshu') || raw.includes('priyanshu') || raw.startsWith('pg729')) {
      return 'Priyanshu Gupta';
    }

    const clean = raw.split('@')[0];
    return clean
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[._-]+/g, ' ')
      .replace(/\b\w/g, (c: string) => c.toUpperCase());
  };

  const handleNavClick = (path: string, requiresAuth = false) => {
    if (requiresAuth && !user) {
      onProtectedNavigate(path);
      return;
    }
    navigate(path);
  };

  const currentPath = location.pathname;

  return (
    <header className="sticky top-0 z-50 bg-[#0D1117]/95 backdrop-blur-md border-b border-[#21262D] px-9 sm:px-16 lg:px-20 py-2 transition-all">
      <div className="w-full max-w-[1700px] mx-auto flex items-center justify-between">
        
        {/* Left: Authentic Geometric Brand Logo & Title */}
        <motion.div 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-3 cursor-pointer select-none" 
          onClick={() => navigate('/')}
        >
          <img 
            src="/assets/logo/rescuenex_emblem.svg" 
            alt="RescueNex" 
            className="w-10 h-10 sm:w-11 sm:h-11 object-contain drop-shadow-md"
          />
          <span className="font-extrabold text-2xl tracking-tight text-white font-sans leading-none">
            Rescue<span className="text-amber-400">Nex</span>
          </span>
        </motion.div>

        {/* Center: Borderless Navigation Links with Real URL Matching & Active Underline */}
        <nav className="hidden md:flex items-center gap-8 lg:gap-10">
          <button
            onClick={() => handleNavClick('/')}
            className={`text-sm transition-colors pb-1.5 pt-1 border-b-2 ${
              currentPath === '/'
                ? 'text-white border-amber-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 border-transparent font-medium'
            }`}
          >
            Overview
          </button>

          <button
            onClick={() => handleNavClick('/dashboard', true)}
            className={`text-sm transition-colors pb-1.5 pt-1 border-b-2 ${
              currentPath === '/dashboard'
                ? 'text-white border-amber-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 border-transparent font-medium'
            }`}
          >
            Dashboard
          </button>

          <button
            onClick={() => handleNavClick('/alerts', true)}
            className={`text-sm transition-colors pb-1.5 pt-1 border-b-2 flex items-center ${
              currentPath === '/alerts'
                ? 'text-white border-amber-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 border-transparent font-medium'
            }`}
          >
            <span>Alerts</span>
            {activeAlertCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-none text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                {activeAlertCount}
              </span>
            )}
          </button>

          {user && (
            <button
              onClick={() => handleNavClick('/analytics', true)}
              className={`text-sm transition-colors pb-1.5 pt-1 border-b-2 ${
                currentPath === '/analytics'
                  ? 'text-white border-amber-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 border-transparent font-medium'
              }`}
            >
              Analytics
            </button>
          )}

          {user?.role === 'ADMIN' && (
            <button
              onClick={() => handleNavClick('/admin', true)}
              className={`text-sm transition-colors pb-1.5 pt-1 border-b-2 ${
                currentPath === '/admin'
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
                <p className="text-xs font-semibold text-slate-200">
                  {getUserDisplayName(user)}
                </p>
                <p className="text-[10px] font-mono text-amber-400 uppercase font-semibold">
                  {user.role} {user.agency ? `• ${user.agency}` : ''}
                </p>
              </div>
              <button
                onClick={logout}
                title="Logout"
                className="p-2 rounded-none bg-[#161B22] border border-[#30363D] text-slate-400 hover:text-rose-400 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/auth')}
              className="flex items-center gap-2 px-4 py-2 rounded-none bg-[#161B22] hover:bg-[#21262D] text-slate-200 border border-[#30363D] text-xs font-semibold transition-all hover:border-slate-500 shadow-sm"
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
