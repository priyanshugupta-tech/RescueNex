import React, { useState } from 'react';
import { api } from '../services/api.ts';
import { offlineSync } from '../services/offlineSync.ts';
import { GeoLocation } from '../utils/geoUtils.ts';
import { HazardType, ReportSeverity } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { X, Send, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FieldReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userLocation: GeoLocation | null;
  onReportSubmitted?: () => void;
  targetAlert?: { alertId: string; sectorName: string } | null;
}

export const FieldReportModal: React.FC<FieldReportModalProps> = ({
  isOpen,
  onClose,
  userLocation,
  onReportSubmitted,
  targetAlert
}) => {
  const { user } = useAuth();
  const isAuthorized = ['SCOUT', 'OPERATOR', 'ADMIN'].includes(user?.role || '');
  const [hazardType, setHazardType] = useState<HazardType>('ROCKFALL');
  const [severity, setSeverity] = useState<ReportSeverity>('MEDIUM');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'queued' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  if (!targetAlert) {
    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md bg-[#0D1117] border border-[#30363D] shadow-2xl rounded-none text-slate-200 overflow-hidden"
          >
            <div className="px-5 py-3.5 bg-[#161B22] border-b border-[#30363D] flex items-center justify-between">
              <span className="text-xs font-bold font-mono text-amber-400 uppercase">[ ALERT ATTACHMENT REQUIRED ]</span>
              <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-none hover:bg-[#21262D]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 font-sans text-xs">
              <p className="text-slate-200">
                Ground situation updates must be attached directly to an active emergency alert. Please click <strong>+ Submit Report</strong> directly on the relevant alert card.
              </p>
              <div className="pt-2 flex justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-1.5 bg-[#21262D] hover:bg-[#30363D] text-slate-200 border border-[#30363D] rounded-none text-xs font-mono transition"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }

  if (!isAuthorized) {
    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md bg-[#0D1117] border border-[#30363D] shadow-2xl rounded-none text-slate-200 overflow-hidden"
          >
            <div className="px-5 py-3.5 bg-[#161B22] border-b border-[#30363D] flex items-center justify-between">
              <span className="text-xs font-bold font-mono text-rose-400 uppercase">[ ROLE RESTRICTED ]</span>
              <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-none hover:bg-[#21262D]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 font-sans text-xs">
              <p className="text-slate-200">
                Ground hazard reporting is strictly restricted to verified <strong>Emergency Field Scouts (SDRF/BRO)</strong> and <strong>Operations Personnel</strong>.
              </p>
              <p className="text-slate-400 font-mono text-[11px]">
                Your account role is currently: <span className="text-amber-400 font-bold">{user?.role || 'PUBLIC'}</span>. Public commuters have read-only access to corridor warning bulletins.
              </p>
              <div className="pt-2 flex justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-1.5 bg-[#21262D] hover:bg-[#30363D] text-slate-200 border border-[#30363D] rounded-none text-xs font-mono transition"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setSubmitting(true);
    setFeedback(null);

    const lat = userLocation?.latitude ?? 33.2422;
    const lon = userLocation?.longitude ?? 75.2443;
    const cityName = userLocation?.cityName ?? 'Highway Transit Sector';

    const reportData = {
      alertId: targetAlert?.alertId,
      sectorId: targetAlert?.sectorName,
      hazardType,
      severity,
      latitude: lat,
      longitude: lon,
      cityName: targetAlert?.sectorName || cityName,
      description: description.trim(),
      reportedAt: Date.now(),
      userName: user?.fullName || (user?.role === 'SCOUT' ? 'SDRF Field Scout' : 'Commuter Report'),
      userRole: user?.role || 'PUBLIC'
    };

    const isOnline = offlineSync.getOnlineStatus();

    if (isOnline) {
      try {
        await api.post('/api/scout/report', reportData);
        setFeedback({
          type: 'success',
          message: 'Ground observation registered and dispatched to mountain incident network.'
        });
        setDescription('');
        setTimeout(() => {
          onReportSubmitted?.();
          onClose();
        }, 1600);
      } catch {
        // If direct post fails, queue in offline outbox
        offlineSync.enqueueAction('FIELD_REPORT', reportData);
        setFeedback({
          type: 'queued',
          message: 'Network link unstable. Report safely saved in local offline outbox; will auto-sync.'
        });
        setDescription('');
        setTimeout(() => {
          onReportSubmitted?.();
          onClose();
        }, 2000);
      } finally {
        setSubmitting(false);
      }
    } else {
      // Offline mode: queue directly
      offlineSync.enqueueAction('FIELD_REPORT', reportData);
      setFeedback({
        type: 'queued',
        message: 'Saved to offline queue. Will auto-sync to Core Gateway once cellular coverage is restored.'
      });
      setDescription('');
      setSubmitting(false);
      setTimeout(() => {
        onReportSubmitted?.();
        onClose();
      }, 2000);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-lg bg-[#0D1117] border border-[#30363D] shadow-2xl rounded-none text-slate-200 overflow-hidden"
        >
          {/* Header */}
          <div className="px-5 py-3.5 bg-[#161B22] border-b border-[#30363D] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                [ FIELD SCOUT & HAZARD REPORTING ]
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-none hover:bg-[#21262D] transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {targetAlert && (
            <div className="px-5 py-2.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-xs font-mono">
              <span className="text-amber-300 font-medium">
                Direct Update For Alert: <strong>{targetAlert.sectorName}</strong>
              </span>
              <span className="text-[10px] text-amber-400/80">#{targetAlert.alertId}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-mono">
            {/* Location Corridor Notice */}
            <div className="p-3 bg-[#161B22] border border-[#30363D] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px] uppercase tracking-wide">
                  Active GPS / Corridor:
                </span>
                <span className="text-amber-400 font-bold">
                  {userLocation?.cityName || 'Ramban'} ({userLocation?.latitude?.toFixed(2) ?? 33.24}°N, {userLocation?.longitude?.toFixed(2) ?? 75.24}°E)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans">
                Reports are geofenced and synchronized with all response units within 10 km.
              </p>
            </div>

            {/* Hazard Type Selector */}
            <div className="space-y-1.5">
              <label className="text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                Hazard Category:
              </label>
              <select
                value={hazardType}
                onChange={(e) => setHazardType(e.target.value as HazardType)}
                className="w-full bg-[#161B22] border border-[#30363D] text-slate-200 px-3 py-2 rounded-none focus:outline-none focus:border-amber-400"
              >
                <option value="ROCKFALL">Shooting Stones / Rockfall</option>
                <option value="CRACK">Road Fissure / Slope Subsidence</option>
                <option value="DEBRIS_FLOW">Mudflow / Debris Spill</option>
                <option value="WATER_LOGGING">Pore Water / Heavy Water Logging</option>
                <option value="ROAD_BLOCK">Highway Traffic Blockage</option>
              </select>
            </div>

            {/* Severity Level */}
            <div className="space-y-1.5">
              <label className="text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                Hazard Severity:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as ReportSeverity[]).map((lvl) => {
                  const isSelected = severity === lvl;
                  const border = isSelected
                    ? lvl === 'CRITICAL'
                      ? 'border-rose-500 bg-rose-950/40 text-rose-300'
                      : lvl === 'HIGH'
                      ? 'border-amber-500 bg-amber-950/40 text-amber-300'
                      : 'border-blue-500 bg-blue-950/40 text-blue-300'
                    : 'border-[#30363D] bg-[#161B22] text-slate-400 hover:border-slate-600';
                  return (
                    <button
                      type="button"
                      key={lvl}
                      onClick={() => setSeverity(lvl)}
                      className={`py-1.5 text-center font-bold text-[10px] uppercase border rounded-none transition ${border}`}
                    >
                      {lvl}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Visual Description */}
            <div className="space-y-1.5">
              <label className="text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                Observation Details:
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe crack length, falling stone intensity, lane obstruction, or hillside movement..."
                rows={3}
                required
                className="w-full bg-[#161B22] border border-[#30363D] text-slate-200 p-2.5 rounded-none font-sans text-xs focus:outline-none focus:border-amber-400 custom-scrollbar resize-none"
              />
            </div>

            {/* Feedback Message */}
            {feedback && (
              <div
                className={`p-3 border rounded-none font-sans text-xs flex items-center gap-2 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-950/40 border-emerald-600 text-emerald-300'
                    : feedback.type === 'queued'
                    ? 'bg-amber-950/40 border-amber-600 text-amber-300'
                    : 'bg-rose-950/40 border-rose-600 text-rose-300'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#30363D]">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 bg-[#161B22] hover:bg-[#21262D] text-slate-300 border border-[#30363D] rounded-none transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !description.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold border border-amber-400 rounded-none transition shadow-sm disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? 'Transmitting...' : 'Dispatch Report'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
