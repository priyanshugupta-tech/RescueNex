import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { 
  Activity, 
  MapPin, 
  AlertTriangle, 
  TrendingUp, 
  ShieldCheck, 
  LogOut, 
  User as UserIcon,
  Radio,
  Cpu
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  activeAlertCount: number;
  liveGps: { lat: number | null; lon: number | null; fix: boolean };
  aiOnline: boolean;
  wsConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  activeAlertCount,
  liveGps,
  aiOnline,
  wsConnected
}) => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
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

        {/* Center: Live GPS & Telemetry Gateway Status Badges (100% Dynamic, zero hardcoding) */}
        <div className="hidden lg:flex items-center gap-3">
          
          {/* Dynamic GPS Fix Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono shadow-sm">
            <MapPin className={`w-4 h-4 shrink-0 ${liveGps.fix ? 'text-sky-400' : 'text-amber-400 animate-pulse'}`} />
            <span className="text-slate-300">
              GPS:{' '}
              {liveGps.lat !== null && liveGps.lon !== null && liveGps.fix ? (
                <span className="text-white font-medium">
                  {liveGps.lat.toFixed(4)}°N, {liveGps.lon.toFixed(4)}°E
                </span>
              ) : (
                <span className="text-amber-300/80 font-medium animate-pulse">
                  Searching Live Node GPS...
                </span>
              )}
            </span>
          </div>

          {/* WebSocket Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono shadow-sm">
            <Radio className={`w-4 h-4 shrink-0 ${wsConnected ? 'text-emerald-400' : 'text-rose-400 animate-pulse'}`} />
            <span className="text-slate-400">Telemetry:</span>
            <span className={wsConnected ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
              {wsConnected ? 'LIVE' : 'DISCONNECTED'}
            </span>
          </div>

          {/* AI Microservice Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono shadow-sm">
            <Cpu className={`w-4 h-4 shrink-0 ${aiOnline ? 'text-emerald-400' : 'text-slate-500'}`} />
            <span className="text-slate-400">AI Engine:</span>
            <span className={aiOnline ? 'text-emerald-400 font-medium' : 'text-slate-400 font-medium'}>
              {aiOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>

        {/* Right: Functional Navigation & Auth Buttons (Consistent w-4 h-4 icons) */}
        <div className="flex items-center gap-2">
          <nav className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800/80">
            <button
              onClick={() => onSelectTab('hud')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-medium transition-colors ${
                currentTab === 'hud'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Mission HUD</span>
            </button>

            <button
              onClick={() => onSelectTab('alerts')}
              className={`relative flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-medium transition-colors ${
                currentTab === 'alerts'
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Alerts</span>
              {activeAlertCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                  {activeAlertCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectTab('analytics')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-medium transition-colors ${
                currentTab === 'analytics'
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Analytics</span>
            </button>

            {user?.role === 'ADMIN' && (
              <button
                onClick={() => onSelectTab('admin')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-medium transition-colors ${
                  currentTab === 'admin'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>HQ Command</span>
              </button>
            )}
          </nav>

          {/* User Profile / Login */}
          {user ? (
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-slate-200">{user.userName}</p>
                <p className="text-[10px] font-mono text-amber-400 uppercase font-semibold">
                  {user.role} {user.agency ? `• ${user.agency}` : ''}
                </p>
              </div>
              <button
                onClick={logout}
                title="Logout"
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => onSelectTab('auth')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-medium transition-colors ml-1"
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
