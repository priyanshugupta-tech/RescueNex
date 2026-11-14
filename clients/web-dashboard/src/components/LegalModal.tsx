import React, { useState, useEffect, useRef } from 'react';
import { Shield, FileText, Lock, AlertTriangle, X, ExternalLink, CheckCircle } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  initialTab?: 'terms' | 'privacy' | 'sop';
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  initialTab = 'terms',
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy' | 'sop'>(initialTab);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  // Handle escape or native close
  const handleDialogCancel = (e: React.SyntheticEvent) => {
    e.preventDefault();
    onClose();
  };

  // Light dismiss on backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleDialogCancel}
      onClick={handleBackdropClick}
      aria-labelledby="legal-dialog-title"
      className="fixed inset-0 z-50 m-auto w-full max-w-3xl rounded-2xl bg-slate-950 border border-slate-800 text-slate-100 shadow-2xl backdrop:bg-slate-950/80 backdrop:backdrop-blur-sm p-0 overflow-hidden"
    >
      <div className="flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-b from-amber-500 to-amber-700 text-white shadow-md border-t border-amber-300/60 border-b border-amber-900">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 id="legal-dialog-title" className="text-base font-bold text-white font-sans">
                RescueNex Legal & Operations Framework
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Innovathon 2.0 • SDMA & BRO J&K Operational Guidelines
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            aria-label="Close legal modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher - Lustrous Opaque Style */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-800/80 bg-slate-950/90">
          <button
            onClick={() => setActiveTab('terms')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'terms'
                ? 'bg-gradient-to-b from-slate-650 via-slate-700 to-slate-850 text-white font-bold border-t border-white/40 border-b border-slate-950 shadow-md ring-1 ring-white/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 text-white" />
            <span>Terms of Service</span>
          </button>

          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'privacy'
                ? 'bg-gradient-to-b from-slate-650 via-slate-700 to-slate-850 text-white font-bold border-t border-white/40 border-b border-slate-950 shadow-md ring-1 ring-white/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Lock className="w-4 h-4 text-white" />
            <span>Privacy Policy</span>
          </button>

          <button
            onClick={() => setActiveTab('sop')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'sop'
                ? 'bg-gradient-to-b from-slate-650 via-slate-700 to-slate-850 text-white font-bold border-t border-white/40 border-b border-slate-950 shadow-md ring-1 ring-white/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-white" />
            <span>Disaster Advisory & SOP</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 text-xs text-slate-300 space-y-5 leading-relaxed font-sans">
          
          {activeTab === 'terms' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-white mb-1">1. Operational Scope & Purpose</h4>
                <p>
                  RescueNex is an autonomous, sensor-driven early warning and landslide risk monitoring system engineered for high-altitude transit corridors, specifically National Highway 44 (NH-44 Jammu–Srinagar) and critical connecting mountain sectors in Jammu & Kashmir. The system is designed to provide real-time geotechnical telemetry to disaster authorities, Border Roads Organisation (BRO), and State Disaster Management Authorities (SDMA).
                </p>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white mb-1">2. Advisory Nature of Predictive Indices</h4>
                <p>
                  The Landslide Susceptibility Index (LSI), slope tilt magnitude, and soil moisture calculations represent automated statistical and machine learning projections derived from deployed hardware sensor nodes (MPU-6050 accelerometer/gyroscope, capacitive soil probes, and Open-Meteo precipitation feeds). While calibrated for high sensitivity, these predictions serve as decision-support alerts. Official vehicular traffic closure, evacuation notices, and emergency orders remain subject to field verification by on-site BRO Project BEACON units and Jammu & Kashmir Traffic Police.
                </p>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white mb-1">3. Common Alerting Protocol (CAP v1.2) Compliance</h4>
                <p>
                  All hazard advisories and XML exports published by RescueNex comply with the National Disaster Management Authority (NDMA) Common Alerting Protocol (CAP) v1.2 specifications. Automated bulletins are signed with operational timestamps and sector geocodes for cross-agency dispatch.
                </p>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white mb-1">4. Emergency Siren & Acoustic Override Protocol</h4>
                <p>
                  Acoustic siren activation transmits real-time actuation signals to physical sector horns. Manual activation requires strict two-man integrity confirmation (<code className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-amber-300">CONFIRM_DISASTER_OVERRIDE</code>). Unauthorised or malicious siren activation constitutes a violation of state disaster management codes.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-white mb-1">1. Geotechnical & Environmental Telemetry</h4>
                <p>
                  RescueNex continuously ingests bi-axial tilt angles, acceleration RMS, volumetric soil moisture percentages, ambient temperature, and rainfall rates from stationary field nodes. These metrics are strictly environmental and non-personal.
                </p>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white mb-1">2. Hardware GPS Coordinates</h4>
                <p>
                  GPS coordinates collected by the Core Gateway represent stationary, physical hardware nodes installed along highway mountain slopes. The system does not track civilian travelers, vehicles, or personal mobile GPS locations.
                </p>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white mb-1">3. Authorized Operator Account Data</h4>
                <p>
                  Designated incident commanders, scouts, and BRO operators provide credentials (official email, agency affiliation, and contact details) for role-based access control. Passwords are cryptographically hashed using standard Bcrypt routines with salted rounds, and access tokens are signed using high-entropy JWT keys. Operator activity (including siren triggers and alert acknowledgements) is retained in an immutable audit log for inter-agency accountability.
                </p>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white mb-1">4. Data Retention & Integrity</h4>
                <p>
                  Telemetry data is cached in low-latency memory queues and synced with MongoDB Atlas clusters for disaster retrospective analysis and geological research with academic and civil defense partners.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'sop' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-white mb-1">Standard Operating Procedures (SOP) Escalation Matrix</h4>
                <p>
                  The following operational escalation protocol applies across all monitored highway corridors:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-2 font-mono text-[11px]">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold mb-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>LEVEL 1: STABLE</span>
                  </div>
                  <p className="text-slate-400 font-sans text-xs">
                    LSI &lt; 40. IMU deviation &lt; 1.0°. Corridor open. Telemetry polled every 5 seconds.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-amber-500/30">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold mb-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>LEVEL 2: ADVISORY</span>
                  </div>
                  <p className="text-slate-400 font-sans text-xs">
                    LSI 40–74 or heavy rain &gt; 15mm/h. Vernacular public broadcast triggered. BRO patrol notified.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-rose-500/30">
                  <div className="flex items-center gap-1.5 text-rose-400 font-bold mb-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>LEVEL 3: CRITICAL</span>
                  </div>
                  <p className="text-slate-400 font-sans text-xs">
                    LSI &ge; 75 or tilt displacement &gt; 4.0°. CAP v1.2 XML broadcast, acoustic siren interlock armed.
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white mb-1">Emergency Agency Coordination Contacts</h4>
                <ul className="list-disc pl-5 space-y-1 text-slate-350">
                  <li><strong>SDMA State Emergency Operations Centre (SEOC):</strong> Srinagar / Jammu Helpline: 1070 / 1077</li>
                  <li><strong>Border Roads Organisation (BRO Project BEACON):</strong> Ramban–Banihal Control Cell</li>
                  <li><strong>Innovathon 2.0 Technical Mission Lead:</strong> lead@rescuenex.org</li>
                </ul>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-800 bg-slate-900/90 text-xs">
          <span className="text-slate-400 font-mono text-[11px]">
            RescueNex Operations Handbook • Version 2.4.1 (2026)
          </span>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-gradient-to-b from-slate-700 to-slate-800 hover:from-slate-650 hover:to-slate-750 text-white font-semibold border-t border-white/20 border-b border-black/50 shadow-sm transition"
          >
            Acknowledge & Close
          </button>
        </div>

      </div>
    </dialog>
  );
};