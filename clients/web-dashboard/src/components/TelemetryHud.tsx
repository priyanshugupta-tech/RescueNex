import React from 'react';
import { 
  Gauge, 
  Compass, 
  Droplets, 
  CloudRain, 
  Battery, 
  AlertOctagon, 
  Volume2, 
  CheckCircle2, 
  RefreshCw 
} from 'lucide-react';
import { NodeTelemetry, SectorWeatherData, MountainSector } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface TelemetryHudProps {
  telemetry: NodeTelemetry | null;
  weather: SectorWeatherData | null;
  sector: MountainSector | null;
  onOpenSirenModal: () => void;
  onTriggerWeatherSync: () => void;
  isWeatherSyncing: boolean;
}

export const TelemetryHud: React.FC<TelemetryHudProps> = ({
  telemetry,
  weather,
  sector,
  onOpenSirenModal,
  onTriggerWeatherSync,
  isWeatherSyncing
}) => {
  const { user } = useAuth();
  const rawScore = sector?.lsiScore ?? (sector as any)?.currentLsiScore;
  const lsiScore = rawScore != null 
    ? (rawScore <= 1.0 && rawScore > 0 ? Math.round(rawScore * 100) : Math.round(rawScore)) 
    : null;
  const riskLevel = sector?.currentRiskLevel ?? 'LOW';

  const getRiskBadge = () => {
    if (lsiScore === null) {
      return {
        bg: 'bg-[#21262D] text-slate-400 border border-[#30363D]',
        label: 'Awaiting Data'
      };
    }
    switch (riskLevel) {
      case 'CRITICAL':
        return {
          bg: 'bg-rose-500/10 text-rose-400 border border-rose-500/30 font-medium',
          label: 'Critical Hazard'
        };
      case 'WARNING':
        return {
          bg: 'bg-amber-500/10 text-amber-400 border border-amber-500/30 font-medium',
          label: 'Active Warning'
        };
      default:
        return {
          bg: 'bg-[#21262D] text-slate-300 border border-[#30363D] font-medium',
          label: 'Stable'
        };
    }
  };

  const badge = getRiskBadge();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      
      {/* 1. LSI Risk Score Card */}
      <div className="p-4 rounded-md bg-[#161B22] border border-[#30363D] flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-300 font-sans">Risk Score</span>
          </div>
          <span className={`px-2 py-0.5 rounded text-[11px] font-sans ${badge.bg}`}>
            {badge.label}
          </span>
        </div>

        <div className="my-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold font-mono text-white tracking-tight">
            {lsiScore !== null ? lsiScore : '--'}
          </span>
          <span className="text-sm font-mono text-slate-500">/ 100</span>
        </div>

        {/* Dynamic Progress bar */}
        <div className="w-full h-1.5 rounded bg-[#0D1117] border border-[#21262D] overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${
              (lsiScore ?? 0) >= 75 ? 'bg-rose-500' : (lsiScore ?? 0) >= 40 ? 'bg-amber-500' : 'bg-slate-400'
            }`}
            style={{ width: `${Math.min(lsiScore ?? 0, 100)}%` }}
          />
        </div>

        <p className="text-[11px] text-slate-400 mt-2 font-sans">
          Stability index calculated from live IMU sensors and rainfall rates.
        </p>
      </div>

      {/* 2. Bi-axial Tilt Meter Card */}
      <div className="p-4 rounded-md bg-[#161B22] border border-[#30363D] flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-300 font-sans">Slope Tilt</span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0D1117] border border-[#21262D] text-slate-400">
            {telemetry ? 'MPU-6050' : 'Standby'}
          </span>
        </div>

        <div className="my-3 flex items-baseline justify-between">
          <div>
            <span className="text-3xl font-extrabold font-mono text-white tracking-tight">
              {typeof telemetry?.tiltMagnitude === 'number' ? `${telemetry.tiltMagnitude.toFixed(1)}°` : '--'}
            </span>
            <span className="text-xs font-mono text-slate-400 ml-1.5">magnitude</span>
          </div>
          <div className="text-right text-[11px] font-mono text-slate-400 space-y-0.5">
            <p>X: {typeof telemetry?.tiltX === 'number' ? `${telemetry.tiltX.toFixed(1)}°` : '--'}</p>
            <p>Y: {typeof telemetry?.tiltY === 'number' ? `${telemetry.tiltY.toFixed(1)}°` : '--'}</p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[#21262D] pt-2 text-[11px]">
          <span className="text-slate-400">Deviation Δ:</span>
          <span className={`font-mono font-medium ${telemetry && (telemetry.tiltDelta || 0) > 1.0 ? 'text-rose-400 font-bold' : 'text-slate-200'}`}>
            {typeof telemetry?.tiltDelta === 'number' ? `${telemetry.tiltDelta >= 0 ? '+' : ''}${telemetry.tiltDelta.toFixed(2)}°` : '--'}
          </span>
        </div>
      </div>

      {/* 3. Soil Moisture & Saturation Card */}
      <div className="p-4 rounded-md bg-[#161B22] border border-[#30363D] flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-300 font-sans">Soil Moisture</span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0D1117] border border-[#21262D] text-slate-400">
            Volumetric %
          </span>
        </div>

        <div className="my-3 flex items-baseline justify-between">
          <span className="text-3xl font-extrabold font-mono text-white tracking-tight">
            {typeof telemetry?.soilMoisturePct === 'number' ? `${telemetry.soilMoisturePct.toFixed(1)}%` : '--'}
          </span>
          <span className="text-xs font-mono text-slate-400">
            Temp: {typeof telemetry?.temperatureC === 'number' ? `${telemetry.temperatureC.toFixed(1)}°C` : (typeof weather?.temperatureC === 'number' ? `${weather.temperatureC.toFixed(1)}°C` : '--')}
          </span>
        </div>

        <div className="flex items-center justify-between border-t border-[#21262D] pt-2 text-[11px]">
          <span className="text-slate-400">Vibration:</span>
          {telemetry ? (
            <span className={`font-mono text-xs flex items-center gap-1 ${
              telemetry.vibrationDetected ? 'text-rose-400 font-bold' : 'text-slate-300 font-medium'
            }`}>
              {telemetry.vibrationDetected ? (
                <>
                  <AlertOctagon className="w-3.5 h-3.5" />
                  VIBRATION DETECTED
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                  NORMAL
                </>
              )}
            </span>
          ) : (
            <span className="text-slate-500 font-mono text-[11px]">Standby</span>
          )}
        </div>
      </div>

      {/* 4. Live Rainfall & Siren Actions Card */}
      <div className="p-4 rounded-md bg-[#161B22] border border-[#30363D] flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CloudRain className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-300 font-sans">Rainfall</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0D1117] border border-[#21262D] text-slate-400">
              IMD Radar
            </span>
            <button 
              onClick={onTriggerWeatherSync}
              disabled={isWeatherSyncing}
              title="Sync weather"
              className="p-1 rounded bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-slate-400 hover:text-white transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isWeatherSyncing ? 'animate-spin text-slate-200' : ''}`} />
            </button>
          </div>
        </div>

        <div className="my-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold font-mono text-white">
              {typeof weather?.rain1hIntensityMm === 'number' ? `${weather.rain1hIntensityMm.toFixed(1)} mm/h` : '-- mm/h'}
            </span>
          </div>
          <p className="text-[11px] font-mono text-slate-400">
            24h Total: {typeof weather?.rain24hCumulativeMm === 'number' ? `${weather.rain24hCumulativeMm.toFixed(1)} mm` : '-- mm'}
          </p>
        </div>

        {/* Relative Humidity */}
        <div className="mt-2.5 pt-2 border-t border-[#21262D] flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400">Relative Humidity:</span>
          <span className="text-slate-200 font-medium">
            {typeof weather?.relativeHumidityPct === 'number' ? `${weather.relativeHumidityPct}%` : '--'}
          </span>
        </div>
      </div>

    </div>
  );
};
