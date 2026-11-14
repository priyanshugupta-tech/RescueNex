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
      <div className="w-full max-w-[1700px] mx-auto px-9 sm:px-16 lg:px-20 pt-12 pb-8">
        
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-8 border-b border-[#21262D]">
          
          {/* Col 1 & 2: Brand Identity, Logo & Tagline */}
          <div className="lg:col-span-2 space-y-2 pr-0 lg:pr-6">
            <div 
              className="flex items-center gap-4 cursor-pointer select-none group"
              onClick={() => onSelectTab('hud')}
            >
              <img 
                src="/logo/rescuenex_emblem.png" 
                alt="RescueNex" 
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-md transition-transform group-hover:scale-105"
              />
              <span className="font-extrabold text-2xl sm:text-3xl tracking-tight text-white font-sans">
                Rescue<span className="text-amber-400">Nex</span>
              </span>
            </div>

            <p className="text-sm font-semibold text-slate-200">
              Real-Time Landslide Risk Analytics & Early Warning Platform
            </p>
          </div>

          {/* Col 3: Navigation */}
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
            </ul>
          </div>

        </div>

        {/* Bottom Sub-Footer Bar */}
        <div className="pt-4 flex items-center justify-between text-xs text-slate-500 font-sans">
          <span>© 2026 RescueNex. All rights reserved.</span>
        </div>

      </div>
    </footer>
  );
};