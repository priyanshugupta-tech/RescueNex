import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { offlineCache } from '../services/offlineCache.ts';
import { offlineSync } from '../services/offlineSync.ts';
import { EmergencyAlert, MountainSector, FieldReport } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { GeoLocation, calculateDistanceKm } from '../utils/geoUtils.ts';
import { Loader2, ShieldAlert, PlusCircle } from 'lucide-react';

interface AlertsPageProps {
  userLocation: GeoLocation | null;
  sectors?: MountainSector[];
  onOpenLocationModal?: () => void;
  onOpenReportModal?: (context?: { alertId: string; sectorName: string }) => void;
}

export const AlertsPage: React.FC<AlertsPageProps> = ({
  userLocation,
  sectors = [],
  onOpenLocationModal,
  onOpenReportModal
}) => {
  const { user } = useAuth();
  const [activeAlerts, setActiveAlerts] = useState<EmergencyAlert[]>([]);
  const [fieldReports, setFieldReports] = useState<FieldReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState('');

  const userLat = Number(userLocation?.latitude) || 33.2422;
  const userLon = Number(userLocation?.longitude) || 75.2443;
  const isAuthorizedFieldPersonnel = ['SCOUT', 'OPERATOR', 'ADMIN'].includes(user?.role || '');

  const fetchAlertsAndReports = async () => {
    try {
      // 1. Fetch Alerts
      const alertsRes = await api.get('/api/alerts');
      if (alertsRes.data.success) {
        const loadedAlerts = alertsRes.data.activeAlerts || [];
        setActiveAlerts(loadedAlerts);
        offlineCache.save('alerts', loadedAlerts);
      }

      // 2. Fetch Field Scout Reports within 10 km
      const reportsRes = await api.get(
        `/api/scout/reports?lat=${userLat}&lon=${userLon}&radiusKm=10`
      );
      if (reportsRes.data.success) {
        const loadedReports = reportsRes.data.reports || [];
        setFieldReports(loadedReports);
        offlineCache.save('field_reports', loadedReports);
      }
    } catch (e) {
      console.warn('Network unreachable, falling back to offline cache:', e);
      const cachedAlerts = offlineCache.get<EmergencyAlert[]>('alerts', []);
      setActiveAlerts(cachedAlerts);
      const cachedReports = offlineCache.get<FieldReport[]>('field_reports', []);
      setFieldReports(cachedReports);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlertsAndReports();
    const interval = setInterval(fetchAlertsAndReports, 5000);
    return () => clearInterval(interval);
  }, [userLat, userLon]);

  const handleAcknowledge = async (alertId: string) => {
    const isOnline = offlineSync.getOnlineStatus();
    if (isOnline) {
      try {
        await api.post(`/api/alerts/${alertId}/acknowledge`);
        setActionSuccess(`Alert ${alertId} acknowledged.`);
        setTimeout(() => setActionSuccess(''), 3000);
        fetchAlertsAndReports();
      } catch (e: any) {
        offlineSync.enqueueAction('ALERT_ACK', {
          alertId,
          acknowledgedBy: user?.fullName || 'Operator'
        });
        setActionSuccess(`[Offline] Acknowledgment queued. Will auto-sync when online.`);
        setTimeout(() => setActionSuccess(''), 3500);
      }
    } else {
      offlineSync.enqueueAction('ALERT_ACK', {
        alertId,
        acknowledgedBy: user?.fullName || 'Operator'
      });
      setActionSuccess(`[Offline] Acknowledgment saved in local outbox.`);
      setTimeout(() => setActionSuccess(''), 3500);
    }
  };

  const handleResolve = async (alertId: string) => {
    const isOnline = offlineSync.getOnlineStatus();
    if (isOnline) {
      try {
        await api.post(`/api/alerts/${alertId}/resolve`);
        setActionSuccess(`Alert ${alertId} resolved and archived.`);
        setTimeout(() => setActionSuccess(''), 3000);
        fetchAlertsAndReports();
      } catch (e: any) {
        offlineSync.enqueueAction('ALERT_RESOLVE', { alertId });
        setActionSuccess(`[Offline] Alert resolve action queued.`);
        setTimeout(() => setActionSuccess(''), 3500);
      }
    } else {
      offlineSync.enqueueAction('ALERT_RESOLVE', { alertId });
      setActionSuccess(`[Offline] Alert resolve action saved in local outbox.`);
      setTimeout(() => setActionSuccess(''), 3500);
    }
  };

  const handleDownloadCAP = (alertId: string) => {
    window.open(`/api/alerts/${alertId}/cap-xml`, '_blank');
  };

  // Associate each alert with geographical distance to user location
  const computeAlertDistance = (alert: EmergencyAlert) => {
    if (typeof (alert as any).latitude === 'number' && typeof (alert as any).longitude === 'number') {
      return calculateDistanceKm(userLat, userLon, (alert as any).latitude, (alert as any).longitude);
    }
    const sec = sectors.find((s) => s.id === alert.sectorId);
    if (sec && typeof sec.latitude === 'number' && typeof sec.longitude === 'number') {
      return calculateDistanceKm(userLat, userLon, sec.latitude, sec.longitude);
    }
    if (alert.sectorName && userLocation?.cityName && alert.sectorName.toLowerCase().includes(userLocation.cityName.toLowerCase())) {
      return 0;
    }
    return 999;
  };

  const alertsWithDistance = activeAlerts.map((a) => {
    const dist = computeAlertDistance(a);
    return {
      ...a,
      distanceKm: dist,
      isWithin10Km: dist <= 10.0
    };
  }).sort((a, b) => a.distanceKm - b.distanceKm);

  // Strictly filter to user's active 10 km geofence only
  const displayedAlerts = alertsWithDistance.filter((a) => a.isWithin10Km);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-lg font-bold text-white uppercase tracking-wider font-mono">
            Emergency Alerts & Public Warning Bulletins
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 font-sans">
            Hazard advisories and evacuation notices for your active 10 km transit perimeter.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {actionSuccess && (
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-none border border-emerald-500/30">
              {actionSuccess}
            </span>
          )}

          {onOpenReportModal && isAuthorizedFieldPersonnel && (
            <button
              onClick={onOpenReportModal}
              className="px-3 py-1.5 rounded-none bg-amber-500 hover:bg-amber-400 text-black text-xs font-mono font-bold flex items-center gap-1.5 transition shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Report Hazard</span>
            </button>
          )}
        </div>
      </div>

      {/* User Location Context Banner */}
      <div className="p-4 rounded-none bg-[#161B22] border border-[#30363D] flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="space-y-1 font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300 uppercase tracking-wide">
              Active Transit Corridor:
            </span>
            <span className="font-semibold text-white font-mono bg-[#0D1117] px-2 py-0.5 border border-[#30363D] rounded">
              {userLocation?.cityName || 'Ramban Central'}
            </span>
            <span className="text-slate-400 text-[11px]">
              ({userLat.toFixed(2)}°N, {userLon.toFixed(2)}°E)
            </span>
          </div>

          <p className="text-xs font-sans mt-0.5">
            {displayedAlerts.length > 0 ? (
              <span className="text-rose-400 font-medium font-mono">
                [!] {displayedAlerts.length} hazard bulletin(s) active inside your 10 km zone.
              </span>
            ) : (
              <span className="text-slate-300 font-sans">
                Status: Normal. No active slope failure detected within 10 km.
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenReportModal && isAuthorizedFieldPersonnel && (
            <button
              onClick={onOpenReportModal}
              className="px-3 py-1.5 rounded-md bg-[#21262D] hover:bg-[#30363D] text-slate-200 border border-[#30363D] text-xs font-mono font-medium transition"
            >
              + Field Report
            </button>
          )}
          {onOpenLocationModal && (
            <button
              onClick={onOpenLocationModal}
              className="px-3 py-1.5 rounded-md bg-[#21262D] hover:bg-[#30363D] text-slate-200 border border-[#30363D] text-xs font-mono font-medium transition"
            >
              Edit Location
            </button>
          )}
        </div>
      </div>

      {/* Active Alerts List (Strictly 10 km Geofenced) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-[#21262D] pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
            Advisories Within 10 km ({displayedAlerts.length})
          </h3>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            <p className="text-xs text-slate-400 font-mono">Checking regional hazard feeds...</p>
          </div>
        ) : displayedAlerts.length === 0 ? (
          <div className="p-6 rounded-md bg-[#161B22] border border-[#30363D] text-center space-y-1">
            <p className="text-xs font-semibold text-slate-300 font-mono uppercase tracking-wider">
              [ STATUS: NORMAL ]
            </p>
            <p className="text-xs text-slate-300 font-sans mt-1">
              10 km transit perimeter around {userLocation?.cityName || 'current location'} is stable.
            </p>
            <p className="text-[11px] text-slate-500 font-mono">
              Highway traffic running normally. Drive safely and observe corridor markers.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedAlerts.map((alert) => {
              const alertId = alert.id || (alert as any).alertId || 'ALERT';
              const level = (alert as any).level || (alert as any).riskLevel || 'WARNING';
              const enMsg = (alert as any).descriptions?.en || alert.multilingual?.en || (alert as any).headline || 'Emergency bulletin active.';
              const hiMsg = (alert as any).descriptions?.hi || alert.multilingual?.hi || 'भूस्खलन चेतावनी सक्रिय।';
              const dogriMsg = (alert as any).descriptions?.dogri || alert.multilingual?.dogri || 'ज़मीन खिसकने दी चेताउनी: एहतियात बरतौ।';
              const cause = alert.triggerCause || (alert as any).headline || 'Slope Deformation Threshold Exceeded';
              const dist = alert.distanceKm;
              const attachedReports = fieldReports.filter(
                (r) =>
                  r.alertId === alertId ||
                  r.alertId === (alert as any).alertId ||
                  (r.cityName && alert.sectorName && r.cityName.toLowerCase() === alert.sectorName.toLowerCase())
              );

              return (
                <div 
                  key={alertId}
                  className="p-4 rounded-md border border-[#30363D] bg-[#161B22] shadow-sm transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${
                        level === 'CRITICAL'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}>
                        {level}
                      </span>
                      <span className="text-sm font-semibold text-white font-sans">
                        {alert.sectorName}
                      </span>
                      {dist !== undefined && dist < 999 && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-300 bg-[#21262D] border border-[#30363D]">
                          {dist} km away
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => handleDownloadCAP(alertId)}
                        className="px-2.5 py-1 rounded bg-[#21262D] hover:bg-[#30363D] text-slate-300 text-xs font-mono border border-[#30363D] transition"
                        title="Download XML Document"
                      >
                        CAP XML
                      </button>

                      {alert.status === 'ACKNOWLEDGED' && (
                        <span className="px-2 py-1 rounded bg-[#21262D] border border-amber-500/30 text-amber-400 text-[11px] font-mono">
                          ACKNOWLEDGED
                        </span>
                      )}

                      {['ADMIN', 'OPERATOR'].includes(user?.role || '') && alert.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleAcknowledge(alertId)}
                          className="px-3 py-1 rounded bg-[#21262D] hover:bg-[#30363D] text-slate-200 border border-[#30363D] text-xs font-medium shadow-sm transition"
                        >
                          Acknowledge
                        </button>
                      )}

                      {['ADMIN', 'OPERATOR'].includes(user?.role || '') && (
                        <button
                          onClick={() => handleResolve(alertId)}
                          className="px-3 py-1 rounded bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 text-xs font-medium shadow-sm transition"
                        >
                          Resolve Alert
                        </button>
                      )}

                      {isAuthorizedFieldPersonnel && onOpenReportModal && (
                        <button
                          onClick={() => onOpenReportModal({ alertId, sectorName: alert.sectorName })}
                          className="px-2.5 py-1 rounded bg-[#21262D] hover:bg-[#30363D] text-amber-300 border border-amber-500/30 text-xs font-mono transition flex items-center gap-1"
                        >
                          + Respond
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                    <div className="p-3 rounded bg-[#0D1117] border border-[#21262D]">
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">English Advisory</span>
                      <p className="text-slate-200 mt-1 font-sans leading-relaxed">{enMsg}</p>
                    </div>
                    <div className="p-3 rounded bg-[#0D1117] border border-[#21262D]">
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">हिंदी चेतावनी</span>
                      <p className="text-slate-200 mt-1 font-sans leading-relaxed">{hiMsg}</p>
                    </div>
                    <div className="p-3 rounded bg-[#0D1117] border border-[#21262D]">
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">डोगरी चेताउनी</span>
                      <p className="text-slate-200 mt-1 font-sans leading-relaxed">{dogriMsg}</p>
                    </div>
                  </div>

                  {/* Attached Field Scout Observations / Situation Updates */}
                  {attachedReports.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[#21262D] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Attached Scout Responses & Situation Updates ({attachedReports.length})
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {attachedReports.map((r) => (
                          <div
                            key={r.id}
                            className="p-2.5 rounded bg-[#0D1117] border border-[#21262D] flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-mono"
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-1.5 py-0.5 text-[9px] rounded font-bold border ${
                                r.severity === 'CRITICAL' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              }`}>
                                {r.severity}
                              </span>
                              <span className="text-white font-sans font-medium">{r.hazardType.replace('_', ' ')}:</span>
                              <span className="text-slate-300 font-sans">{r.description}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 shrink-0">
                              {r.userName} • {new Date(r.reportedAt).toLocaleTimeString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 font-mono border-t border-[#21262D] pt-2">
                    <span>Trigger Cause: {cause}</span>
                    <span>
                      Recorded: {alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : 'Just now'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ground Scout & Commuter Field Observations (Strictly 10 km Geofenced) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
              Ground Scout Field Reports Within 10 km ({fieldReports.length})
            </h3>
          </div>
          {onOpenReportModal && isAuthorizedFieldPersonnel && (
            <button
              onClick={onOpenReportModal}
              className="text-xs font-mono text-amber-400 hover:text-amber-300 underline"
            >
              + Submit Observation
            </button>
          )}
        </div>

        {fieldReports.length === 0 ? (
          <div className="p-4 rounded-none bg-[#161B22] border border-[#30363D] text-slate-400 text-xs font-mono">
            No ground hazard observations registered within 10 km of this corridor.
          </div>
        ) : (
          <div className="space-y-2">
            {fieldReports.map((report) => {
              const sevBadge =
                report.severity === 'CRITICAL'
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  : report.severity === 'HIGH'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : 'bg-[#21262D] text-slate-300 border-[#30363D]';

              return (
                <div
                  key={report.id}
                  className="p-3 bg-[#161B22] border border-[#30363D] rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 text-[10px] font-medium rounded border ${sevBadge}`}>
                        {report.severity}
                      </span>
                      <span className="text-white font-sans font-medium">
                        {report.hazardType.replace('_', ' ')}
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        at {report.cityName || 'Corridor Point'}
                      </span>
                      {report.distanceKm !== undefined && (
                        <span className="text-slate-300 font-mono text-[11px]">
                          ({report.distanceKm} km away)
                        </span>
                      )}
                      {report.source === 'OFFLINE_SYNC' && (
                        <span className="px-1.5 py-0.5 text-[9px] rounded bg-[#21262D] text-slate-300 border border-[#30363D]">
                          [OFFLINE SYNCED]
                        </span>
                      )}
                    </div>
                    <p className="text-slate-300 font-sans text-xs">
                      {report.description}
                    </p>
                  </div>

                  <div className="text-right text-[11px] text-slate-400 shrink-0">
                    <p className="text-slate-300">{report.userName}</p>
                    <p>{new Date(report.reportedAt).toLocaleTimeString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
