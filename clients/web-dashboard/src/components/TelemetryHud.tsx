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
  const lsiScore = sector?.lsiScore ?? null;
  const riskLevel = sector?.currentRiskLevel ?? 'LOW';

  const getRiskBadge = () => {
    if (lsiScore === null) {
      return {
        bg: 'bg-slate-800 border-slate-700 text-slate-400',
        dot: 'bg-slate-500',
        label: 'AWAITING SECTOR DATA'
      };
    }
    switch (riskLevel) {
      case 'CRITICAL':
        return {
          bg: 'bg-gradient-to-b from-rose-600 via-rose-600 to-rose-700 text-white font-bold border-t border-rose-300/80 border-b border-rose-950 shadow-md ring-1 ring-rose-400/50',
          dot: 'bg-white',
          label: 'CRITICAL FAILURE RISK'
        };
      case 'WARNING':
        return {
          bg: 'bg-gradient-to-b from-amber-600 via-amber-600 to-amber-700 text-white font-bold border-t border-amber-300/80 border-b border-amber-950 shadow-md ring-1 ring-amber-400/50',
          dot: 'bg-white',
          label: 'ACTIVE WARNING'
        };
      default:
        return {
          bg: 'bg-gradient-to-b from-emerald-600 via-emerald-600 to-emerald-700 text-white font-bold border-t border-emerald-300/80 border-b border-emerald-950 shadow-md ring-1 ring-emerald-400/50',
          dot: 'bg-white',
          label: 'STABLE CORRIDOR'
        };
    }
  };

  const badge = getRiskBadge();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      
      {/* 1. LSI Risk Score Card */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold text-slate-300 font-sans">LSI Risk Index</span>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${badge.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot} animate-pulse`}></span>
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
        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${
              (lsiScore ?? 0) >= 75 ? 'bg-rose-500' : (lsiScore ?? 0) >= 40 ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(lsiScore ?? 0, 100)}%` }}
          />
        </div>

        <p className="text-[11px] text-slate-400 mt-2 font-sans">
          Dynamic ML stability index calculated from live IMU telemetry & meteorological feeds.
        </p>
      </div>

      {/* 2. Bi-axial Tilt Meter Card */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-semibold text-slate-300 font-sans">Slope Tilt (IMU)</span>
          </div>
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
            telemetry 
              ? 'bg-slate-800 text-slate-300 border-slate-700' 
              : 'bg-amber-500/10 text-amber-400/90 border-amber-500/30'
          }`}>
            {telemetry ? 'MPU-6050 ACTIVE' : 'NODE STANDBY'}
          </span>
        </div>

        <div className="my-3 flex items-baseline justify-between">
          <div>
            <span className="text-3xl font-extrabold font-mono text-white tracking-tight">
              {telemetry ? `${telemetry.tiltMagnitude.toFixed(1)}°` : '--'}
            </span>
            <span className="text-xs font-mono text-slate-400 ml-1.5">magnitude</span>
          </div>
          <div className="text-right text-[11px] font-mono text-slate-400 space-y-0.5">
            <p>X: {telemetry ? `${telemetry.tiltX.toFixed(1)}°` : '--'}</p>
            <p>Y: {telemetry ? `${telemetry.tiltY.toFixed(1)}°` : '--'}</p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-800/80 pt-2 text-[11px]">
          <span className="text-slate-400">Deviation Δ:</span>
          <span className={`font-mono font-bold ${telemetry && telemetry.tiltDelta > 1.0 ? 'text-rose-400' : 'text-slate-200'}`}>
            {telemetry ? `${telemetry.tiltDelta >= 0 ? '+' : ''}${telemetry.tiltDelta.toFixed(2)}°` : '--'}
          </span>
        </div>
      </div>

      {/* 3. Soil Moisture & Saturation Card */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-semibold text-slate-300 font-sans">Soil Saturation</span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            Volumetric %
          </span>
        </div>

        <div className="my-3 flex items-baseline justify-between">
          <span className="text-3xl font-extrabold font-mono text-white tracking-tight">
            {telemetry ? `${telemetry.soilMoisturePct.toFixed(1)}%` : '--'}
          </span>
          <span className="text-xs font-mono text-slate-400">
            Temp: {telemetry ? `${telemetry.temperatureC.toFixed(1)}°C` : (weather ? `${weather.temperatureC.toFixed(1)}°C` : '--')}
          </span>
        </div>

        <div className="flex items-center justify-between border-t border-slate-800/80 pt-2 text-[11px]">
          <span className="text-slate-400">Ground Vibration:</span>
          {telemetry ? (
            <span className={`font-mono font-semibold flex items-center gap-1 ${
              telemetry.vibrationDetected ? 'text-rose-400 font-bold' : 'text-emerald-400'
            }`}>
              {telemetry.vibrationDetected ? (
                <>
                  <AlertOctagon className="w-3 h-3" />
                  VIBRATION DETECTED
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3" />
                  NORMAL
                </>
              )}
            </span>
          ) : (
            <span className="text-slate-500 font-mono text-[11px]">AWAITING SENSOR</span>
          )}
        </div>
      </div>

      {/* 4. Live Rainfall & Siren Actions Card */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CloudRain className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-semibold text-slate-300 font-sans">Open-Meteo Weather</span>
          </div>
          <button 
            onClick={onTriggerWeatherSync}
            disabled={isWeatherSyncing}
            title="Sync live weather with Open-Meteo"
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isWeatherSyncing ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>

        <div className="my-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold font-mono text-white">
              {weather ? `${weather.rain1hIntensityMm.toFixed(1)} mm/h` : '-- mm/h'}
            </span>
          </div>
          <p className="text-[11px] font-mono text-slate-400">
            24h Total: {weather ? `${weather.rain24hCumulativeMm.toFixed(1)} mm` : '-- mm'}
          </p>
        </div>

        {/* Emergency Siren Trigger Button - Opaque Lustrous Finish with Crisp White Text */}
        <button
          onClick={onOpenSirenModal}
          className="mt-2 w-full py-2 px-3 rounded-lg bg-gradient-to-b from-rose-600 via-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-650 text-white font-bold border-t border-rose-300/80 border-b border-rose-950 flex items-center justify-center gap-2 text-xs shadow-lg shadow-black/40 ring-1 ring-rose-400/50 transition-all active:scale-[0.98]"
        >
          <Volume2 className="w-3.5 h-3.5 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]" />
          <span className="text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] tracking-wide">Siren Emergency Interlock</span>
        </button>
      </div>

    </div>
  );
};
