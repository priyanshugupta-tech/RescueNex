import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api.ts';
import { GeoLocation, calculateDistanceKm } from '../utils/geoUtils.ts';
import { NodeTelemetry } from '../types/index.ts';
import { Activity, RefreshCw } from 'lucide-react';

interface TelemetryTrendChartProps {
  userLocation: GeoLocation | null;
  latestTelemetry?: NodeTelemetry | null;
  historyData?: any[];
  radiusKm?: number;
  className?: string;
}

type MetricType = 'tilt' | 'moisture' | 'rain';

interface DataPoint {
  timestamp: number;
  timeLabel: string;
  nodeId: string;
  tilt: number;
  moisture: number;
  rain: number;
  vibration: boolean;
  distanceKm: number | null;
}

export const TelemetryTrendChart: React.FC<TelemetryTrendChartProps> = ({
  userLocation,
  latestTelemetry,
  historyData: externalHistory,
  radiusKm = 10,
  className = ''
}) => {
  const [metric, setMetric] = useState<MetricType>('tilt');
  const [fetchedHistory, setFetchedHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const userLat = Number(userLocation?.latitude) || 33.2422;
  const userLon = Number(userLocation?.longitude) || 75.2443;

  const fetchHistory = async () => {
    if (externalHistory) return;
    setLoading(true);
    try {
      const res = await api.get('/api/telemetry/history?limit=30');
      if (res.data.success && Array.isArray(res.data.history)) {
        setFetchedHistory(res.data.history);
      }
    } catch (e) {
      console.warn('Could not fetch telemetry history for trend chart', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!externalHistory) {
      fetchHistory();
    }
  }, [externalHistory]);

  const rawList = externalHistory || fetchedHistory;

  // Process and sort chronologically (oldest to newest for X-axis)
  const dataPoints: DataPoint[] = useMemo(() => {
    const list = [...rawList];

    // Filter within 10 km geofence if coordinates are available
    const mapped = list.map((item) => {
      const lat = typeof item.latitude === 'number' ? item.latitude : undefined;
      const lon = typeof item.longitude === 'number' ? item.longitude : undefined;
      let dist: number | null = null;
      if (lat !== undefined && lon !== undefined && !isNaN(lat) && !isNaN(lon)) {
        dist = calculateDistanceKm(userLat, userLon, lat, lon);
      }

      const t = item.timestamp ? new Date(item.timestamp).getTime() : Date.now();
      const tiltVal = typeof item.tiltMagnitude === 'number' 
        ? item.tiltMagnitude 
        : (typeof item.tiltX === 'number' ? Math.sqrt(item.tiltX ** 2 + (item.tiltY || 0) ** 2) : 0);

      return {
        timestamp: t,
        timeLabel: new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        nodeId: item.nodeId || 'ESP32_01',
        tilt: Number(tiltVal.toFixed(2)),
        moisture: typeof item.soilMoisturePct === 'number' ? Number(item.soilMoisturePct.toFixed(1)) : 0,
        rain: typeof item.rain1hIntensityMm === 'number' ? Number(item.rain1hIntensityMm.toFixed(1)) : 0,
        vibration: Boolean(item.vibrationDetected),
        distanceKm: dist
      };
    });

    // Invert so left is earlier in time and right is latest
    let chron = mapped.sort((a, b) => a.timestamp - b.timestamp);

    // If latestTelemetry prop is present and newer, append or replace newest
    if (latestTelemetry) {
      const liveTilt = latestTelemetry.tiltMagnitude || Math.sqrt((latestTelemetry.tiltX || 0)**2 + (latestTelemetry.tiltY || 0)**2);
      const liveDist = calculateDistanceKm(userLat, userLon, latestTelemetry.latitude, latestTelemetry.longitude);
      
      const livePoint: DataPoint = {
        timestamp: latestTelemetry.timestamp || Date.now(),
        timeLabel: new Date(latestTelemetry.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        nodeId: latestTelemetry.nodeId || 'PHYSICAL_ESP32_01',
        tilt: Number(liveTilt.toFixed(2)),
        moisture: Number((latestTelemetry.soilMoisturePct || 0).toFixed(1)),
        rain: 0,
        vibration: Boolean(latestTelemetry.vibrationDetected),
        distanceKm: liveDist
      };

      if (chron.length === 0) {
        chron.push(livePoint);
      } else if (chron[chron.length - 1].timestamp < livePoint.timestamp) {
        chron.push(livePoint);
      }
    }

    // Keep to max 25 points for crisp legibility
    return chron.slice(-25);
  }, [rawList, latestTelemetry, userLat, userLon]);

  // Extract selected metric values
  const metricConfig = useMemo(() => {
    switch (metric) {
      case 'tilt':
        return {
          label: 'Slope Tilt Deviation',
          unit: '°',
          strokeColor: '#58A6FF',
          fillColor: '#58A6FF',
          getValue: (d: DataPoint) => d.tilt,
          warningThreshold: 2.0,
          criticalThreshold: 4.0,
          fixedMin: 0,
          defaultMax: 6.0
        };
      case 'moisture':
        return {
          label: 'Volumetric Soil Moisture',
          unit: '%',
          strokeColor: '#79C0FF',
          fillColor: '#79C0FF',
          getValue: (d: DataPoint) => d.moisture,
          warningThreshold: 60.0,
          criticalThreshold: 85.0,
          fixedMin: 0,
          defaultMax: 100.0
        };
      case 'rain':
        return {
          label: 'Precipitation Rate',
          unit: 'mm/h',
          strokeColor: '#A5D6FF',
          fillColor: '#A5D6FF',
          getValue: (d: DataPoint) => d.rain,
          warningThreshold: 15.0,
          criticalThreshold: 30.0,
          fixedMin: 0,
          defaultMax: 30.0
        };
    }
  }, [metric]);

  // SVG Coordinate Mathematics
  const width = 760;
  const height = 210;
  const padLeft = 48;
  const padRight = 30;
  const padTop = 20;
  const padBottom = 30;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const values = dataPoints.map(metricConfig.getValue);
  const maxDataVal = values.length > 0 ? Math.max(...values) : metricConfig.defaultMax;
  const minVal = metricConfig.fixedMin;
  const maxVal = Math.max(metricConfig.defaultMax, maxDataVal * 1.15);

  const getY = (val: number) => {
    const ratio = (val - minVal) / (maxVal - minVal || 1);
    return padTop + chartH - ratio * chartH;
  };

  const getX = (idx: number) => {
    if (dataPoints.length <= 1) return padLeft + chartW / 2;
    return padLeft + (idx / (dataPoints.length - 1)) * chartW;
  };

  // Build SVG path
  const linePath = useMemo(() => {
    if (dataPoints.length === 0) return '';
    return dataPoints.reduce((acc, dp, i) => {
      const x = getX(i);
      const y = getY(metricConfig.getValue(dp));
      return i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `${acc} L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, '');
  }, [dataPoints, metricConfig, maxVal]);

  const areaPath = useMemo(() => {
    if (dataPoints.length === 0) return '';
    const firstX = getX(0);
    const lastX = getX(dataPoints.length - 1);
    const bottomY = padTop + chartH;
    return `${linePath} L ${lastX.toFixed(1)} ${bottomY} L ${firstX.toFixed(1)} ${bottomY} Z`;
  }, [linePath, dataPoints, chartH]);

  // Ticks
  const numTicks = 4;
  const yTicks = Array.from({ length: numTicks + 1 }, (_, i) => {
    const val = minVal + (i / numTicks) * (maxVal - minVal);
    return { val, y: getY(val) };
  });

  // Calculate summary metrics
  const latestVal = values.length > 0 ? values[values.length - 1] : 0;
  const peakVal = values.length > 0 ? Math.max(...values) : 0;
  const minObserved = values.length > 0 ? Math.min(...values) : 0;

  const activeHover = hoverIndex !== null && dataPoints[hoverIndex] ? dataPoints[hoverIndex] : null;

  return (
    <div className={`p-4 rounded-md bg-[#161B22] border border-[#30363D] shadow-sm space-y-3 ${className}`}>
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#21262D] pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-slate-400" />
          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wide font-mono">
              Geotechnical Telemetry Trends
            </h4>
            <p className="text-[11px] text-slate-400 font-sans">
              Sequential time-series sampling for corridor nodes within {radiusKm} km.
            </p>
          </div>
        </div>

        {/* Metric Selector Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#0D1117] p-0.5 rounded border border-[#30363D]">
            <button
              onClick={() => { setMetric('tilt'); setHoverIndex(null); }}
              className={`px-2.5 py-1 text-[11px] font-mono rounded transition ${
                metric === 'tilt'
                  ? 'bg-[#21262D] text-white font-medium border border-[#30363D]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tilt (°)
            </button>
            <button
              onClick={() => { setMetric('moisture'); setHoverIndex(null); }}
              className={`px-2.5 py-1 text-[11px] font-mono rounded transition ${
                metric === 'moisture'
                  ? 'bg-[#21262D] text-white font-medium border border-[#30363D]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Moisture (%)
            </button>
            <button
              onClick={() => { setMetric('rain'); setHoverIndex(null); }}
              className={`px-2.5 py-1 text-[11px] font-mono rounded transition ${
                metric === 'rain'
                  ? 'bg-[#21262D] text-white font-medium border border-[#30363D]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Rain (mm/h)
            </button>
          </div>

          {!externalHistory && (
            <button
              onClick={fetchHistory}
              disabled={loading}
              title="Refresh telemetry samples"
              className="p-1.5 rounded bg-[#21262D] hover:bg-[#30363D] text-slate-400 hover:text-slate-200 border border-[#30363D] transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Threshold Reference Legend (Non-overlapping & clean) */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-4">
          {metricConfig.warningThreshold && (
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-0 border-t-2 border-dashed border-[#6E7681]" />
              <span>Warning: <strong className="text-slate-200 font-semibold">{metricConfig.warningThreshold}{metricConfig.unit}</strong></span>
            </div>
          )}
          {metricConfig.criticalThreshold && (
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-0 border-t-2 border-dashed border-[#8B949E]" />
              <span>Critical: <strong className="text-slate-200 font-semibold">{metricConfig.criticalThreshold}{metricConfig.unit}</strong></span>
            </div>
          )}
        </div>

        <span className="text-[10px] text-slate-500">
          Showing {dataPoints.length} sequential sample{dataPoints.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* SVG Chart Area */}
      <div className="relative bg-[#0D1117] rounded border border-[#21262D] p-2">
        {dataPoints.length === 0 ? (
          <div className="h-44 flex items-center justify-center text-center p-4">
            <p className="text-xs font-mono text-slate-500">
              No telemetry sequence received yet for the 10 km corridor. Awaiting packets...
            </p>
          </div>
        ) : (
          <div className="w-full overflow-hidden">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-44 sm:h-52 select-none"
              onMouseLeave={() => setHoverIndex(null)}
            >
              <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={metricConfig.fillColor} stopOpacity="0.10" />
                  <stop offset="100%" stopColor={metricConfig.fillColor} stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {/* Horizontal grid lines & Y-axis labels */}
              {yTicks.map((tick, i) => (
                <g key={i}>
                  <line
                    x1={padLeft}
                    y1={tick.y}
                    x2={width - padRight}
                    y2={tick.y}
                    stroke="#21262D"
                    strokeDasharray="3 3"
                    strokeWidth="1"
                  />
                  <text
                    x={padLeft - 8}
                    y={tick.y + 3}
                    textAnchor="end"
                    fill="#8B949E"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {tick.val.toFixed(metric === 'tilt' ? 1 : 0)}{metricConfig.unit}
                  </text>
                </g>
              ))}

              {/* Geotechnical Baseline Thresholds (Clean dashed lines without overlapping text) */}
              {metricConfig.warningThreshold && maxVal >= metricConfig.warningThreshold && (
                <line
                  x1={padLeft}
                  y1={getY(metricConfig.warningThreshold)}
                  x2={width - padRight}
                  y2={getY(metricConfig.warningThreshold)}
                  stroke="#6E7681"
                  strokeDasharray="4 4"
                  strokeWidth="1.2"
                />
              )}

              {metricConfig.criticalThreshold && maxVal >= metricConfig.criticalThreshold && (
                <line
                  x1={padLeft}
                  y1={getY(metricConfig.criticalThreshold)}
                  x2={width - padRight}
                  y2={getY(metricConfig.criticalThreshold)}
                  stroke="#8B949E"
                  strokeDasharray="2 3"
                  strokeWidth="1.2"
                />
              )}

              {/* Area Under Curve */}
              {areaPath && (
                <path d={areaPath} fill="url(#trendGradient)" />
              )}

              {/* Trend Polyline */}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke={metricConfig.strokeColor}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data Sample Dots */}
              {dataPoints.map((dp, i) => {
                const x = getX(i);
                const y = getY(metricConfig.getValue(dp));
                const isHovered = hoverIndex === i;

                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r={isHovered ? 4.5 : 2.5}
                    fill="#161B22"
                    stroke={metricConfig.strokeColor}
                    strokeWidth={isHovered ? 2 : 1.5}
                    className="transition-all"
                  />
                );
              })}

              {/* Interactive Hover Vertical Rule */}
              {hoverIndex !== null && dataPoints[hoverIndex] && (
                <line
                  x1={getX(hoverIndex)}
                  y1={padTop}
                  x2={getX(hoverIndex)}
                  y2={padTop + chartH}
                  stroke="#484F58"
                  strokeDasharray="2 2"
                  strokeWidth="1"
                />
              )}

              {/* X-Axis Baseline */}
              <line
                x1={padLeft}
                y1={padTop + chartH}
                x2={width - padRight}
                y2={padTop + chartH}
                stroke="#30363D"
                strokeWidth="1"
              />

              {/* X-Axis Time Ticks (Subtle timestamps) */}
              {dataPoints.length > 0 && (
                <>
                  <text
                    x={padLeft}
                    y={height - 8}
                    textAnchor="start"
                    fill="#8B949E"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {dataPoints[0].timeLabel}
                  </text>
                  {dataPoints.length > 2 && (
                    <text
                      x={padLeft + chartW / 2}
                      y={height - 8}
                      textAnchor="middle"
                      fill="#8B949E"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      {dataPoints[Math.floor(dataPoints.length / 2)].timeLabel}
                    </text>
                  )}
                  <text
                    x={width - padRight}
                    y={height - 8}
                    textAnchor="end"
                    fill="#8B949E"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {dataPoints[dataPoints.length - 1].timeLabel}
                  </text>
                </>
              )}

              {/* Invisible Overlay for Mouse Snapping */}
              {dataPoints.map((_, i) => {
                const colW = chartW / Math.max(1, dataPoints.length - 1);
                const xStart = i === 0 ? padLeft : getX(i) - colW / 2;
                const xEnd = i === dataPoints.length - 1 ? width - padRight : getX(i) + colW / 2;

                return (
                  <rect
                    key={i}
                    x={xStart}
                    y={padTop}
                    width={Math.max(10, xEnd - xStart)}
                    height={chartH}
                    fill="transparent"
                    onMouseEnter={() => setHoverIndex(i)}
                  />
                );
              })}
            </svg>

            {/* Hover Tooltip Overlay */}
            {activeHover && (
              <div className="mt-1 flex flex-wrap items-center justify-between gap-2 px-2 py-1.5 bg-[#161B22] border border-[#30363D] rounded text-[11px] font-mono text-slate-300">
                <div className="flex items-center gap-3">
                  <span className="text-white font-semibold">
                    Station: {activeHover.nodeId}
                  </span>
                  <span className="text-slate-400">
                    Recorded: {activeHover.timeLabel}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span>
                    Tilt: <strong className="text-white font-medium">{activeHover.tilt}°</strong>
                  </span>
                  <span>
                    Moisture: <strong className="text-white font-medium">{activeHover.moisture}%</strong>
                  </span>
                  <span>
                    Vibration: <strong className="text-slate-200 font-medium">{activeHover.vibration ? 'DETECTED' : 'NORMAL'}</strong>
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary Statistics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-[#21262D] text-xs font-mono">
        <div className="bg-[#0D1117] p-2 rounded border border-[#21262D]">
          <span className="text-[10px] text-slate-400 block uppercase">Current</span>
          <span className="text-sm font-semibold text-white">
            {latestVal.toFixed(1)}{metricConfig.unit}
          </span>
        </div>
        <div className="bg-[#0D1117] p-2 rounded border border-[#21262D]">
          <span className="text-[10px] text-slate-400 block uppercase">Peak</span>
          <span className="text-sm font-semibold text-slate-200">
            {peakVal.toFixed(1)}{metricConfig.unit}
          </span>
        </div>
        <div className="bg-[#0D1117] p-2 rounded border border-[#21262D]">
          <span className="text-[10px] text-slate-400 block uppercase">Min</span>
          <span className="text-sm font-semibold text-slate-300">
            {minObserved.toFixed(1)}{metricConfig.unit}
          </span>
        </div>
        <div className="bg-[#0D1117] p-2 rounded border border-[#21262D]">
          <span className="text-[10px] text-slate-400 block uppercase">Total Samples</span>
          <span className="text-sm font-semibold text-slate-300">
            {dataPoints.length} packet{dataPoints.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>
    </div>
  );
};
