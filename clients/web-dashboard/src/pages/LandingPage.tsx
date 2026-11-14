import React from 'react';
import { MountainSector, SectorWeatherData } from '../types/index.ts';
import { 
  Activity, 
  Compass, 
  Droplets, 
  CloudRain, 
  Lock, 
  ArrowRight,
  Cpu,
  Layers,
  Radio,
  BellRing,
  ShieldCheck,
  Radar
} from 'lucide-react';
import { motion } from 'framer-motion';

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
    <div className="space-y-20 py-4">
      
      {/* 1. Hero Section with Thematic Terrain/Seismic Radar Animation */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative rounded-3xl bg-[#161B22] border border-[#30363D] p-10 sm:p-16 lg:p-20 overflow-hidden shadow-2xl"
      >
        {/* Subtle Ambient Background Gradients */}
        <div className="absolute top-0 right-0 w-[550px] h-[550px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-[450px] h-[450px] bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Hero Content (Col 1-7) */}
          <div className="lg:col-span-7 space-y-6">
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight font-sans">
              Real-Time Landslide Risk Analytics & Early Warning Platform
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-sans max-w-2xl">
              Geotechnical monitoring, predictive slope stability intelligence, and early warning analytics for critical mountain transit corridors.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigate(isAuthenticated ? 'hud' : 'auth')}
                className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition shadow-lg shadow-amber-500/10"
              >
                <span>{isAuthenticated ? 'Open Live Dashboard' : 'Sign In to Access Dashboard'}</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  const el = document.getElementById('operational-workflow');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#21262D] hover:bg-[#30363D] text-slate-200 font-semibold text-sm transition border border-[#30363D]"
              >
                <span>View System Workflow</span>
              </motion.button>
            </div>
          </div>

          {/* Right Hero Visual: Thematic Geotechnical Slope & Radar Animation (Col 8-12) */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="relative w-72 h-72 sm:w-80 sm:h-80 rounded-2xl bg-[#0D1117]/80 border border-[#30363D] p-5 flex flex-col justify-between overflow-hidden shadow-inner backdrop-blur-sm">
              
              {/* Concentric Seismic Wave Radar Rings */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <motion.div 
                  animate={{ scale: [1, 1.4, 1.8], opacity: [0.6, 0.25, 0] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "easeOut" }}
                  className="absolute w-28 h-28 rounded-full border border-amber-400/40"
                />
                <motion.div 
                  animate={{ scale: [1, 1.35, 1.7], opacity: [0.5, 0.2, 0] }}
                  transition={{ duration: 3.5, repeat: Infinity, delay: 1.2, ease: "easeOut" }}
                  className="absolute w-28 h-28 rounded-full border border-sky-400/40"
                />
                <div className="w-56 h-56 rounded-full border border-slate-700/60" />
                <div className="w-40 h-40 rounded-full border border-slate-800" />
                <div className="w-24 h-24 rounded-full border border-slate-800" />
                
                {/* Rotating Sonar/Radar Sweep Line */}
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                  className="absolute w-56 h-56 rounded-full flex items-center justify-center"
                >
                  <div className="w-1/2 h-0.5 bg-gradient-to-r from-transparent via-amber-400/60 to-amber-400 ml-auto origin-left" />
                </motion.div>
              </div>

              {/* Top Radar HUD Bar */}
              <div className="relative z-10 flex items-center justify-between text-[11px] font-mono text-slate-400 border-b border-[#21262D] pb-2">
                <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                  <Radar className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
                  <span>SLOPE STABILITY SCAN</span>
                </span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                  ACTIVE
                </span>
              </div>

              {/* Center Radar Centerpoint & Animated Sensor Dots */}
              <div className="relative z-10 flex items-center justify-center py-6">
                <div className="relative">
                  <div className="w-4 h-4 rounded-full bg-amber-400/30 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-amber-400 shadow-lg shadow-amber-400/50" />
                  </div>
                  {/* Surrounding Active Field Nodes */}
                  <div className="absolute -top-10 -left-12 flex items-center gap-1 text-[9px] font-mono text-slate-300 bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>TILT 0.4°</span>
                  </div>
                  <div className="absolute top-12 -right-14 flex items-center gap-1 text-[9px] font-mono text-slate-300 bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                    <span>SOIL 31%</span>
                  </div>
                  <div className="absolute -bottom-8 -left-8 flex items-center gap-1 text-[9px] font-mono text-slate-300 bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>RMS 0.02g</span>
                  </div>
                </div>
              </div>

              {/* Bottom Radar Metrics Footer */}
              <div className="relative z-10 pt-2 border-t border-[#21262D] grid grid-cols-2 text-[10px] font-mono text-slate-400">
                <div>
                  <span className="text-slate-500 block">LSI COMPUTATION</span>
                  <span className="text-slate-200 font-bold">NOMINAL (STABLE)</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block">SENSOR SYNC</span>
                  <span className="text-emerald-400 font-bold">100% ONLINE</span>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Operational Highlights Grid - Generic & Realistic */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-14 pt-8 border-t border-[#21262D]">
          <div className="space-y-1">
            <p className="text-xl sm:text-2xl font-bold font-mono text-white">Multi-Sensor</p>
            <p className="text-xs text-slate-400">Geotechnical Ingestion</p>
          </div>
          <div className="space-y-1">
            <p className="text-xl sm:text-2xl font-bold font-mono text-white">Continuous</p>
            <p className="text-xs text-slate-400">Dynamic Risk Scoring</p>
          </div>
          <div className="space-y-1">
            <p className="text-xl sm:text-2xl font-bold font-mono text-white">Automated</p>
            <p className="text-xs text-slate-400">Early Warning Protocols</p>
          </div>
          <div className="space-y-1">
            <p className="text-xl sm:text-2xl font-bold font-mono text-white">Role-Based</p>
            <p className="text-xs text-slate-400">Access Control & Audit</p>
          </div>
        </div>
      </motion.section>

      {/* 2. Operational Workflow & Architecture Section */}
      <section id="operational-workflow" className="space-y-8">
        <div className="border-b border-[#21262D] pb-4">
          <h2 className="text-2xl font-bold text-white font-sans flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-amber-400" />
            <span>Operational Workflow & Architecture</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            An end-to-end pipeline linking physical slope sensors to actionable civil protection alerts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <motion.div 
            whileHover={{ y: -4 }}
            className="p-7 rounded-2xl bg-[#161B22] border border-[#30363D] space-y-4 flex flex-col justify-between hover:border-slate-500 transition-all shadow-md"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-[#0D1117] border border-[#21262D] text-amber-400">
                  <Cpu className="w-6 h-6" />
                </div>
                <span className="text-xs font-mono font-bold text-slate-500">STAGE 01</span>
              </div>
              <h3 className="text-base font-bold text-white font-sans">Edge Telemetry & Sensing</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans mt-2">
                Stationary hardware nodes measure slope tilt deviation, root-mean-square vibration, volumetric soil moisture, and local weather station precipitation rates.
              </p>
            </div>
            <div className="pt-4 border-t border-[#21262D] text-[11px] font-mono text-slate-400">
              Bi-axial Inclinometry • Soil Saturation
            </div>
          </motion.div>

          {/* Step 2 */}
          <motion.div 
            whileHover={{ y: -4 }}
            className="p-7 rounded-2xl bg-[#161B22] border border-[#30363D] space-y-4 flex flex-col justify-between hover:border-slate-500 transition-all shadow-md"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-[#0D1117] border border-[#21262D] text-sky-400">
                  <Activity className="w-6 h-6" />
                </div>
                <span className="text-xs font-mono font-bold text-slate-500">STAGE 02</span>
              </div>
              <h3 className="text-base font-bold text-white font-sans">Risk Assessment & Analytics</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans mt-2">
                The Core Gateway calculates the Landslide Susceptibility Index (LSI) by evaluating slope inclination, pore-water pressure saturation, and cumulative rainfall thresholds.
              </p>
            </div>
            <div className="pt-4 border-t border-[#21262D] text-[11px] font-mono text-slate-400">
              LSI Computation • Stability Matrix
            </div>
          </motion.div>

          {/* Step 3 */}
          <motion.div 
            whileHover={{ y: -4 }}
            className="p-7 rounded-2xl bg-[#161B22] border border-[#30363D] space-y-4 flex flex-col justify-between hover:border-slate-500 transition-all shadow-md"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-[#0D1117] border border-[#21262D] text-rose-400">
                  <BellRing className="w-6 h-6" />
                </div>
                <span className="text-xs font-mono font-bold text-slate-500">STAGE 03</span>
              </div>
              <h3 className="text-base font-bold text-white font-sans">Early Warning & Response</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans mt-2">
                When thresholds indicate hazard conditions, the system issues regional advisories, multilingual broadcasts in local dialects, and triggers siren interlock warnings.
              </p>
            </div>
            <div className="pt-4 border-t border-[#21262D] text-[11px] font-mono text-slate-400">
              Multilingual Bulletins • Siren Interlock
            </div>
          </motion.div>
        </div>
      </section>

      {/* 3. Core Sensor Capabilities */}
      <section className="space-y-8">
        <div className="border-b border-[#21262D] pb-4">
          <h2 className="text-2xl font-bold text-white font-sans flex items-center gap-2.5">
            <Radio className="w-6 h-6 text-amber-400" />
            <span>Field Sensor Capabilities</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Engineered for high reliability, autonomous decision support, and immediate hazard response.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div whileHover={{ y: -4 }} className="p-7 rounded-2xl bg-[#161B22] border border-[#30363D] space-y-3 shadow-md">
            <Compass className="w-7 h-7 text-sky-400" />
            <h3 className="text-base font-bold text-white font-sans">Slope Tilt Inclinometry</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Continuous bi-axial tilt tracking and acceleration capture minute geotechnical shear and creep prior to catastrophic slope failure.
            </p>
          </motion.div>

          <motion.div whileHover={{ y: -4 }} className="p-7 rounded-2xl bg-[#161B22] border border-[#30363D] space-y-3 shadow-md">
            <Droplets className="w-7 h-7 text-sky-400" />
            <h3 className="text-base font-bold text-white font-sans">Soil Moisture & Saturation</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Volumetric water content sensing measures pore-water pressure buildup and soil saturation, key triggers for debris flows and rockslides.
            </p>
          </motion.div>

          <motion.div whileHover={{ y: -4 }} className="p-7 rounded-2xl bg-[#161B22] border border-[#30363D] space-y-3 shadow-md">
            <CloudRain className="w-7 h-7 text-sky-400" />
            <h3 className="text-base font-bold text-white font-sans">Meteorological Sync</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Precipitation rates and cumulative rainfall indices are matched against geotechnical vulnerability models for proactive risk projection.
            </p>
          </motion.div>
        </div>
      </section>

      {/* 4. Secure Access / Auth Callout */}
      <motion.section 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="p-10 rounded-2xl bg-[#161B22] border border-[#30363D] flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
            <Lock className="w-4 h-4" />
            <span>Role-Based Access Control</span>
          </div>
          <h3 className="text-xl font-bold text-white font-sans">
            Protected Command & Early Warning Operations
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl leading-relaxed">
            Live telemetry controls, acoustic siren interlock override, and official alert issuance require authenticated operator or administrator credentials.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate(isAuthenticated ? 'hud' : 'auth')}
          className="px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs whitespace-nowrap transition shadow"
        >
          {isAuthenticated ? 'Go to Operations Dashboard' : 'Sign In / Register'}
        </motion.button>
      </motion.section>

    </div>
  );
};
