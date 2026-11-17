import React, { useState, useEffect, useRef } from 'react';
import { FileText, Lock, X, ExternalLink, CheckCircle } from 'lucide-react';

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
      className="fixed inset-0 z-50 m-auto w-full max-w-3xl rounded-none bg-slate-950 border border-slate-800 text-slate-100 shadow-2xl backdrop:bg-slate-950/80 backdrop:backdrop-blur-sm p-0 overflow-hidden"
    >
      <div className="flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-none bg-slate-800 text-white shadow-md border border-slate-700">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 id="legal-dialog-title" className="text-base font-bold text-white font-sans">
                RescueNex Legal & Operations Framework
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Real-Time Landslide Risk Analytics & Early Warning Platform
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
            <FileText className="w-4 h-4 text-white" />
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
                  RescueNex is an autonomous, sensor-driven early warning and landslide risk monitoring platform engineered for high-altitude mountain corridors and critical connecting transit sectors. The system provides real-time sensor telemetry, automated 10 km geofenced evacuation broadcasts (SMS & Email), and decision intelligence to regional disaster response cells, emergency command hubs, and the commuting public.
                </p>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white mb-1">2. Advisory Nature of Predictive Indices & NDMA Alignment</h4>
                <p>
                  The Landslide Susceptibility Index (LSI), slope tilt magnitude, and soil moisture calculations represent automated statistical and machine learning projections. All disaster bulletins comply with National Disaster Management Authority (NDMA) guidelines and Common Alerting Protocol (CAP v1.2) standards. While calibrated for high sensitivity, these predictions serve as rapid decision support; official vehicular traffic closures and statutory evacuation orders remain subject to field verification by on-site corridor maintenance teams and traffic safety authorities.
                </p>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white mb-1">3. Emergency Siren & Acoustic Override Protocol</h4>
                <p>
                  Acoustic siren activation transmits real-time actuation signals to physical sector horns. Manual activation requires strict confirmation (<code className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-amber-300">CONFIRM_DISASTER_OVERRIDE</code>). Unauthorised or malicious siren activation violates operational safety codes and is punishable under Section 54 of the Disaster Management Act, 2005.
                </p>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white mb-1">4. Emergency Broadcast Fair Use & Rate Limiting</h4>
                <p>
                  In accordance with TRAI telecommunication regulations, verification SMS OTPs have a 60-second cooldown and 5-attempt verification lockout. Commuters are permitted up to 2 mobile number updates per week. Automated emergency broadcasts strictly apply a 2-hour suppression window per transit sector to prevent redundant SMS delivery when commuters repeatedly update or traverse locations.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-white mb-1">1. Personal Data Protection (DPDP Act, 2023)</h4>
                <p>
                  RescueNex complies with India's Digital Personal Data Protection Act (DPDP Act, 2023). Personal information collected is strictly limited to:
                </p>
                <ul className="list-disc pl-5 mt-1 space-y-1 text-slate-400">
                  <li><strong>Email:</strong> Required for account authentication, password recovery, and emergency evacuation email fallback.</li>
                  <li><strong>Mobile Phone Number:</strong> Optional; collected strictly with post-signup user consent exclusively to dispatch life-safety SMS disaster evacuation orders.</li>
                  <li><strong>Transit Location:</strong> Commuters may optionally synchronize their current transit point (GPS or searched town) to enable 10 km geofenced risk monitoring. Location data is never monetized or shared with third-party advertisers.</li>
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white mb-1">2. Sensor & Environmental Telemetry</h4>
                <p>
                  RescueNex continuously ingests bi-axial tilt angles, acceleration RMS, volumetric soil moisture percentages, ambient temperature, and rainfall rates from stationary field nodes. These metrics are strictly environmental and non-personal.
                </p>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white mb-1">3. Authorized Operator Account Data</h4>
                <p>
                  Designated incident commanders, scouts, and field response operators provide official credentials for role-based access control. Passwords are cryptographically hashed using standard Bcrypt routines with salted rounds, and access tokens are signed using high-entropy JWT keys. Operator activity is retained in an immutable audit log for operational accountability.
                </p>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white mb-1">4. Rights to Update & Data Erasure</h4>
                <p>
                  Users may update their mobile number (up to 2 times per week), opt out of SMS notifications, or request account erasure by contacting the Data Protection Officer at <span className="font-mono text-amber-400">privacy@rescuenex.org</span>.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'sop' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-white mb-1">Standard Operating Procedures (SOP) Escalation Matrix</h4>
                <p>
                  The following operational escalation protocol applies across all monitored transit corridors:
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

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-700">
                  <div className="text-slate-200 font-bold mb-1">
                    <span>LEVEL 2: ADVISORY</span>
                  </div>
                  <p className="text-slate-400 font-sans text-xs">
                    LSI 40–74 or heavy rain &gt; 15mm/h. Vernacular public broadcast triggered. Patrol units notified.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-700">
                  <div className="text-slate-200 font-bold mb-1">
                    <span>LEVEL 3: CRITICAL</span>
                  </div>
                  <p className="text-slate-400 font-sans text-xs">
                    LSI &ge; 75 or tilt displacement &gt; 4.0°. CAP v1.2 XML broadcast, acoustic siren interlock armed.
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white mb-1">Emergency Operations Coordination Contacts</h4>
                <ul className="list-disc pl-5 space-y-1 text-slate-350">
                  <li><strong>Regional Emergency Operations Centre (EOC):</strong> Emergency Helpline: 1070 / 1077</li>
                  <li><strong>Disaster Management Field Cell:</strong> Regional Dispatch Control</li>
                  <li><strong>Technical Mission Operations:</strong> lead@rescuenex.org</li>
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