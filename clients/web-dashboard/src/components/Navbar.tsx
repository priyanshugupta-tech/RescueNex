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
  liveGps: { lat: number; lon: number; fix: boolean };
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
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onSelectTab('hud')}>
          <img 
            src="/logo/rescuenex_emblem.jpg" 
            alt="RescueNex" 
            className="w-9 h-9 rounded-lg border border-slate-700/60 object-cover shadow-sm"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-white font-sans">
                Rescue<span className="text-amber-400">Nex</span>
              </span>
              <span className="text-[10px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                NH-44 J&K
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans tracking-wide">
              Autonomous Landslide Early Warning
            </p>
          </div>
        </div>

        {/* Center: Live GPS & Telemetry Gateway Status Badges */}
        <div className="hidden md:flex items-center gap-3">
          {/* Dynamic GPS Fix Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono">
            <MapPin className={`w-3.5 h-3.5 ${liveGps.fix ? 'text-sky-400' : 'text-amber-400 animate-pulse'}`} />
            <span className="text-slate-300">
              GPS: <span className="text-white font-medium">{liveGps.lat.toFixed(4)}°N, {liveGps.lon.toFixed(4)}°E</span>
            </span>
          </div>

          {/* WebSocket Status */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono">
            <Radio className={`w-3.5 h-3.5 ${wsConnected ? 'text-emerald-400' : 'text-rose-400 animate-pulse'}`} />
            <span className="text-slate-400">Telemetry:</span>
            <span className={wsConnected ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
              {wsConnected ? 'LIVE' : 'RECONNECTING'}
            </span>
          </div>

          {/* AI Microservice Status */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono">
            <Cpu className={`w-3.5 h-3.5 ${aiOnline ? 'text-emerald-400' : 'text-slate-500'}`} />
            <span className="text-slate-400">AI Engine:</span>
            <span className={aiOnline ? 'text-emerald-400 font-medium' : 'text-slate-400 font-medium'}>
              {aiOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>

        {/* Right: Functional Navigation & Auth Buttons */}
        <div className="flex items-center gap-2">
          <nav className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800/80">
            <button
              onClick={() => onSelectTab('hud')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                currentTab === 'hud'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Mission HUD</span>
            </button>

            <button
              onClick={() => onSelectTab('alerts')}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                currentTab === 'alerts'
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Alerts</span>
              {activeAlertCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                  {activeAlertCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectTab('analytics')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                currentTab === 'analytics'
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Analytics</span>
            </button>

            {user?.role === 'ADMIN' && (
              <button
                onClick={() => onSelectTab('admin')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  currentTab === 'admin'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>HQ Command</span>
              </button>
            )}
          </nav>

          {/* User Profile / Login */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-medium text-slate-200">{user.userName}</p>
                <p className="text-[10px] font-mono text-amber-400 uppercase">{user.role} {user.agency ? `• ${user.agency}` : ''}</p>
              </div>
              <button
                onClick={logout}
                title="Logout"
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => onSelectTab('auth')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-medium transition-colors ml-1"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

        </div>
      </div>
    </header>
  );
};
