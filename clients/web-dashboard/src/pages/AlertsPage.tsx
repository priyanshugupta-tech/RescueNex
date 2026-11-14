import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { EmergencyAlert } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { 
  AlertTriangle, 
  Download, 
  CheckCircle, 
  MapPin, 
  Clock, 
  FileCode,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';

export const AlertsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeAlerts, setActiveAlerts] = useState<EmergencyAlert[]>([]);
  const [historyAlerts, setHistoryAlerts] = useState<EmergencyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState('');

  const fetchAlerts = async () => {
    try {
      const res = await api.get('/api/alerts');
      if (res.data.success) {
        setActiveAlerts(res.data.activeAlerts || []);
        setHistoryAlerts(res.data.history || []);
      }
    } catch (e) {
      console.error('Failed to load alerts', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleAcknowledge = async (alertId: string) => {
    try {
      await api.post(`/api/alerts/${alertId}/acknowledge`);
      setActionSuccess(`Alert ${alertId} acknowledged.`);
      setTimeout(() => setActionSuccess(''), 3000);
      fetchAlerts();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to acknowledge alert.');
    }
  };

  const handleDownloadCAP = (alertId: string) => {
    window.open(`/api/alerts/${alertId}/cap-xml`, '_blank');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white font-sans flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            <span>Emergency Alerts & Public Warning Bulletins</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time hazard notifications formatted in compliance with Common Alerting Protocol (CAP v1.2).
          </p>
        </div>

        {actionSuccess && (
          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
            ✓ {actionSuccess}
          </span>
        )}
      </div>

      {/* Active Alerts List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
          Active Disaster Bulletins ({activeAlerts.length})
        </h3>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
            <p className="text-xs text-slate-400 font-mono">Loading active disaster bulletins...</p>
          </div>
        ) : activeAlerts.length === 0 ? (
          <div className="p-8 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
            <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="text-sm font-semibold text-slate-200">No Critical Landslide Threats Active</p>
            <p className="text-xs text-slate-500">All monitored mountain corridors are reporting stable slope conditions.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeAlerts.map((alert) => (
              <div 
                key={alert.id}
                className="p-4 rounded-xl border border-[#30363D] bg-[#161B22] transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                      alert.level === 'CRITICAL'
                        ? 'bg-rose-600 text-white'
                        : 'bg-amber-600 text-white'
                    }`}>
                      {alert.level}
                    </span>
                    <span className="text-sm font-bold text-white font-sans">
                      {alert.sectorName}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      KM: {alert.kmMarker}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* CAP XML Download Button */}
                    <button
                      onClick={() => handleDownloadCAP(alert.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono border border-slate-700 transition"
                      title="Download Common Alerting Protocol (CAP v1.2) XML Document"
                    >
                      <FileCode className="w-3.5 h-3.5 text-amber-400" />
                      <span>CAP XML</span>
                    </button>

                    {/* Operator Acknowledge Button */}
                    {['ADMIN', 'OPERATOR'].includes(user?.role || '') && alert.status === 'ACTIVE' && (
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Acknowledge</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Multilingual Messages */}
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">English</span>
                    <p className="text-slate-300 mt-0.5">{alert.multilingual.en}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">हिंदी</span>
                    <p className="text-slate-300 mt-0.5 font-sans">{alert.multilingual.hi}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 font-mono border-t border-slate-800/60 pt-2">
                  <span>Trigger Cause: {alert.triggerCause}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historical Audit Trail */}
      {historyAlerts.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
            Past Incident Audit History
          </h3>
          <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/60 text-xs">
            <div className="divide-y divide-slate-800/80">
              {historyAlerts.slice(0, 5).map((h) => (
                <div key={h.id} className="p-3 flex items-center justify-between gap-3">
                  <div>
                    <span className="font-semibold text-slate-200">{h.sectorName}</span>
                    <span className="text-slate-400 font-mono text-[11px] ml-2">({h.triggerCause})</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
                    <span>{new Date(h.timestamp).toLocaleDateString()}</span>
                    <span className="text-emerald-400">{h.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
