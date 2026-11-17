import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { Loader2 } from 'lucide-react';
import { GeoLocation, calculateDistanceKm } from '../utils/geoUtils.ts';
import { TelemetryTrendChart } from '../components/TelemetryTrendChart.tsx';

interface AnalyticsPageProps {
  userLocation: GeoLocation | null;
  onOpenLocationModal?: () => void;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({
  userLocation,
  onOpenLocationModal
}) => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllLogs, setShowAllLogs] = useState(false);

  const userLat = Number(userLocation?.latitude) || 33.2422;
  const userLon = Number(userLocation?.longitude) || 75.2443;

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/telemetry/history?limit=50');
      if (res.data.success) {
        setHistory(res.data.history || []);
      }
    } catch (e) {
      console.error('Failed to load telemetry history', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Compute distance from user location for each telemetry entry
  const historyWithDistance = history.map((row) => {
    const lat = typeof row.latitude === 'number' ? row.latitude : undefined;
    const lon = typeof row.longitude === 'number' ? row.longitude : undefined;

    let distKm: number | null = null;
    if (lat !== undefined && lon !== undefined && !isNaN(lat) && !isNaN(lon)) {
      distKm = calculateDistanceKm(userLat, userLon, lat, lon);
    }

    return {
      ...row,
      distanceKm: distKm,
      isWithin10Km: distKm !== null && distKm <= 10.0
    };
  }).sort((a, b) => {
    if (a.distanceKm === null) return 1;
    if (b.distanceKm === null) return -1;
    return a.distanceKm - b.distanceKm;
  });

  // Strictly localized to 10 km geofence & capped at max 50 packets
  const displayedRecords = historyWithDistance.filter((r) => r.isWithin10Km).slice(0, 50);
  const nearestRecord = historyWithDistance.find((r) => r.distanceKm !== null);
  const visibleRecords = showAllLogs ? displayedRecords : displayedRecords.slice(0, 8);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-lg font-bold text-white uppercase tracking-wider font-mono">
            Sensor Telemetry Logs
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 font-sans">
            Real hardware readings ingested from slope field nodes within 10 km.
          </p>
        </div>

        <button
          onClick={fetchHistory}
          disabled={loading}
          className="px-3 py-1.5 rounded-none bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-mono text-slate-300 transition shrink-0"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* User Location Context Banner */}
      <div className="p-4 rounded-none bg-[#161B22] border border-[#30363D] flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="space-y-1 font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300 uppercase tracking-wide">
              Active Transit Corridor:
            </span>
            <span className="font-semibold text-white bg-[#0D1117] px-2 py-0.5 border border-[#30363D] rounded">
              {userLocation?.cityName || 'Ramban Central'}
            </span>
            <span className="text-slate-400 text-[11px]">
              ({userLat.toFixed(2)}°N, {userLon.toFixed(2)}°E)
            </span>
          </div>

          <p className="text-xs text-slate-300 font-sans mt-0.5">
            {displayedRecords.length > 0 ? (
              <span>
                Showing {displayedRecords.length} live telemetry packet(s) within 10 km.
              </span>
            ) : (
              <span className="text-slate-400 font-sans text-xs">
                No active sensor stations within 10 km. Nearest station: {' '}
                <span className="text-slate-200 font-semibold">{nearestRecord?.nodeId || 'PHYSICAL_ESP32_01'}</span>{' '}
                ({nearestRecord?.distanceKm ?? '--'} km away).
              </span>
            )}
          </p>
        </div>

        {onOpenLocationModal && (
          <button
            onClick={onOpenLocationModal}
            className="px-3 py-1.5 rounded-md bg-[#21262D] hover:bg-[#30363D] text-slate-200 border border-[#30363D] text-xs font-mono font-medium transition"
          >
            Edit Location
          </button>
        )}
      </div>

      {/* Geotechnical Telemetry Trends (Strictly localized to 10 km corridor) */}
      <TelemetryTrendChart
        userLocation={userLocation}
        historyData={displayedRecords}
        radiusKm={10}
      />

      {/* Telemetry Log Table */}
      <div className="rounded-none border border-slate-800 overflow-hidden bg-slate-900/80 shadow-lg">
        <div className="p-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-slate-300 font-mono text-xs uppercase tracking-wider">
            Recent Telemetry Track ({visibleRecords.length} of {displayedRecords.length} packets)
          </span>

          {displayedRecords.length > 8 && (
            <button
              onClick={() => setShowAllLogs(!showAllLogs)}
              className="text-[11px] font-mono text-slate-300 hover:text-white px-2.5 py-1 rounded bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] transition"
            >
              {showAllLogs ? 'Show Limited Track (8)' : `View All Packets (${displayedRecords.length})`}
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-10 flex flex-col items-center justify-center space-y-2 text-center">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            <p className="text-xs font-mono text-slate-400">Fetching live sensor readings...</p>
          </div>
        ) : displayedRecords.length === 0 ? (
          <div className="p-8 text-center space-y-1 text-slate-400">
            <p className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider">
              [ NO SENSORS IN 10 KM ]
            </p>
            <p className="text-xs text-slate-400">
              No field stations detected within 10 km of {userLocation?.cityName || 'current location'}.
            </p>
            {nearestRecord && (
              <p className="text-[11px] text-slate-500 font-mono mt-1">
                Nearest active station: {nearestRecord.nodeId} ({nearestRecord.distanceKm} km away).
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Node ID</th>
                  <th className="py-2.5 px-3">Distance</th>
                  <th className="py-2.5 px-3">Coordinate</th>
                  <th className="py-2.5 px-3">Tilt</th>
                  <th className="py-2.5 px-3">Soil Moisture</th>
                  <th className="py-2.5 px-3">Rainfall</th>
                  <th className="py-2.5 px-3">Vibration</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {visibleRecords.map((row, idx) => {
                  const tilt = typeof row.tiltMagnitude === 'number' ? row.tiltMagnitude : (typeof row.tiltX === 'number' ? Math.sqrt(row.tiltX**2 + (row.tiltY||0)**2) : 0);
                  const isCritical = tilt >= 4.0;
                  const isWarning = tilt >= 2.0;

                  return (
                    <tr key={idx} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-3 font-semibold text-white">
                        {row.nodeId || 'ESP32_NODE'}
                      </td>
                      <td className="py-2.5 px-3">
                        {row.distanceKm !== null ? (
                          <span className="text-slate-300">
                            {row.distanceKm} km
                          </span>
                        ) : (
                          <span className="text-slate-500">--</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-sky-400 font-mono text-[11px]">
                        {typeof row.latitude === 'number' && typeof row.longitude === 'number'
                          ? `${row.latitude.toFixed(3)}°, ${row.longitude.toFixed(3)}°`
                          : 'N/A'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-slate-200 font-medium">
                          {tilt.toFixed(1)}°
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {typeof row.soilMoisturePct === 'number' ? `${row.soilMoisturePct}%` : '--'}
                      </td>
                      <td className="py-2.5 px-3">
                        {typeof row.rain1hIntensityMm === 'number' ? `${row.rain1hIntensityMm} mm/h` : '0.0 mm/h'}
                      </td>
                      <td className="py-2.5 px-3">
                        {row.vibrationDetected ? (
                          <span className="text-slate-200 font-medium font-mono">DETECTED</span>
                        ) : (
                          <span className="text-slate-500 font-mono">NORMAL</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                        {row.timestamp ? new Date(row.timestamp).toLocaleTimeString() : 'Recent'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
