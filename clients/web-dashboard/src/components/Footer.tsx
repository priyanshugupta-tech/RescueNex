import React from 'react';
import { 
  Activity, 
  AlertTriangle, 
  TrendingUp, 
  ShieldCheck, 
  User as UserIcon, 
  Shield, 
  Radio, 
  Compass, 
  Droplets, 
  CloudRain,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface FooterProps {
  onSelectTab: (tab: any) => void;
  onOpenLegal: (tab: 'terms' | 'privacy' | 'sop') => void;
  activeAlertCount: number;
}

export const Footer: React.FC<FooterProps> = ({
  onSelectTab,
  onOpenLegal,
  activeAlertCount
}) => {
  const { user } = useAuth();

  return (
    <footer className="border-t border-slate-800/80 bg-slate-950 text-slate-400 font-sans mt-auto">
      <div className="w-full max-w-[1700px] mx-auto px-6 sm:px-10 pt-12 pb-8">
        
        {/* Main 4-Column Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-10 border-b border-slate-800/80">
          
          {/* Col 1 & 2: Brand Identity, Logo, Tagline & Overview */}
          <div className="lg:col-span-2 space-y-4 pr-0 lg:pr-6">
            <div 
              className="flex items-center gap-3.5 cursor-pointer select-none group"
              onClick={() => onSelectTab('hud')}
            >
              <img 
                src="/logo/rescuenex_emblem.jpg" 
                alt="RescueNex Logo" 
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl border border-slate-700/80 object-cover shadow-md group-hover:border-amber-400/50 transition-colors"
              />
              <span className="font-extrabold text-2xl tracking-tight text-white font-sans">
                Rescue<span className="text-amber-400">Nex</span>
              </span>
            </div>

            <p className="text-sm font-semibold text-slate-200">
              Real-Time Landslide Risk Analytics & Early Warning Platform
            </p>

            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Autonomous geotechnical monitoring, predictive slope stability intelligence, and emergency early warning across critical mountainous highway transit corridors.
            </p>

            <div className="pt-2">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono text-emerald-400 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Core Gateway Active • Live Sensor Ingestion</span>
              </span>
            </div>
          </div>

          {/* Col 3: Navigation Modules */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white font-mono flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span>Platform Modules</span>
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onSelectTab('hud')}
                  className="hover:text-amber-400 transition-colors flex items-center gap-2 text-left"
                >
                  <span>Mission HUD Dashboard</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectTab('alerts')}
                  className="hover:text-rose-400 transition-colors flex items-center gap-2 text-left"
                >
                  <span>Emergency Alerts</span>
                  {activeAlertCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-600 text-white">
                      {activeAlertCount}
                    </span>
                  )}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectTab('analytics')}
                  className="hover:text-sky-400 transition-colors flex items-center gap-2 text-left"
                >
                  <span>Geotechnical Analytics</span>
                </button>
              </li>
              {user?.role === 'ADMIN' ? (
                <li>
                  <button
                    onClick={() => onSelectTab('admin')}
                    className="hover:text-amber-400 transition-colors flex items-center gap-2 text-left"
                  >
                    <span>HQ Command Cell</span>
                  </button>
                </li>
              ) : (
                <li>
                  <button
                    onClick={() => onSelectTab('auth')}
                    className="hover:text-amber-400 transition-colors flex items-center gap-2 text-left"
                  >
                    <span>Operator Sign In</span>
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* Col 4: Legal & Operational Governance */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white font-mono flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-sky-400" />
              <span>Legal & Standards</span>
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onOpenLegal('terms')}
                  className="hover:text-white transition-colors text-left"
                >
                  Terms of Service
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenLegal('privacy')}
                  className="hover:text-white transition-colors text-left"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenLegal('sop')}
                  className="hover:text-white transition-colors text-left"
                >
                  Disaster Advisory & SOP
                </button>
              </li>
              <li>
                <span className="text-slate-500 font-mono text-[11px] block mt-1">
                  Common Alerting Protocol (CAP v1.2)
                </span>
              </li>
            </ul>
          </div>

          {/* Col 5: Geotechnical & Network Specifications */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white font-mono flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              <span>Telemetry Ingestion</span>
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-slate-500" />
                <span>Bi-Axial Slope Inclinometry</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5 text-slate-500" />
                <span>Volumetric Soil Saturation</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CloudRain className="w-3.5 h-3.5 text-slate-500" />
                <span>Live Open-Meteo Precipitation</span>
              </li>
              <li className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
                <span>Corridor: NH-44 J&K Strategic Highway</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Sub-Footer Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-sans">
          <div className="flex items-center gap-2">
            <span>© 2026 RescueNex Platform. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6 font-mono text-[11px] text-slate-400">
            <span>Real-Time Landslide Risk Analytics & Early Warning Platform</span>
          </div>
        </div>

      </div>
    </footer>
  );
};