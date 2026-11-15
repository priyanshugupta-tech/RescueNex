import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';

interface FooterProps {
  activeAlertCount?: number;
}

export const Footer: React.FC<FooterProps> = ({ activeAlertCount = 0 }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <footer className="border-t border-[#21262D] bg-[#0D1117] text-slate-400 font-sans mt-auto">
      <div className="w-full max-w-[1700px] mx-auto px-9 sm:px-16 lg:px-20 pt-12 pb-8">
        
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-8 border-b border-[#21262D]">
          
          {/* Col 1 & 2: Brand Identity, Logo & Tagline */}
          <div className="lg:col-span-2 space-y-3 pr-0 lg:pr-6">
            <div 
              className="flex items-center gap-3.5 cursor-pointer select-none group"
              onClick={() => navigate('/')}
            >
              <img 
                src="/assets/logo/rescuenex_emblem.svg" 
                alt="RescueNex" 
                className="w-12 h-12 sm:w-14 sm:h-14 object-contain drop-shadow-md transition-transform group-hover:scale-105"
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
                  onClick={() => navigate('/')}
                  className="hover:text-amber-400 transition-colors text-left"
                >
                  Overview
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="hover:text-amber-400 transition-colors text-left"
                >
                  Dashboard
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/alerts')}
                  className="hover:text-rose-400 transition-colors flex items-center gap-2 text-left"
                >
                  <span>Alerts</span>
                  {activeAlertCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-none text-[10px] font-bold bg-rose-600 text-white">
                      {activeAlertCount}
                    </span>
                  )}
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/analytics')}
                  className="hover:text-sky-400 transition-colors text-left"
                >
                  Analytics
                </button>
              </li>
              {user?.role === 'ADMIN' && (
                <li>
                  <button
                    onClick={() => navigate('/admin')}
                    className="hover:text-amber-400 transition-colors text-left"
                  >
                    Admin
                  </button>
                </li>
              )}
              {!user && (
                <li>
                  <button
                    onClick={() => navigate('/auth')}
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
                  onClick={() => navigate('/terms')}
                  className="hover:text-white transition-colors text-left"
                >
                  Terms of Service
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/privacy')}
                  className="hover:text-white transition-colors text-left"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/sop')}
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
            <ul className="space-y-2 text-xs text-slate-400 font-mono">
              <li>
                <span>Slope Tilt Sensors (X/Y)</span>
              </li>
              <li>
                <span>Soil Moisture Probes</span>
              </li>
              <li>
                <span>Live Rainfall Ingestion</span>
              </li>
              <li>
                <span>Seismic Acceleration RMS</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Sub-Footer Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 font-sans gap-2">
          <span>© 2026 RescueNex Platform. All rights reserved.</span>
        </div>

      </div>
    </footer>
  );
};
