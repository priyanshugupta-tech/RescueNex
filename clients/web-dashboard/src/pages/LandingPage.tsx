import React from 'react';
import { MountainSector, SectorWeatherData } from '../types/index.ts';
import { 
  Activity, 
  AlertTriangle, 
  Compass, 
  Droplets, 
  CloudRain, 
  Radio, 
  ShieldCheck, 
  Lock, 
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

interface LandingPageProps {
  sectors: MountainSector[];
  weather: SectorWeatherData | null;
  isAuthenticated: boolean;
  onNavigate: (tab: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  sectors,
  weather,
  isAuthenticated,
  onNavigate
}) => {
  return (
    <div className="space-y-16 py-4">
      
      {/* 1. Hero Section */}
      <section className="relative rounded-3xl bg-[#161B22] border border-[#30363D] p-8 sm:p-14 overflow-hidden">
        <div className="max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0D1117] border border-[#30363D] text-xs font-mono text-amber-400">
            <span>NH-44 Strategic Highway Corridor</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight font-sans">
            Real-Time Landslide Risk Analytics & Early Warning Platform
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-sans">
            Autonomous geotechnical monitoring, predictive slope stability intelligence, and emergency early warning across critical mountainous highway transit corridors.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-3">
            <button
              onClick={() => onNavigate(isAuthenticated ? 'hud' : 'auth')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition shadow"
            >
              <span>{isAuthenticated ? 'Open Live Dashboard' : 'Sign In to Access Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                const el = document.getElementById('sectors-overview');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#21262D] hover:bg-[#30363D] text-slate-200 font-semibold text-sm transition border border-[#30363D]"
            >
              <span>View Monitored Sectors</span>
            </button>
          </div>
        </div>

        {/* Quick Highlights Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-12 pt-8 border-t border-[#21262D]">
          <div>
            <p className="text-2xl font-bold font-mono text-white">5</p>
            <p className="text-xs text-slate-400 mt-0.5">High-Risk Mountain Sectors</p>
          </div>
          <div>
            <p className="text-2xl font-bold font-mono text-white">&lt; 1s</p>
            <p className="text-xs text-slate-400 mt-0.5">Live Telemetry Latency</p>
          </div>
          <div>
            <p className="text-2xl font-bold font-mono text-white">24 / 7</p>
            <p className="text-xs text-slate-400 mt-0.5">Continuous IMU Ingestion</p>
          </div>
          <div>
            <p className="text-2xl font-bold font-mono text-white">CAP v1.2</p>
            <p className="text-xs text-slate-400 mt-0.5">Standard Alert Protocol</p>
          </div>
        </div>
      </section>

      {/* 2. Live Monitored Mountain Sectors Section */}
      <section id="sectors-overview" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-[#21262D] pb-4">
          <div>
            <h2 className="text-xl font-bold text-white font-sans flex items-center gap-2">
              <Radio className="w-5 h-5 text-sky-400" />
              <span>Monitored Mountain Sectors</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Active observation zones equipped with hardware sensor nodes along strategic mountain corridors.
            </p>
          </div>

          <span className="text-xs font-mono text-slate-400">
            {sectors.length} Operational Sectors
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sectors.map((sector) => (
            <div 
              key={sector.id} 
              className="p-5 rounded-xl bg-[#161B22] border border-[#30363D] flex flex-col justify-between space-y-4 hover:border-slate-600 transition"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-mono text-slate-400">{sector.highway} • {sector.kmMarker}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    sector.currentRiskLevel === 'CRITICAL'
                      ? 'bg-rose-600 text-white'
                      : sector.currentRiskLevel === 'WARNING'
                      ? 'bg-amber-600 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}>
                    {sector.currentRiskLevel}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white font-sans">{sector.name}</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Elevation: {sector.elevationM}m • Slope: {sector.slopeDegrees}° • Soil: {sector.soilType}
                </p>
              </div>

              <div className="pt-3 border-t border-[#21262D] flex items-center justify-between text-xs font-mono text-slate-300">
                <span>LSI Risk Index:</span>
                <span className="font-bold text-white">{sector.lsiScore} / 100</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Core Platform Capabilities */}
      <section className="space-y-6">
        <div className="border-b border-[#21262D] pb-4">
          <h2 className="text-xl font-bold text-white font-sans flex items-center gap-2">
            <Activity className="w-5 h-5 text-amber-400" />
            <span>Platform Capabilities</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Engineered for high reliability, autonomous decision support, and immediate hazard response.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-6 rounded-xl bg-[#161B22] border border-[#30363D] space-y-3">
            <Compass className="w-6 h-6 text-sky-400" />
            <h3 className="text-sm font-bold text-white font-sans">Slope Tilt Inclinometry</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Continuous bi-axial tilt tracking and root-mean-square acceleration capture minute geotechnical shear and creep prior to catastrophic slope failure.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-[#161B22] border border-[#30363D] space-y-3">
            <Droplets className="w-6 h-6 text-sky-400" />
            <h3 className="text-sm font-bold text-white font-sans">Soil Moisture & Saturation</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Volumetric water content sensing measures pore-water pressure buildup and soil saturation, key triggers for debris flows and rockslides.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-[#161B22] border border-[#30363D] space-y-3">
            <CloudRain className="w-6 h-6 text-sky-400" />
            <h3 className="text-sm font-bold text-white font-sans">Meteorological Sync</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Real-time precipitation rates and 7-day cumulative rainfall indices are matched against geotechnical vulnerability models for proactive risk projection.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Secure Access / Auth Callout */}
      <section className="p-8 rounded-2xl bg-[#161B22] border border-[#30363D] flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
            <Lock className="w-4 h-4" />
            <span>Role-Based Access Control</span>
          </div>
          <h3 className="text-lg font-bold text-white font-sans">
            Protected Command & Early Warning Operations
          </h3>
          <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
            Live telemetry controls, acoustic siren interlock override, and official alert issuance require authenticated operator or administrator credentials.
          </p>
        </div>

        <button
          onClick={() => onNavigate(isAuthenticated ? 'hud' : 'auth')}
          className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs whitespace-nowrap transition"
        >
          {isAuthenticated ? 'Go to Operations Dashboard' : 'Sign In / Register'}
        </button>
      </section>

    </div>
  );
};