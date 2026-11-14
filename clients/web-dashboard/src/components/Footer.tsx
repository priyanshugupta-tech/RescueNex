import React from 'react';
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
    <footer className="border-t border-[#21262D] bg-[#0D1117] text-slate-400 font-sans mt-auto">
      <div className="w-full max-w-[1700px] mx-auto px-6 sm:px-10 pt-10 pb-8">
        
        {/* Main 4-Column Footer Grid - Zero Icon Clutter */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-8 border-b border-[#21262D]">
          
          {/* Col 1 & 2: Brand Identity, Logo, Tagline & Overview */}
          <div className="lg:col-span-2 space-y-3 pr-0 lg:pr-6">
            <div 
              className="flex items-center gap-3 cursor-pointer select-none group"
              onClick={() => onSelectTab('hud')}
            >
              <img 
                src="/logo/rescuenex_emblem.jpg" 
                alt="RescueNex Logo" 
                className="w-10 h-10 rounded-lg border border-slate-700 object-cover shadow-sm group-hover:border-amber-400 transition-colors"
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

            <div className="pt-1">
              <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#161B22] border border-[#30363D] text-[11px] font-mono text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Core Gateway: Active</span>
              </span>
            </div>
          </div>

          {/* Col 3: Navigation Modules - Simple & Relatable */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
              Navigation
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onSelectTab('hud')}
                  className="hover:text-amber-400 transition-colors text-left"
                >
                  Dashboard
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectTab('alerts')}
                  className="hover:text-rose-400 transition-colors flex items-center gap-2 text-left"
                >
                  <span>Alerts</span>
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
                  className="hover:text-sky-400 transition-colors text-left"
                >
                  Analytics
                </button>
              </li>
              {user?.role === 'ADMIN' ? (
                <li>
                  <button
                    onClick={() => onSelectTab('admin')}
                    className="hover:text-amber-400 transition-colors text-left"
                  >
                    Admin
                  </button>
                </li>
              ) : (
                <li>
                  <button
                    onClick={() => onSelectTab('auth')}
                    className="hover:text-amber-400 transition-colors text-left"
                  >
                    Sign In
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* Col 4: Legal & Policies */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
              Legal & Policies
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

          {/* Col 5: Sensor Feeds */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
              Sensor Feeds
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <span>Slope Tilt Sensors (X/Y)</span>
              </li>
              <li>
                <span>Soil Moisture Sensors</span>
              </li>
              <li>
                <span>Live Rainfall Tracking</span>
              </li>
              <li className="text-slate-500 font-mono text-[11px]">
                <span>Corridor: NH-44 Highway</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Sub-Footer Bar */}
        <div className="pt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-sans">
          <div>
            <span>© 2026 RescueNex. All rights reserved.</span>
          </div>

          <div className="font-mono text-[11px] text-slate-400">
            <span>Real-Time Landslide Risk Analytics & Early Warning Platform</span>
          </div>
        </div>

      </div>
    </footer>
  );
};