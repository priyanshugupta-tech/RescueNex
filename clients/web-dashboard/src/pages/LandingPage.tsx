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

// Falling rock particle for realistic landslide / rockfall simulation
const FallingRock: React.FC<{
  delay: number;
  duration: number;
  size: number;
  startX: number;
  startY: number;
  driftX: number;
  fallY: number;
  color?: string;
}> = ({ delay, duration, size, startX, startY, driftX, fallY, color = '#475569' }) => (
  <motion.div
    initial={{ x: startX, y: startY, opacity: 0, rotate: 0 }}
    animate={{
      x: [startX, startX - driftX * 0.45, startX - driftX],
      y: [startY, startY + fallY * 0.5, startY + fallY],
      rotate: [0, 190, 430],
      opacity: [0, 0.8, 0.85, 0]
    }}
    transition={{
      duration,
      repeat: Infinity,
      delay,
      ease: [0.35, 0, 0.65, 1]
    }}
    style={{
      width: size,
      height: size,
      backgroundColor: color
    }}
    className="absolute rounded-sm shadow-md pointer-events-none"
  />
);

export const LandingPage: React.FC<LandingPageProps> = ({
  isAuthenticated,
  onNavigate
}) => {
  return (
    <div className="space-y-20 py-4">
      
      {/* 1. Hero Section with Mountain Landslide / Rockfall Background Animation */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative rounded-3xl bg-[#161B22] border border-[#30363D] p-10 sm:p-16 lg:p-20 overflow-hidden shadow-2xl min-h-[460px] flex flex-col justify-between"
      >
        {/* Subtle Ambient Background Gradients */}
        <div className="absolute top-0 right-0 w-[550px] h-[550px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-[450px] h-[450px] bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* --- MOUNTAIN CLIFF & ROCKFALL LANDSLIDE ANIMATION BACKGROUND --- */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
          
          {/* Layered Mountain Slope Silhouette */}
          <svg 
            className="absolute right-0 top-0 h-full w-full max-w-[750px] opacity-35" 
            viewBox="0 0 650 480" 
            fill="none" 
            preserveAspectRatio="none"
          >
            {/* Background distant mountain peaks */}
            <path d="M280 480 L480 140 L650 340 L650 480 Z" fill="#0D1117" />
            
            {/* Steep foreground mountain ridge with fracture planes */}
            <path d="M160 480 L380 70 L540 370 L650 480 Z" fill="#0A0D13" stroke="#21262D" strokeWidth="1.5" />
            
            {/* Seismic fracture fault lines along the slope */}
            <path d="M380 70 Q410 180 370 290 T320 480" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="4 6" opacity="0.35" />
            <path d="M420 150 L450 270 L430 430" stroke="#64748B" strokeWidth="1" strokeDasharray="3 5" opacity="0.3" />
            <path d="M340 210 L370 340" stroke="#E11D48" strokeWidth="1" strokeDasharray="2 4" opacity="0.3" />
          </svg>

          {/* Falling Rock Fragments & Debris Tumbling Down the Mountain Slope */}
          <div className="absolute right-0 top-0 w-[650px] h-full overflow-hidden">
            {/* Rock stream 1 */}
            <FallingRock startX={420} startY={70} driftX={110} fallY={340} size={14} duration={2.7} delay={0} color="#334155" />
            <FallingRock startX={440} startY={90} driftX={130} fallY={320} size={9} duration={2.3} delay={0.4} color="#475569" />
            <FallingRock startX={410} startY={115} driftX={95} fallY={350} size={16} duration={3.1} delay={0.9} color="#1E293B" />
            <FallingRock startX={460} startY={130} driftX={140} fallY={310} size={7} duration={2.1} delay={1.3} color="#78350F" />
            
            {/* Rock stream 2 */}
            <FallingRock startX={430} startY={85} driftX={120} fallY={360} size={12} duration={2.6} delay={1.8} color="#475569" />
            <FallingRock startX={480} startY={150} driftX={150} fallY={300} size={8} duration={2.2} delay={2.2} color="#64748B" />
            <FallingRock startX={390} startY={100} driftX={85} fallY={370} size={15} duration={2.9} delay={2.7} color="#334155" />
            <FallingRock startX={450} startY={110} driftX={135} fallY={330} size={6} duration={1.9} delay={3.1} color="#92400E" />
            
            {/* Rock stream 3 (Gravel & Boulders) */}
            <FallingRock startX={425} startY={140} driftX={115} fallY={320} size={10} duration={2.5} delay={3.6} color="#475569" />
            <FallingRock startX={470} startY={120} driftX={145} fallY={340} size={13} duration={2.8} delay={4.0} color="#1E293B" />
            <FallingRock startX={405} startY={160} driftX={90} fallY={310} size={8} duration={2.4} delay={4.5} color="#64748B" />

            {/* Geological Dust Puffs along cliff failure zones */}
            <motion.div
              animate={{ scale: [0.8, 2.2], opacity: [0.35, 0] }}
              transition={{ duration: 3.0, repeat: Infinity, delay: 0.6 }}
              className="absolute left-[380px] top-[140px] w-12 h-12 rounded-full bg-amber-500/10 blur-lg pointer-events-none"
            />
            <motion.div
              animate={{ scale: [0.8, 2.4], opacity: [0.3, 0] }}
              transition={{ duration: 3.4, repeat: Infinity, delay: 1.9 }}
              className="absolute left-[320px] top-[260px] w-16 h-16 rounded-full bg-slate-500/15 blur-xl pointer-events-none"
            />
            <motion.div
              animate={{ scale: [0.8, 2.0], opacity: [0.25, 0] }}
              transition={{ duration: 2.8, repeat: Infinity, delay: 3.2 }}
              className="absolute left-[260px] top-[360px] w-14 h-14 rounded-full bg-amber-600/10 blur-lg pointer-events-none"
            />
          </div>
        </div>
        {/* --- END MOUNTAIN CLIFF & ROCKFALL BACKGROUND --- */}

        {/* Left Hero Foreground Content */}
        <div className="relative z-10 max-w-3xl space-y-6">
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

        {/* Operational Highlights Grid - Generic & Realistic */}
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
