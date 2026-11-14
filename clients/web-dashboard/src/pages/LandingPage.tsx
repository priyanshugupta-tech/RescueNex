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
  BellRing
} from 'lucide-react';
import { motion } from 'framer-motion';

interface LandingPageProps {
  sectors: MountainSector[];
  weather: SectorWeatherData | null;
  isAuthenticated: boolean;
  onNavigate: (tab: string) => void;
}

// Multi-faceted realistic rock component
const RealisticRock: React.FC<{ type: 1 | 2 | 3; size: number }> = ({ type, size }) => {
  if (type === 1) {
    // Angular faceted boulder
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" className="drop-shadow-md">
        <polygon points="4,7 11,2 20,5 22,15 17,22 8,22 2,15" fill="#3E4C59" stroke="#252D37" strokeWidth="0.8" />
        <polygon points="4,7 11,2 20,5 14,13 6,13" fill="#627D98" />
        <polygon points="6,13 14,13 17,22 8,22" fill="#243B53" />
      </svg>
    );
  }
  if (type === 2) {
    // Craggy broken rock
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" className="drop-shadow-md">
        <polygon points="6,2 18,4 23,13 18,22 7,20 1,12" fill="#334155" stroke="#1E293B" strokeWidth="0.8" />
        <polygon points="6,2 18,4 15,11 5,10" fill="#64748B" />
        <polygon points="5,10 15,11 18,22 7,20" fill="#1E293B" />
      </svg>
    );
  }
  // Jagged earth stone
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="drop-shadow-md">
      <polygon points="5,3 16,1 22,8 19,19 9,23 2,16" fill="#4B5563" stroke="#374151" strokeWidth="0.8" />
      <polygon points="5,3 16,1 14,10 4,12" fill="#9CA3AF" />
      <polygon points="4,12 14,10 19,19 9,23" fill="#1F2937" />
    </svg>
  );
};

// Rock that rolls and tumbles strictly along the mountain cliff slope
const TumblingRock: React.FC<{
  type: 1 | 2 | 3;
  size: number;
  startX: number;
  startY: number;
  midX: number;
  midY: number;
  endX: number;
  endY: number;
  duration: number;
  delay: number;
}> = ({ type, size, startX, startY, midX, midY, endX, endY, duration, delay }) => (
  <motion.div
    initial={{ x: startX, y: startY, opacity: 0, rotate: 0 }}
    animate={{
      x: [startX, midX, endX],
      y: [startY, midY, endY],
      rotate: [0, 180, 540],
      opacity: [0, 0.9, 0.95, 0]
    }}
    transition={{
      duration,
      repeat: Infinity,
      delay,
      ease: [0.4, 0, 0.6, 1]
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
          
          {/* Natural Mountain Slope & Cliff Ridge Silhouette */}
          <svg 
            className="absolute right-0 top-0 h-full w-full max-w-[700px] opacity-40" 
            viewBox="0 0 650 480" 
            fill="none" 
            preserveAspectRatio="none"
          >
            {/* Distant background mountain peak */}
            <polygon points="320,480 480,100 650,260 650,480" fill="#0C1017" />
            
            {/* Rocky mountain ridge body */}
            <polygon points="180,480 340,320 400,220 460,110 540,60 650,140 650,480" fill="#090D13" stroke="#1F2937" strokeWidth="1.5" />
            
            {/* Rugged crags and rock strata facets */}
            <polygon points="460,110 400,220 480,240 540,160" fill="#131B24" />
            <polygon points="400,220 340,320 420,350 480,240" fill="#0E151E" />
            <polygon points="340,320 260,420 360,450 420,350" fill="#111822" />
            
            {/* Scree / debris accumulation zone at the mountain base */}
            <polygon points="180,480 260,420 360,450 450,480" fill="#161F2B" />
          </svg>

          {/* Rocks breaking off strictly from the mountain cliff and tumbling down the slope */}
          <div className="absolute right-0 top-0 w-[650px] h-full overflow-hidden">
            {/* Rock 1: Angular boulder breaking off high cliff face and rolling down */}
            <TumblingRock type={1} size={18} startX={480} startY={120} midX={410} midY={250} endX={320} endY={430} duration={2.8} delay={0} />
            
            {/* Rock 2: Medium craggy rock tumbling down */}
            <TumblingRock type={2} size={14} startX={460} startY={140} midX={390} midY={270} endX={290} endY={440} duration={2.5} delay={0.6} />
            
            {/* Rock 3: Heavy jagged boulder */}
            <TumblingRock type={3} size={20} startX={490} startY={130} midX={430} midY={260} endX={340} endY={450} duration={3.0} delay={1.2} />
            
            {/* Rock 4: Angular stone */}
            <TumblingRock type={1} size={12} startX={470} startY={160} midX={400} midY={280} endX={300} endY={420} duration={2.3} delay={1.7} />
            
            {/* Rock 5: Stone fragment */}
            <TumblingRock type={2} size={15} startX={450} startY={180} midX={380} midY={300} endX={280} endY={440} duration={2.6} delay={2.3} />
            
            {/* Rock 6: Heavy rock tumbling down slope */}
            <TumblingRock type={3} size={16} startX={480} startY={150} midX={420} midY={280} endX={330} endY={450} duration={2.9} delay={2.9} />
            
            {/* Rock 7: Fast rolling stone */}
            <TumblingRock type={1} size={13} startX={440} startY={200} midX={370} midY={320} endX={270} endY={430} duration={2.2} delay={3.5} />

            {/* Subtle natural dust puffs at rock impact ledges */}
            <motion.div
              animate={{ scale: [0.8, 2.0], opacity: [0.3, 0] }}
              transition={{ duration: 2.8, repeat: Infinity, delay: 0.8 }}
              className="absolute left-[400px] top-[240px] w-12 h-12 bg-slate-500/10 blur-md pointer-events-none"
            />
            <motion.div
              animate={{ scale: [0.8, 2.2], opacity: [0.25, 0] }}
              transition={{ duration: 3.2, repeat: Infinity, delay: 2.1 }}
              className="absolute left-[330px] top-[340px] w-14 h-14 bg-slate-600/10 blur-md pointer-events-none"
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
            Geotechnical monitoring, predictive slope stability intelligence, and early warning analytics for critical mountain transit corridors.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={() => onNavigate(isAuthenticated ? '/dashboard' : '/auth')}
              className="flex items-center gap-2.5 px-6 py-3.5 rounded-none bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition shadow"
            >
              <span>{isAuthenticated ? 'Open Live Dashboard' : 'Sign In to Access Dashboard'}</span>
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
              Continuous bi-axial tilt tracking and acceleration capture minute geotechnical shear and creep prior to catastrophic slope failure.
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
              Precipitation rates and cumulative rainfall indices are matched against geotechnical vulnerability models for proactive risk projection.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Secure Access / Auth Callout */}
      <section 
        className="p-8 sm:p-10 rounded-none bg-[#161B22] border border-[#30363D] flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl"
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
