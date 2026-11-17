import React, { useState } from 'react';
import { GisMap } from '../components/GisMap.tsx';
import { TelemetryHud } from '../components/TelemetryHud.tsx';
import { TelemetryTrendChart } from '../components/TelemetryTrendChart.tsx';
import { SirenModal } from '../components/SirenModal.tsx';
import { LocationModal } from '../components/LocationModal.tsx';
import { MountainSector, NodeTelemetry, SectorWeatherData, EmergencyAlert } from '../types/index.ts';
import { GeoLocation, calculateDistanceKm } from '../utils/geoUtils.ts';
import { getNodeProximity } from '../utils/proximityFilter.ts';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { Radio, Volume2, MapPin, Cpu } from 'lucide-react';

interface DashboardPageProps {
  sectors: MountainSector[];
  telemetry: NodeTelemetry | null;
  nodes?: NodeTelemetry[];
  weather: SectorWeatherData | null;
  userLocation: GeoLocation | null;
  onUpdateLocation: (loc: GeoLocation) => void;
  onRefreshData: () => void;
  alerts?: EmergencyAlert[];
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  sectors,
  telemetry,
  nodes = [],
  weather,
  userLocation,
  onUpdateLocation,
  onRefreshData,
  alerts = []
}) => {
  const { user } = useAuth();
  const [isSirenModalOpen, setIsSirenModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isSyncingWeather, setIsSyncingWeather] = useState(false);

  // 10 km Geofence Proximity Calculations (Strict numeric coercion)
  const userLat = Number(userLocation?.latitude) || 33.2422;
  const userLon = Number(userLocation?.longitude) || 75.2443;

  // Dynamic Nodes Proximity & Color Coding
  const nodeSummary = getNodeProximity(userLat, userLon, nodes, 10);

  // Determine active telemetry to display: ONLY show sensor metrics if there is an active node within the user's 10 km perimeter
  const displayTelemetry: NodeTelemetry | null =
    nodeSummary.nodesInRadius.length > 0
      ? nodeSummary.nodesInRadius[0].node
      : null;

  // Calculate distances to all sectors
  const sectorsWithDistance = sectors.map((sec) => {
    const distKm = calculateDistanceKm(userLat, userLon, sec.latitude, sec.longitude);
    return {
      ...sec,
      distanceKm: distKm,
      isWithin10Km: distKm <= 10.0
    };
  }).sort((a, b) => a.distanceKm - b.distanceKm);

  const closestSector = sectorsWithDistance[0] || null;
  const sectorsWithin10Km = sectorsWithDistance.filter((s) => s.isWithin10Km);

  // Filter alerts: ONLY alerts for sectors within the 10km perimeter
  const sectorIdsIn10Km = new Set(sectorsWithin10Km.map((s) => s.id));
  const localizedAlerts = alerts.filter((a) => sectorIdsIn10Km.has(a.sectorId));
  // Strictly 10 km localized critical alerts only
  const activeCriticalAlert = localizedAlerts.find(
    (a) =>
      (a as any).level === 'CRITICAL' ||
      (a as any).riskLevel === 'CRITICAL' ||
      (a as any).level === 'WARNING' ||
      (a as any).riskLevel === 'WARNING'
  );

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

  return (
    <div className="space-y-6">
      
      {/* Location Status Banner */}
      <div className="p-3.5 rounded-md bg-[#161B22] border border-[#30363D] flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-1 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
              10 km Radar:
            </span>
            <span className="px-2.5 py-1 text-xs font-mono rounded bg-[#21262D] text-slate-200 border border-[#30363D]">
              {nodeSummary.badgeText}
            </span>
          </div>

          <div className="text-xs text-slate-300 flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
            <span className="text-slate-400">Current Transit:</span>
            <span className="font-semibold text-white font-mono">
              {userLocation?.cityName || 'Custom GPS'}
            </span>
            <span className="text-slate-400 font-mono text-[11px]">
              ({userLat.toFixed(2)}°N, {userLon.toFixed(2)}°E)
            </span>
            {nodeSummary.hasCoverage ? (
              <span className="text-slate-400 font-mono text-[11px]">
                • <span className="text-slate-200 font-medium">{nodeSummary.nodesInRadius.length}</span> active node(s) in range
              </span>
            ) : (
              <span className="text-slate-400 font-mono text-[11px]">
                • Nearest station: <span className="text-slate-200 font-semibold">{nodeSummary.nearestNode?.node.nodeId || 'None'}</span> ({nodeSummary.nearestNode?.distanceKm || '--'} km away)
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLocationModalOpen(true)}
            className="px-3 py-1.5 rounded bg-[#21262D] hover:bg-[#30363D] text-slate-200 hover:text-white border border-[#30363D] text-xs font-medium flex items-center gap-1.5 transition shrink-0 shadow-sm"
          >
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span>Change Location</span>
          </button>
        </div>
      </div>

      {/* Local 10km Emergency Alert Notification Banner if active within 10 km */}
      {activeCriticalAlert && (
        <div className="p-4 bg-[#161B22] border-l-4 border-l-slate-400 border-y border-r border-[#30363D] text-slate-200 flex items-start gap-3 shadow-md rounded-md">
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm text-white tracking-wide">
                Immediate Hazard Alert Inside 10 km Perimeter ({activeCriticalAlert.level})
              </h4>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#21262D] text-slate-300 border border-[#30363D] font-medium">
                Evacuate / Halt
              </span>
            </div>
            <div className="space-y-1 mt-1 text-xs text-slate-300 leading-relaxed font-sans">
              <p>{activeCriticalAlert.multilingual?.en || activeCriticalAlert.triggerCause}</p>
              {activeCriticalAlert.multilingual?.hi && (
                <p className="text-slate-400 font-sans"><span className="text-[10px] font-mono font-semibold text-slate-500 uppercase">हिंदी:</span> {activeCriticalAlert.multilingual.hi}</p>
              )}
              {activeCriticalAlert.multilingual?.dogri && (
                <p className="text-slate-400 font-sans"><span className="text-[10px] font-mono font-semibold text-slate-500 uppercase">डोगरी:</span> {activeCriticalAlert.multilingual.dogri}</p>
              )}
            </div>
            <p className="text-[11px] font-mono text-slate-400 mt-1">
              Sector: {activeCriticalAlert.sectorName} • Status: {activeCriticalAlert.status}
            </p>
          </div>
        </div>
      )}

      {/* Top Section: Real-time Telemetry HUD for closest slope node */}
      <TelemetryHud
        telemetry={displayTelemetry}
        weather={weather}
        sector={closestSector}
        onOpenSirenModal={() => setIsSirenModalOpen(true)}
        onTriggerWeatherSync={handleWeatherSync}
        isWeatherSyncing={isSyncingWeather}
      />

      {/* Main Grid: Interactive GIS Map & Localized Proximity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Leaflet GIS Terrain Map with 10km Dynamic Threat Radar */}
        <div className="lg:col-span-2 space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
              <Radio className="w-4 h-4 text-slate-400" />
              <span>Spatial Corridor Radar (10 km Dynamic Perimeter Active)</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {nodeSummary.nodesInRadius.length} Physical Nodes inside 10 km
            </span>
          </div>

          <GisMap
            sectors={sectors}
            telemetry={displayTelemetry}
            nodes={nodes}
            userLocation={userLocation}
            radiusKm={10}
            threatColor={nodeSummary.threatColor}
            threatLevel={nodeSummary.threatLevel}
          />
        </div>

        {/* Right Col: Localized 10 km Threat Matrix & Multilingual Advisory */}
        <div className="space-y-4 flex flex-col justify-start">
          
          {/* Proximity Warning Matrix (Sensors within 10 km) */}
          <div className="p-4 rounded-md bg-[#161B22] border border-[#30363D] shadow-sm">
            <div className="flex items-center justify-between mb-3 border-b border-[#21262D] pb-2">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-slate-400" />
                <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wide">
                  Sensors in 10 km Zone
                </h4>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                Sorted by distance
              </span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              {nodeSummary.nodesInRadius.length > 0 ? (
                <>
                  {nodeSummary.nodesInRadius.slice(0, 3).map(({ node: n, distanceKm }) => {
                    const tilt = n.tiltMagnitude || 0;
                    const nodeStatus = tilt >= 4.0 ? 'Critical' : tilt >= 2.0 ? 'Warning' : 'Normal';
                    const badgeStyle = 'bg-[#21262D] text-slate-300 border-[#30363D]';

                    return (
                      <div
                        key={n.nodeId}
                        className="p-2.5 bg-[#0D1117] border border-[#21262D] rounded transition flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-slate-200 font-sans font-medium">
                            Node: {n.nodeId}
                          </span>
                          <span className={`px-2 py-0.5 text-[10px] font-mono rounded border ${badgeStyle}`}>
                            {nodeStatus} ({tilt.toFixed(1)}°)
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-sans">
                          <span>Moisture: {n.soilMoisturePct}%</span>
                          <span className="text-slate-300 font-mono">
                            {distanceKm} km away
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {nodeSummary.nodesInRadius.length > 3 && (
                    <div className="p-2 bg-[#0D1117] border border-[#21262D] rounded text-center text-[11px] text-slate-400 font-mono">
                      + {nodeSummary.nodesInRadius.length - 3} additional sensor node(s) monitored in corridor
                    </div>
                  )}
                </>
              ) : (
                <div className="p-3 bg-[#0D1117] border border-[#21262D] rounded text-slate-400 text-xs font-sans space-y-1">
                  <p className="font-medium text-slate-300">
                    No active sensor nodes deployed within 10 km of this location.
                  </p>
                  {nodeSummary.nearestNode && (
                    <p className="text-[11px] text-slate-400 font-mono">
                      Nearest active station: {nodeSummary.nearestNode.node.nodeId} ({nodeSummary.nearestNode.distanceKm} km away).
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Multilingual Corridor Advisory Box */}
          <div className="p-4 rounded-md bg-[#161B22] border border-[#30363D] space-y-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#21262D] pb-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <Volume2 className="w-4 h-4 text-slate-400" />
                <span>Localized Advisory</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#21262D] text-slate-300 border border-[#30363D]">
                {nodeSummary.threatLevel}
              </span>
            </div>

            <div className="space-y-2 text-xs max-h-72 overflow-y-auto custom-scrollbar pr-1">
              {nodeSummary.threatLevel === 'CRITICAL' ? (
                <>
                  <div className="p-3 bg-[#0D1117] border border-[#21262D] rounded text-slate-300 space-y-1">
                    <p className="font-semibold text-[10px] font-mono uppercase tracking-wider text-slate-400">English Advisory</p>
                    <p className="text-xs text-slate-200 leading-relaxed font-sans">Critical slope displacement detected within 10 km. Halt immediately and move to designated evacuation shelter.</p>
                  </div>
                  <div className="p-3 bg-[#0D1117] border border-[#21262D] rounded text-slate-300 space-y-1">
                    <p className="font-semibold text-[10px] font-mono uppercase tracking-wider text-slate-400">Hindi Advisory (हिंदी)</p>
                    <p className="text-xs text-slate-200 leading-relaxed font-sans">10 किमी के भीतर गंभीर भूस्खलन खतरा। तुरंत वाहन रोकें और सुरक्षित स्थान पर जाएं।</p>
                  </div>
                  <div className="p-3 bg-[#0D1117] border border-[#21262D] rounded text-slate-300 space-y-1">
                    <p className="font-semibold text-[10px] font-mono uppercase tracking-wider text-slate-400">Dogri Advisory (डोगरी)</p>
                    <p className="text-xs text-slate-200 leading-relaxed font-sans">10 किमी दे अंदर भारी ज़मीन खिसकने दा गंभीर ख़तरा। गड्डियां तुरंत रोको ते सुरक्षित जगह पर जाह्ओ।</p>
                  </div>
                </>
              ) : nodeSummary.threatLevel === 'WARNING' ? (
                <>
                  <div className="p-3 bg-[#0D1117] border border-[#21262D] rounded text-slate-300 space-y-1">
                    <p className="font-semibold text-[10px] font-mono uppercase tracking-wider text-slate-400">English Advisory</p>
                    <p className="text-xs text-slate-200 leading-relaxed font-sans">Caution: Active slope movement or elevated rainfall within 10 km. Drive with extreme caution.</p>
                  </div>
                  <div className="p-3 bg-[#0D1117] border border-[#21262D] rounded text-slate-300 space-y-1">
                    <p className="font-semibold text-[10px] font-mono uppercase tracking-wider text-slate-400">Hindi Advisory (हिंदी)</p>
                    <p className="text-xs text-slate-200 leading-relaxed font-sans">सावधानी: 10 किमी के भीतर हल्का भूस्खलन या भारी बारिश दर्ज की गई है। सतर्क रहें।</p>
                  </div>
                  <div className="p-3 bg-[#0D1117] border border-[#21262D] rounded text-slate-300 space-y-1">
                    <p className="font-semibold text-[10px] font-mono uppercase tracking-wider text-slate-400">Dogri Advisory (डोगरी)</p>
                    <p className="text-xs text-slate-200 leading-relaxed font-sans">चौकसी: 10 किमी दे दायरे च ज़मीन खिसकने जां भारी बारिश दा ख़तरा ऐ। गड्डी बड़ी एहतियात कन्नै चलाओ।</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 bg-[#0D1117] border border-[#21262D] rounded text-slate-300 space-y-1">
                    <p className="font-semibold text-[10px] font-mono uppercase tracking-wider text-slate-400">Status: Normal (English)</p>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      {nodeSummary.hasCoverage
                        ? 'All slope monitoring nodes within 10 km report stable terrain. Highway traffic running normally.'
                        : 'No active sensor nodes in this 10 km perimeter. Drive cautiously and observe highway markers.'}
                    </p>
                  </div>
                  <div className="p-3 bg-[#0D1117] border border-[#21262D] rounded text-slate-300 space-y-1">
                    <p className="font-semibold text-[10px] font-mono uppercase tracking-wider text-slate-400">Dogri Advisory (डोगरी)</p>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      हालात सामान्य: 10 किमी दे दायरे च सारा इलाका ठीक-ठाक ऐ। हाईवे पर गाड़ियां आराम कन्नै चलदियां पइयां न।
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Geotechnical Telemetry Trends (Strictly localized to 10 km corridor) */}
      <TelemetryTrendChart
        userLocation={userLocation}
        latestTelemetry={displayTelemetry}
        radiusKm={10}
      />

      {/* Acoustic Siren Modal */}
      <SirenModal
        isOpen={isSirenModalOpen}
        onClose={() => setIsSirenModalOpen(false)}
        sectorId={closestSector?.id || 'SECTOR_RAMBAN'}
        isSirenActive={closestSector?.sirenActive || false}
        onSuccess={onRefreshData}
      />

      {/* Dynamic Location Geofence Selector Modal */}
      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onLocationSelect={onUpdateLocation}
        currentLocation={userLocation}
      />

    </div>
  );
};
