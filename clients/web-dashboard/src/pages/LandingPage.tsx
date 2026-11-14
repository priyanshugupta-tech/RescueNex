import React from 'react';
import { MountainSector, SectorWeatherData } from '../types/index.ts';
import { 
  Activity, 
  Compass, 
  Droplets, 
  CloudRain, 
  ShieldCheck, 
  Lock, 
  ArrowRight,
  Cpu,
  Layers,
  Radio,
  BellRing
} from 'lucide-react';

interface LandingPageProps {
  sectors: MountainSector[];
  weather: SectorWeatherData | null;
  isAuthenticated: boolean;
  onNavigate: (tab: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  isAuthenticated,
  onNavigate
}) => {
  return (
    <div className="space-y-16 py-4">
      
      {/* 1. Hero Section */}
      <section className="relative rounded-3xl bg-[#161B22] border border-[#30363D] p-8 sm:p-14 overflow-hidden">
        <div className="max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0D1117] border border-[#30363D] text-xs font-mono text-amber-400">
            <span>Mountain Transit Hazard Monitoring</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight font-sans">
            Real-Time Landslide Risk Analytics & Early Warning Platform
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-sans">
            Geotechnical monitoring, predictive slope stability intelligence, and early warning analytics for critical mountain transit corridors.
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
                const el = document.getElementById('operational-workflow');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#21262D] hover:bg-[#30363D] text-slate-200 font-semibold text-sm transition border border-[#30363D]"
            >
              <span>View System Workflow</span>
            </button>
          </div>
        </div>

        {/* Operational Highlights Grid - Generic & Realistic */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-12 pt-8 border-t border-[#21262D]">
          <div>
            <p className="text-xl font-bold font-mono text-white">Multi-Sensor</p>
            <p className="text-xs text-slate-400 mt-0.5">Geotechnical Ingestion</p>
          </div>
          <div>
            <p className="text-xl font-bold font-mono text-white">Continuous</p>
            <p className="text-xs text-slate-400 mt-0.5">Dynamic Risk Scoring</p>
          </div>
          <div>
            <p className="text-xl font-bold font-mono text-white">Automated</p>
            <p className="text-xs text-slate-400 mt-0.5">Early Warning Protocols</p>
          </div>
          <div>
            <p className="text-xl font-bold font-mono text-white">Role-Based</p>
            <p className="text-xs text-slate-400 mt-0.5">Access Control & Audit</p>
          </div>
        </div>
      </section>

      {/* 2. Operational Workflow & Architecture Section (Replaces Monitored Sectors Grid) */}
      <section id="operational-workflow" className="space-y-6">
        <div className="border-b border-[#21262D] pb-4">
          <h2 className="text-xl font-bold text-white font-sans flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            <span>Operational Workflow & Architecture</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            An end-to-end pipeline linking physical slope sensors to actionable civil protection alerts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Step 1 */}
          <div className="p-6 rounded-xl bg-[#161B22] border border-[#30363D] space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-lg bg-[#0D1117] border border-[#21262D] text-amber-400">
                  <Cpu className="w-5 h-5" />
                </div>
                <span className="text-xs font-mono font-bold text-slate-500">STAGE 01</span>
              </div>
              <h3 className="text-sm font-bold text-white font-sans">Edge Telemetry & Sensing</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans mt-2">
                Stationary hardware nodes measure slope tilt deviation, root-mean-square vibration, volumetric soil moisture, and local weather station precipitation rates.
              </p>
            </div>
            <div className="pt-3 border-t border-[#21262D] text-[11px] font-mono text-slate-400">
              Bi-axial Inclinometry • Soil Saturation
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-xl bg-[#161B22] border border-[#30363D] space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-lg bg-[#0D1117] border border-[#21262D] text-sky-400">
                  <Activity className="w-5 h-5" />
                </div>
                <span className="text-xs font-mono font-bold text-slate-500">STAGE 02</span>
              </div>
              <h3 className="text-sm font-bold text-white font-sans">Risk Assessment & Analytics</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans mt-2">
                The Core Gateway calculates the Landslide Susceptibility Index (LSI) by evaluating slope inclination, pore-water pressure saturation, and cumulative rainfall thresholds.
              </p>
            </div>
            <div className="pt-3 border-t border-[#21262D] text-[11px] font-mono text-slate-400">
              LSI Computation • Stability Matrix
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-6 rounded-xl bg-[#161B22] border border-[#30363D] space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-lg bg-[#0D1117] border border-[#21262D] text-rose-400">
                  <BellRing className="w-5 h-5" />
                </div>
                <span className="text-xs font-mono font-bold text-slate-500">STAGE 03</span>
              </div>
              <h3 className="text-sm font-bold text-white font-sans">Early Warning & Response</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans mt-2">
                When thresholds indicate hazard conditions, the system issues regional advisories, multilingual broadcasts in local dialects, and triggers siren interlock warnings.
              </p>
            </div>
            <div className="pt-3 border-t border-[#21262D] text-[11px] font-mono text-slate-400">
              Multilingual Bulletins • Siren Interlock
            </div>
          </div>
        </div>
      </section>

      {/* 3. Core Sensor Capabilities */}
      <section className="space-y-6">
        <div className="border-b border-[#21262D] pb-4">
          <h2 className="text-xl font-bold text-white font-sans flex items-center gap-2">
            <Radio className="w-5 h-5 text-amber-400" />
            <span>Field Sensor Capabilities</span>
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
              Continuous bi-axial tilt tracking and acceleration capture minute geotechnical shear and creep prior to catastrophic slope failure.
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
              Precipitation rates and cumulative rainfall indices are matched against geotechnical vulnerability models for proactive risk projection.
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
