import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, FileText, Lock, AlertTriangle, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export const LegalPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab from URL path
  const getTabFromPath = () => {
    if (location.pathname.includes('/privacy')) return 'privacy';
    if (location.pathname.includes('/sop')) return 'sop';
    return 'terms';
  };

  const [activeTab, setActiveTab] = useState<'terms' | 'privacy' | 'sop'>(getTabFromPath());

  useEffect(() => {
    setActiveTab(getTabFromPath());
  }, [location.pathname]);

  const handleTabChange = (tab: 'terms' | 'privacy' | 'sop') => {
    setActiveTab(tab);
    navigate(`/${tab}`);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-5xl mx-auto space-y-8 py-4"
    >
      {/* Back navigation & page title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#30363D] pb-6">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-amber-400 mb-3 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-sans tracking-tight">
            Governance, Compliance & Operational Policies
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            Official operational frameworks, data privacy boundaries, and emergency protocols for RescueNex.
          </p>
        </div>

        {/* Tab switcher - Chaukor / sharp square layout */}
        <div className="flex bg-[#0D1117] border border-[#30363D] p-1 rounded-none text-xs font-mono">
          <button
            onClick={() => handleTabChange('terms')}
            className={`px-4 py-2 transition-colors rounded-none ${
              activeTab === 'terms'
                ? 'bg-[#21262D] text-white font-bold border border-[#30363D]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Terms of Service
          </button>
          <button
            onClick={() => handleTabChange('privacy')}
            className={`px-4 py-2 transition-colors rounded-none ${
              activeTab === 'privacy'
                ? 'bg-[#21262D] text-white font-bold border border-[#30363D]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Privacy Policy
          </button>
          <button
            onClick={() => handleTabChange('sop')}
            className={`px-4 py-2 transition-colors rounded-none ${
              activeTab === 'sop'
                ? 'bg-[#21262D] text-white font-bold border border-[#30363D]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Disaster SOP
          </button>
        </div>
      </div>

      {/* Main Content Container - Chaukor / Sharp Square Flat Telemetry Theme */}
      <div className="rounded-none bg-[#161B22] border border-[#30363D] p-8 sm:p-10 shadow-2xl">
        
        {/* Tab 1: Terms of Service */}
        {activeTab === 'terms' && (
          <div className="space-y-8 text-xs text-slate-300 leading-relaxed font-sans">
            <div>
              <div className="flex items-center gap-2 mb-2 text-amber-400 font-bold font-mono">
                <FileText className="w-4 h-4" />
                <span className="uppercase tracking-wider">Section 01</span>
              </div>
              <h3 className="text-base font-bold text-white font-sans mb-2">
                Operational Scope & Mission Objectives
              </h3>
              <p>
                RescueNex provides autonomous geotechnical monitoring, slope inclinometry tracking, and early warning analytics for critical mountain transit corridors. The system ingests telemetry from stationary field hardware nodes and synchronizes with regional meteorological data to deliver automated hazard predictions to disaster management authorities, emergency response teams, and public commuters.
              </p>
            </div>

            <div className="border-t border-[#21262D] pt-6">
              <div className="flex items-center gap-2 mb-2 text-amber-400 font-bold font-mono">
                <ShieldCheck className="w-4 h-4" />
                <span className="uppercase tracking-wider">Section 02</span>
              </div>
              <h3 className="text-base font-bold text-white font-sans mb-2">
                Advisory Nature of Machine Learning Projections
              </h3>
              <p>
                Calculations generated by the platform, including the Landslide Susceptibility Index (LSI), slope tilt deviations, and moisture pore saturation estimates, represent automated numerical models. These metrics serve as situational intelligence. Official corridor closures, evacuations, and heavy vehicle restrictions remain subject to field verification by designated response officers and civil disaster authorities.
              </p>
            </div>

            <div className="border-t border-[#21262D] pt-6">
              <div className="flex items-center gap-2 mb-2 text-amber-400 font-bold font-mono">
                <AlertTriangle className="w-4 h-4" />
                <span className="uppercase tracking-wider">Section 03</span>
              </div>
              <h3 className="text-base font-bold text-white font-sans mb-2">
                Acoustic Siren & Emergency Override Actuation
              </h3>
              <p>
                Acoustic sirens installed in observation sectors are actuated through secure hardware relays. Manual siren triggers require authenticated operator credentials and strict confirmation procedures (<code className="px-1.5 py-0.5 rounded-none bg-[#0D1117] border border-[#30363D] font-mono text-amber-400">CONFIRM_DISASTER_OVERRIDE</code>). Unapproved siren activation is strictly prohibited and logged in an immutable security audit record.
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Privacy Policy */}
        {activeTab === 'privacy' && (
          <div className="space-y-8 text-xs text-slate-300 leading-relaxed font-sans">
            <div>
              <div className="flex items-center gap-2 mb-2 text-sky-400 font-bold font-mono">
                <Lock className="w-4 h-4" />
                <span className="uppercase tracking-wider">Data Ingestion 01</span>
              </div>
              <h3 className="text-base font-bold text-white font-sans mb-2">
                Stationary Geotechnical Telemetry
              </h3>
              <p>
                Hardware sensor nodes deployed along mountain corridors collect environmental telemetry: bi-axial slope inclination angles (degrees), root-mean-square acceleration, volumetric soil moisture content, and ambient weather parameters. All collected telemetry is purely physical, non-personal, and environmental.
              </p>
            </div>

            <div className="border-t border-[#21262D] pt-6">
              <div className="flex items-center gap-2 mb-2 text-sky-400 font-bold font-mono">
                <ShieldCheck className="w-4 h-4" />
                <span className="uppercase tracking-wider">Data Ingestion 02</span>
              </div>
              <h3 className="text-base font-bold text-white font-sans mb-2">
                Stationary Hardware GPS Positions
              </h3>
              <p>
                GPS coordinates ingested by the Core Gateway represent stationary, physical sensor enclosures anchored on mountain slopes. RescueNex does not track individual vehicles, travelers, or mobile phones.
              </p>
            </div>

            <div className="border-t border-[#21262D] pt-6">
              <div className="flex items-center gap-2 mb-2 text-sky-400 font-bold font-mono">
                <FileText className="w-4 h-4" />
                <span className="uppercase tracking-wider">Data Ingestion 03</span>
              </div>
              <h3 className="text-base font-bold text-white font-sans mb-2">
                Operator Credentials & Security Storage
              </h3>
              <p>
                Authorized personnel (Incident Commanders, Field Scouts, and Operators) authenticate using role-verified credentials. Passwords are cryptographically salted and hashed using Bcrypt routines. Session tokens are signed using high-entropy JWT secrets with strict expiry and automatic renewal controls.
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: Disaster SOP */}
        {activeTab === 'sop' && (
          <div className="space-y-8 text-xs text-slate-300 leading-relaxed font-sans">
            <div>
              <h3 className="text-base font-bold text-white font-sans mb-4">
                Operational Escalation Matrix & SOP Guidelines
              </h3>
              
              {/* Chaukor Square Severity Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-[11px] mb-6">
                <div className="p-4 rounded-none bg-[#0D1117] border border-[#21262D]">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold mb-1.5">
                    <span>LEVEL 1: STABLE</span>
                  </div>
                  <p className="text-slate-400 font-sans text-xs">
                    LSI &lt; 40. Slope tilt deviation within nominal limits (&lt; 1.0°). Transit corridor open for normal travel. Periodic sensor telemetry checks.
                  </p>
                </div>

                <div className="p-4 rounded-none bg-[#0D1117] border border-amber-500/30">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold mb-1.5">
                    <span>LEVEL 2: ADVISORY</span>
                  </div>
                  <p className="text-slate-400 font-sans text-xs">
                    LSI 40–74 or intense precipitation detected (&gt; 15 mm/h). Multilingual vernacular bulletins dispatched to patrols and field units. Caution advised.
                  </p>
                </div>

                <div className="p-4 rounded-none bg-[#0D1117] border border-rose-500/30">
                  <div className="flex items-center gap-1.5 text-rose-400 font-bold mb-1.5">
                    <span>LEVEL 3: CRITICAL</span>
                  </div>
                  <p className="text-slate-400 font-sans text-xs">
                    LSI &ge; 75 or abrupt slope shear (&gt; 4.0°). Automated acoustic horn actuation armed. Immediate dispatch of highway safety and civil defense cells.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-[#21262D] pt-6">
              <h3 className="text-base font-bold text-white font-sans mb-3">
                Emergency Dispatch & Response Hubs
              </h3>
              <ul className="list-disc pl-5 space-y-2 text-slate-300 font-sans">
                <li><strong>Regional Emergency Operations Centre:</strong> Disaster Helpline: 1070 / 1077</li>
                <li><strong>Field Coordination Cell:</strong> Regional Dispatch Operations Hub</li>
                <li><strong>Technical Platform Support:</strong> lead@rescuenex.org</li>
              </ul>
            </div>
          </div>
        )}

      </div>
    </motion.div>
  );
};
