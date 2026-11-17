import React from 'react';
import { MountainSector, SectorWeatherData } from '../types/index.ts';
import { 
  Activity, 
  Compass, 
  Droplets, 
  CloudRain, 
  ArrowRight,
  Cpu,
  Layers,
  Radio,
  BellRing
} from 'lucide-react';
import { motion } from 'framer-motion';

interface LandingPageProps {
  sectors: MountainSector[];
  weather: SectorWeatherData | null;
  isAuthenticated: boolean;
  onNavigate: (tab: string) => void;
}

// Multi-faceted realistic rock component with 3D depth and crystalline highlights
const RealisticRock: React.FC<{ type: 1 | 2 | 3; size: number }> = ({ type, size }) => {
  if (type === 1) {
    // Angular faceted crystalline boulder with illuminated edges
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" className="drop-shadow-lg filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
        <polygon points="4,7 11,2 20,5 22,15 17,22 8,22 2,15" fill="#252D37" stroke="#4B5563" strokeWidth="0.8" />
        <polygon points="4,7 11,2 20,5 14,13 6,13" fill="#64748B" />
        <polygon points="6,13 14,13 17,22 8,22" fill="#0F172A" />
        <line x1="11" y1="2" x2="14" y2="13" stroke="#CBD5E1" strokeWidth="0.8" opacity="0.6" />
        <line x1="14" y1="13" x2="22" y2="15" stroke="#94A3B8" strokeWidth="0.6" opacity="0.5" />
      </svg>
    );
  }
  if (type === 2) {
    // Craggy broken rock with deep fracture facets
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" className="drop-shadow-lg filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
        <polygon points="6,2 18,4 23,13 18,22 7,20 1,12" fill="#1E293B" stroke="#334155" strokeWidth="0.8" />
        <polygon points="6,2 18,4 15,11 5,10" fill="#475569" />
        <polygon points="5,10 15,11 18,22 7,20" fill="#0B1120" />
        <line x1="6" y1="2" x2="15" y2="11" stroke="#E2E8F0" strokeWidth="0.7" opacity="0.7" />
      </svg>
    );
  }
  // Jagged mineral rock with high-contrast strata
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="drop-shadow-lg filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
      <polygon points="5,3 16,1 22,8 19,19 9,23 2,16" fill="#334155" stroke="#475569" strokeWidth="0.8" />
      <polygon points="5,3 16,1 14,10 4,12" fill="#94A3B8" />
      <polygon points="4,12 14,10 19,19 9,23" fill="#0F172A" />
      <line x1="16" y1="1" x2="14" y2="10" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.8" />
    </svg>
  );
};

// Rock that bounces on cliff ledges with realistic physics keyframes and rotations
const TumblingRock: React.FC<{
  type: 1 | 2 | 3;
  size: number;
  startX: number;
  startY: number;
  bounce1X: number;
  bounce1Y: number;
  bounce2X: number;
  bounce2Y: number;
  endX: number;
  endY: number;
  duration: number;
  delay: number;
}> = ({ type, size, startX, startY, bounce1X, bounce1Y, bounce2X, bounce2Y, endX, endY, duration, delay }) => (
  <motion.div
    initial={{ x: startX, y: startY, opacity: 0, rotate: 0, scale: 0.8 }}
    animate={{
      x: [startX, bounce1X, (bounce1X + bounce2X) / 2, bounce2X, endX],
      y: [startY, bounce1Y, bounce1Y - 14, bounce2Y, endY],
      rotate: [0, 210, 460, 740, 1080],
      opacity: [0, 0.95, 1, 0.9, 0],
      scale: [0.85, 1, 1.05, 0.95, 0.7]
    }}
    transition={{
      duration,
      repeat: Infinity,
      delay,
      ease: [0.35, 0.1, 0.25, 1]
    }}
    className="absolute pointer-events-none"
  >
    <RealisticRock type={type} size={size} />
  </motion.div>
);

export const LandingPage: React.FC<LandingPageProps> = ({
  isAuthenticated,
  onNavigate
}) => {
  return (
    <div className="space-y-16 py-4">
      
      {/* 1. Hero Section with Realistic Mountain Slope Rockfall Background Animation */}
      <section 
        className="relative rounded-none bg-[#161B22] border border-[#30363D] p-10 sm:p-14 lg:p-16 overflow-hidden shadow-2xl min-h-[460px] flex flex-col justify-between"
      >
        {/* Subtle Ambient Background Gradients */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-sky-500/5 blur-3xl pointer-events-none" />

        {/* --- REALISTIC MOUNTAIN SLOPE & ROCKFALL LANDSLIDE ANIMATION --- */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
          
          {/* Natural Mountain Slope & Cliff Ridge Silhouette with Topographic Wireframes */}
          <svg 
            className="absolute right-0 top-0 h-full w-full max-w-[720px] opacity-60" 
            viewBox="0 0 680 480" 
            fill="none" 
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="ridgeGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1E293B" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#0B0F17" stopOpacity="0.9" />
              </linearGradient>
              <linearGradient id="ridgeGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#334155" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#0F172A" stopOpacity="0.85" />
              </linearGradient>
              <linearGradient id="facetHighlight" x1="0%" y1="0%" x2="50%" y2="100%">
                <stop offset="0%" stopColor="#475569" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#1E293B" stopOpacity="0.2" />
              </linearGradient>
            </defs>

            {/* Distant background mountain peak */}
            <polygon points="340,480 490,90 680,240 680,480" fill="#080C14" />
            
            {/* Midground rocky mountain ridge body */}
            <polygon points="160,480 320,330 390,220 460,100 550,50 680,130 680,480" fill="url(#ridgeGradient1)" stroke="#334155" strokeWidth="1.2" />
            
            {/* Rugged crags, rock strata facets, and couloirs */}
            <polygon points="460,100 390,220 480,240 550,150" fill="url(#facetHighlight)" stroke="#475569" strokeWidth="0.8" />
            <polygon points="390,220 320,330 410,360 480,240" fill="#0E1726" stroke="#1E293B" strokeWidth="0.8" />
            <polygon points="320,330 240,430 350,460 410,360" fill="url(#ridgeGradient2)" stroke="#334155" strokeWidth="0.8" />
            
            {/* Scree / debris accumulation zone at the mountain base */}
            <polygon points="160,480 240,430 350,460 460,480" fill="#131B26" stroke="#1E293B" strokeWidth="0.8" />
          </svg>

          {/* --- REALISTIC BOUNCING ROCKFALL TUMBLING DOWN CLIFF LEDGES --- */}
          <div className="absolute right-0 top-0 w-[680px] h-full overflow-hidden">
            {/* Rock 1: Heavy angular boulder breaking off ridge, bouncing on mid ledge, and crashing to base */}
            <TumblingRock 
              type={1} 
              size={20} 
              startX={480} 
              startY={90} 
              bounce1X={420} 
              bounce1Y={220} 
              bounce2X={340} 
              bounce2Y={340} 
              endX={240} 
              endY={450} 
              duration={2.9} 
              delay={0} 
            />
            
            {/* Rock 2: Medium craggy rock breaking off ledge 1 with high spin */}
            <TumblingRock 
              type={2} 
              size={15} 
              startX={460} 
              startY={120} 
              bounce1X={400} 
              bounce1Y={240} 
              bounce2X={310} 
              bounce2Y={360} 
              endX={210} 
              endY={460} 
              duration={2.6} 
              delay={0.7} 
            />
            
            {/* Rock 3: Fast jagged stone cutting down the couloir */}
            <TumblingRock 
              type={3} 
              size={17} 
              startX={490} 
              startY={110} 
              bounce1X={430} 
              bounce1Y={230} 
              bounce2X={360} 
              bounce2Y={350} 
              endX={270} 
              endY={460} 
              duration={3.1} 
              delay={1.4} 
            />
            
            {/* Rock 4: Angular rock fragment bouncing rapidly */}
            <TumblingRock 
              type={1} 
              size={13} 
              startX={440} 
              startY={140} 
              bounce1X={380} 
              bounce1Y={260} 
              bounce2X={290} 
              bounce2Y={380} 
              endX={190} 
              endY={450} 
              duration={2.4} 
              delay={2.1} 
            />
            
            {/* Rock 5: Heavy boulder following the main slip plane */}
            <TumblingRock 
              type={2} 
              size={18} 
              startX={470} 
              startY={100} 
              bounce1X={410} 
              bounce1Y={220} 
              bounce2X={330} 
              bounce2Y={340} 
              endX={230} 
              endY={450} 
              duration={2.8} 
              delay={2.8} 
            />

            {/* Dynamic Natural Dust Puffs at Impact Ledges */}
            <motion.div
              animate={{ scale: [0.6, 2.4], opacity: [0.45, 0] }}
              transition={{ duration: 2.9, repeat: Infinity, delay: 0.9 }}
              className="absolute left-[410px] top-[215px] w-12 h-12 bg-slate-400/15 rounded-full blur-md pointer-events-none"
            />
            <motion.div
              animate={{ scale: [0.6, 2.6], opacity: [0.4, 0] }}
              transition={{ duration: 2.6, repeat: Infinity, delay: 1.6 }}
              className="absolute left-[330px] top-[335px] w-14 h-14 bg-slate-400/15 rounded-full blur-md pointer-events-none"
            />
            <motion.div
              animate={{ scale: [0.8, 2.8], opacity: [0.35, 0] }}
              transition={{ duration: 3.1, repeat: Infinity, delay: 2.3 }}
              className="absolute left-[240px] top-[430px] w-16 h-16 bg-amber-500/10 rounded-full blur-lg pointer-events-none"
            />
          </div>
        </div>
        {/* --- END MOUNTAIN SLOPE & ROCKFALL ANIMATION --- */}

        {/* Foreground Content */}
        <div className="relative z-10 max-w-3xl space-y-6">
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight font-sans">
            Real-Time Landslide Risk Analytics & Early Warning Platform
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-sans max-w-2xl">
            Autonomous sensor monitoring, predictive slope stability intelligence, and early warning analytics for critical mountain transit corridors.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={() => onNavigate('/dashboard')}
              className="flex items-center gap-2.5 px-6 py-3.5 rounded-none bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition shadow"
            >
              <span>Open Live Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                const el = document.getElementById('operational-workflow');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex items-center gap-2 px-6 py-3.5 rounded-none bg-[#21262D] hover:bg-[#30363D] text-slate-200 font-semibold text-sm transition border border-[#30363D]"
            >
              <span>View System Workflow</span>
            </button>
          </div>
        </div>

        {/* Operational Highlights Grid - Pure Informational Panels */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-6 mt-14 pt-8 border-t border-[#21262D]">
          <div className="space-y-1">
            <p className="text-xl sm:text-2xl font-bold font-mono text-white">Multi-Sensor</p>
            <p className="text-xs text-slate-400">Telemetry Ingestion</p>
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
            <p className="text-xl sm:text-2xl font-bold font-mono text-white">24 / 7</p>
            <p className="text-xs text-slate-400">Active Corridor Monitoring</p>
          </div>
        </div>
      </section>

      {/* 2. Operational Workflow & Architecture Section - Clean Informational Cards */}
      <section id="operational-workflow" className="space-y-6">
        <div className="border-b border-[#21262D] pb-4">
          <h2 className="text-2xl font-bold text-white font-sans flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-amber-400" />
            <span>Operational Workflow & Architecture</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            An end-to-end pipeline linking physical slope sensors to actionable civil protection alerts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 - Pure Information Panel */}
          <div className="p-6 rounded-none bg-[#161B22] border border-[#30363D] space-y-4 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-none bg-[#0D1117] border border-[#21262D] text-amber-400">
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

          {/* Step 2 - Pure Information Panel */}
          <div className="p-6 rounded-none bg-[#161B22] border border-[#30363D] space-y-4 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-none bg-[#0D1117] border border-[#21262D] text-sky-400">
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

          {/* Step 3 - Pure Information Panel */}
          <div className="p-6 rounded-none bg-[#161B22] border border-[#30363D] space-y-4 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-none bg-[#0D1117] border border-[#21262D] text-rose-400">
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

      {/* 3. Core Sensor Capabilities - Clean Informational Cards */}
      <section className="space-y-6">
        <div className="border-b border-[#21262D] pb-4">
          <h2 className="text-2xl font-bold text-white font-sans flex items-center gap-2.5">
            <Radio className="w-5 h-5 text-amber-400" />
            <span>Field Sensor Capabilities</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Engineered for high reliability, autonomous decision support, and immediate hazard response.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-none bg-[#161B22] border border-[#30363D] space-y-3 shadow-sm">
            <Compass className="w-6 h-6 text-sky-400" />
            <h3 className="text-sm font-bold text-white font-sans">Slope Tilt Inclinometry</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Continuous bi-axial tilt tracking and acceleration capture minute terrain shear and creep prior to catastrophic slope failure.
            </p>
          </div>

          <div className="p-6 rounded-none bg-[#161B22] border border-[#30363D] space-y-3 shadow-sm">
            <Droplets className="w-6 h-6 text-sky-400" />
            <h3 className="text-sm font-bold text-white font-sans">Soil Moisture & Saturation</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Volumetric water content sensing measures pore-water pressure buildup and soil saturation, key triggers for debris flows and rockslides.
            </p>
          </div>

          <div className="p-6 rounded-none bg-[#161B22] border border-[#30363D] space-y-3 shadow-sm">
            <CloudRain className="w-6 h-6 text-sky-400" />
            <h3 className="text-sm font-bold text-white font-sans">Meteorological Sync</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Precipitation rates and cumulative rainfall indices are matched against slope vulnerability models for proactive risk projection.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Secure Access / Auth Callout */}
      <section 
        className="p-8 sm:p-10 rounded-none bg-[#161B22] border border-[#30363D] flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <span>Emergency Operations Portal</span>
          </div>
          <h3 className="text-xl font-bold text-white font-sans">
            Protected Command & Early Warning Operations
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl leading-relaxed">
            Live telemetry monitoring, acoustic siren actuation, and official emergency bulletins for field responders and disaster management cells.
          </p>
        </div>

        <button
          onClick={() => onNavigate(isAuthenticated ? '/dashboard' : '/auth')}
          className="px-6 py-3.5 rounded-none bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs whitespace-nowrap transition shadow"
        >
          {isAuthenticated ? 'Go to Operations Dashboard' : 'Sign In / Register'}
        </button>
      </section>

    </div>
  );
};
