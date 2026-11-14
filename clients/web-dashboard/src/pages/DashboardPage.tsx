import React, { useState } from 'react';
import { GisMap } from '../components/GisMap.tsx';
import { TelemetryHud } from '../components/TelemetryHud.tsx';
import { SirenModal } from '../components/SirenModal.tsx';
import { MountainSector, NodeTelemetry, SectorWeatherData } from '../types/index.ts';
import { api } from '../services/api.ts';
import { CloudSun, CloudRain, Zap, Radio, Volume2 } from 'lucide-react';

interface DashboardPageProps {
  sectors: MountainSector[];
  telemetry: NodeTelemetry | null;
  weather: SectorWeatherData | null;
  liveGps: { lat: number | null; lon: number | null; fix: boolean };
  onRefreshData: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  sectors,
  telemetry,
  weather,
  liveGps,
  onRefreshData
}) => {
  const [isSirenModalOpen, setIsSirenModalOpen] = useState(false);
  const [isSyncingWeather, setIsSyncingWeather] = useState(false);
  const [scenarioSuccess, setScenarioSuccess] = useState('');

  const activeSector = sectors.find(s => s.id === 'SECTOR_RAMBAN') || sectors[0] || null;

  const handleWeatherSync = async () => {
    setIsSyncingWeather(true);
    try {
      await api.post('/api/weather/sync');
      onRefreshData();
    } catch (e) {
      console.error('Weather sync failed', e);
    } finally {
      setIsSyncingWeather(false);
    }
  };

  const handleApplyScenario = async (scenario: 'LIVE' | 'CLEAR' | 'MONSOON' | 'CLOUDBURST') => {
    try {
      await api.post('/api/weather/scenario', {
        sectorId: activeSector?.id || 'SECTOR_RAMBAN',
        scenario
      });
      setScenarioSuccess(`Active scenario set to: ${scenario}`);
      setTimeout(() => setScenarioSuccess(''), 3000);
      onRefreshData();
    } catch (e) {
      console.error('Failed to set scenario', e);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Section: Real-time Telemetry HUD */}
      <TelemetryHud
        telemetry={telemetry}
        weather={weather}
        sector={activeSector}
        onOpenSirenModal={() => setIsSirenModalOpen(true)}
        onTriggerWeatherSync={handleWeatherSync}
        isWeatherSyncing={isSyncingWeather}
      />

      {/* Weather Scenario Preset Switcher */}
      <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <CloudSun className="w-4 h-4 text-amber-400" />
          <span className="font-semibold text-slate-300 font-sans">
            Weather Simulation & Live Sync:
          </span>
          {scenarioSuccess && (
            <span className="font-mono text-emerald-400 text-[11px] animate-pulse">
              ✓ {scenarioSuccess}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 font-mono">
          <button
            onClick={() => handleApplyScenario('LIVE')}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            Live Open-Meteo
          </button>
          <button
            onClick={() => handleApplyScenario('CLEAR')}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            Clear Skies
          </button>
          <button
            onClick={() => handleApplyScenario('MONSOON')}
            className="px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition flex items-center gap-1"
          >
            <CloudRain className="w-3.5 h-3.5" />
            Monsoon (Heavy)
          </button>
          <button
            onClick={() => handleApplyScenario('CLOUDBURST')}
            className="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition flex items-center gap-1"
          >
            <Zap className="w-3.5 h-3.5" />
            Cloudburst (Extreme)
          </button>
        </div>
      </div>

      {/* Main Grid: Interactive GIS Map & Multilingual Audio Broadcast */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Leaflet GIS Terrain Map */}
        <div className="lg:col-span-2 space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Radio className="w-4 h-4 text-sky-400" />
              <span>Spatial Corridor GIS Map</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {sectors.length > 0 ? `${sectors.length} Monitored Sectors` : 'Connecting Sectors...'}
            </span>
          </div>

          <GisMap
            sectors={sectors}
            telemetry={telemetry}
            liveGps={liveGps}
          />
        </div>

        {/* Right Col: Vernacular Emergency Advisory & Sector Status */}
        <div className="space-y-4 flex flex-col justify-between">
          
          {/* Vernacular Broadcast Box */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Volume2 className="w-4 h-4 text-amber-400" />
                <span>Multilingual Public Broadcast</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                SDMA Advisory
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">English</span>
                <p className="text-slate-300 mt-0.5 leading-relaxed">
                  "NH-44 Corridor Alert: Slope movement observed near Ramban. Maintain safe speed and avoid rockfall prone zones."
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">हिंदी</span>
                <p className="text-slate-300 mt-0.5 leading-relaxed font-sans">
                  "राष्ट्रीय राजमार्ग 44 चेतावनी: रामबन के पास भूस्खलन का खतरा। कृपया सुरक्षित गति में वाहन चलाएं।"
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">ڈوگری / Dogri</span>
                <p className="text-slate-300 mt-0.5 leading-relaxed font-sans">
                  "रामबन दे कोल मट्टी खिसकने दा खतरा ऐ। होशियार रवो ते सुरक्षित ठार चलो।"
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">कॉशुर / Kashmiri</span>
                <p className="text-slate-300 mt-0.5 leading-relaxed font-sans">
                  "हाईवे 44 प्यठ रामबन नज़दीक पथर प्यनुक खतरा। मेहरबानी करित होशियारी सां पकिव।"
                </p>
              </div>
            </div>
          </div>

          {/* Quick Sector Health Matrix */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
            <h4 className="text-xs font-bold text-slate-300 mb-2 uppercase tracking-wide">
              Key Mountain Sectors Status
            </h4>
            <div className="space-y-2 text-xs font-mono">
              {sectors.slice(0, 4).map((sec) => (
                <div key={sec.id} className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800/60">
                  <span className="text-slate-300 font-sans">{sec.name.split(' ')[0]}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    sec.currentRiskLevel === 'CRITICAL'
                      ? 'bg-rose-500/20 text-rose-400'
                      : sec.currentRiskLevel === 'WARNING'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {sec.currentRiskLevel} ({sec.lsiScore})
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Emergency Siren Safety Modal */}
      <SirenModal
        isOpen={isSirenModalOpen}
        onClose={() => setIsSirenModalOpen(false)}
        sectorId={activeSector?.id || 'SECTOR_RAMBAN'}
        isSirenActive={activeSector?.sirenActive || false}
        onSuccess={onRefreshData}
      />

    </div>
  );
};
