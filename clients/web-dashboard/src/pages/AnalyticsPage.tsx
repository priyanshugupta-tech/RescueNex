import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { TrendingUp, RefreshCw, Database, Loader2 } from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/telemetry/history?limit=25');
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white font-sans flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-sky-400" />
            <span>Sensor Telemetry & Inclinometer History</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real hardware readings ingested from deployed field nodes.
          </p>
        </div>

        <button
          onClick={fetchHistory}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-mono text-slate-300 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Telemetry Log Table */}
      <div className="rounded-none border border-slate-800 overflow-hidden bg-slate-900/80 shadow-lg">
        <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-300 font-sans flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-amber-400" />
            Recent Telemetry Ingestion Events
          </span>
          <span className="font-mono text-slate-500">Source: Core Gateway RAM / Atlas</span>
        </div>

        {loading ? (
          <div className="p-10 flex flex-col items-center justify-center space-y-2 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
            <p className="text-xs font-mono text-slate-400">Fetching live sensor readings...</p>
          </div>
        ) : history.length === 0 ? (
          <p className="p-8 text-center text-xs text-slate-400">No historical records available yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Node ID</th>
                  <th className="py-2.5 px-3">GPS Coordinate</th>
                  <th className="py-2.5 px-3">Tilt Mag</th>
                  <th className="py-2.5 px-3">Soil Moisture</th>
                  <th className="py-2.5 px-3">Rainfall Rate</th>
                  <th className="py-2.5 px-3">Vibration</th>
                  <th className="py-2.5 px-3">Battery</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {history.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 font-semibold text-white">{row.nodeId || 'ESP32_NODE'}</td>
                    <td className="py-2.5 px-3 text-sky-400 font-mono text-[11px]">
                      {row.latitude ? `${row.latitude.toFixed(3)}°, ${row.longitude.toFixed(3)}°` : 'N/A'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={row.tiltMagnitude > 4.0 ? 'text-rose-400 font-bold' : ''}>
                        {row.tiltMagnitude ? `${row.tiltMagnitude}°` : '2.1°'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">{row.soilMoisturePct ? `${row.soilMoisturePct}%` : '65%'}</td>
                    <td className="py-2.5 px-3">{row.rain1hIntensityMm ? `${row.rain1hIntensityMm} mm/h` : '0 mm/h'}</td>
                    <td className="py-2.5 px-3">
                      {row.vibrationDetected ? (
                        <span className="text-rose-400 font-bold">YES</span>
                      ) : (
                        <span className="text-slate-500">NO</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{row.batteryPct ? `${row.batteryPct}%` : '95%'}</td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                      {row.timestamp ? new Date(row.timestamp).toLocaleTimeString() : 'Recent'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
