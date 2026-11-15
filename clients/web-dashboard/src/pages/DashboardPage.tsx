import React, { useState } from 'react';
import { GisMap } from '../components/GisMap.tsx';
import { TelemetryHud } from '../components/TelemetryHud.tsx';
import { SirenModal } from '../components/SirenModal.tsx';
import { LocationModal } from '../components/LocationModal.tsx';
import { MountainSector, NodeTelemetry, SectorWeatherData, EmergencyAlert } from '../types/index.ts';
import { GeoLocation, calculateDistanceKm } from '../utils/geoUtils.ts';
import { getNodeProximity } from '../utils/proximityFilter.ts';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { Radio, Volume2, MapPin, ShieldAlert, Cpu, PlusCircle } from 'lucide-react';

interface DashboardPageProps {
  sectors: MountainSector[];
  telemetry: NodeTelemetry | null;
  nodes?: NodeTelemetry[];
  weather: SectorWeatherData | null;
  userLocation: GeoLocation | null;
  onUpdateLocation: (loc: GeoLocation) => void;
  onRefreshData: () => void;
  alerts?: EmergencyAlert[];
  onOpenReportModal?: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  sectors,
  telemetry,
  nodes = [],
  weather,
  userLocation,
  onUpdateLocation,
  onRefreshData,
  alerts = [],
  onOpenReportModal
}) => {
  const { user } = useAuth();
  const [isSirenModalOpen, setIsSirenModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isSyncingWeather, setIsSyncingWeather] = useState(false);
  const isAuthorizedFieldPersonnel = ['SCOUT', 'OPERATOR', 'ADMIN'].includes(user?.role || '');

  // 10 km Geofence Proximity Calculations (Strict numeric coercion)
  const userLat = Number(userLocation?.latitude) || 33.2422;
  const userLon = Number(userLocation?.longitude) || 75.2443;

  // Dynamic Nodes Proximity & Color Coding
  const nodeSummary = getNodeProximity(userLat, userLon, nodes, 10);

  // Determine active telemetry to display: closest node in 10 km, or nearest active station, or fallback
  const displayTelemetry: NodeTelemetry | null =
    nodeSummary.nodesInRadius.length > 0
      ? nodeSummary.nodesInRadius[0].node
      : (nodeSummary.nearestNode ? nodeSummary.nearestNode.node : telemetry);

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
  const activeCriticalAlert = localizedAlerts.find((a) => a.level === 'CRITICAL' || a.level === 'WARNING');

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
      
      {/* Location Status Banner with Dynamic 10 km Threat Color */}
      <div 
        className="p-3.5 rounded-none bg-[#161B22] border flex flex-wrap items-center justify-between gap-3 shadow-md transition-colors"
        style={{ borderColor: `${nodeSummary.threatColor}88` }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-1 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold">
              10 km Radar:
            </span>
            <span
              className="px-2 py-0.5 text-[11px] font-mono font-bold uppercase rounded-none border"
              style={{
                color: nodeSummary.threatColor,
                borderColor: `${nodeSummary.threatColor}66`,
                backgroundColor: `${nodeSummary.threatColor}15`
              }}
            >
              {nodeSummary.badgeText}
            </span>
          </div>

          <div className="text-xs text-slate-300 flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
            <span className="text-slate-400">Current Transit:</span>
            <span className="font-bold text-white font-mono">
              {userLocation?.cityName || 'Custom GPS'}
            </span>
            <span className="text-slate-400 font-mono text-[11px]">
              ({userLat.toFixed(2)}°N, {userLon.toFixed(2)}°E)
            </span>
            {nodeSummary.hasCoverage ? (
              <span className="text-emerald-400 font-mono text-[11px] font-semibold">
                • {nodeSummary.nodesInRadius.length} active node(s) in range
              </span>
            ) : (
              <span className="text-slate-400 font-mono text-[11px]">
                • Nearest station: <span className="text-slate-200 font-semibold">{nodeSummary.nearestNode?.node.nodeId || 'None'}</span> ({nodeSummary.nearestNode?.distanceKm || '--'} km away)
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenReportModal && isAuthorizedFieldPersonnel && (
            <button
              onClick={onOpenReportModal}
              className="px-3 py-1.5 rounded-none bg-amber-500 hover:bg-amber-400 text-black text-xs font-mono font-bold flex items-center gap-1.5 transition shrink-0 shadow-sm"
              title="Report Rockfall or Road Crack"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Report Hazard</span>
            </button>
          )}

          <button
            onClick={() => setIsLocationModalOpen(true)}
            className="px-3 py-1.5 rounded-none bg-[#21262D] hover:bg-[#30363D] text-amber-400 border border-[#30363D] hover:border-amber-400/50 text-xs font-mono font-bold flex items-center gap-1.5 transition shrink-0 shadow-sm"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Change Location</span>
          </button>
        </div>
      </div>

      {/* Local 10km Emergency Alert Notification Banner if active within 10 km */}
      {activeCriticalAlert && (
        <div className="p-4 bg-rose-950/40 border-2 border-rose-600/80 text-rose-200 flex items-start gap-3 shadow-2xl animate-pulse">
          <ShieldAlert className="w-6 h-6 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-white uppercase tracking-wider">
                🚨 Immediate Hazard Alert Inside Your 10 km Perimeter ({activeCriticalAlert.level})
              </h4>
              <span className="text-[11px] font-mono px-2 py-0.5 bg-rose-600 text-white font-bold">
                EVACUATE / HALT
              </span>
            </div>
            <p className="text-xs mt-1 text-rose-200 leading-relaxed font-sans">
              {activeCriticalAlert.multilingual?.hi || activeCriticalAlert.multilingual?.en || activeCriticalAlert.triggerCause}
            </p>
            <p className="text-[11px] font-mono text-rose-400 mt-1">
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
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Radio className="w-4 h-4 text-sky-400" />
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
          <div className="p-4 rounded-none bg-[#161B22] border border-[#30363D] shadow-lg">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wide">
                  Sensors in 10 km Zone
                </h4>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                Sorted by distance
              </span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              {nodeSummary.nodesInRadius.length > 0 ? (
                nodeSummary.nodesInRadius.map(({ node: n, distanceKm }) => {
                  const tilt = n.tiltMagnitude || 0;
                  const nodeStatus = tilt >= 4.0 ? 'CRITICAL' : tilt >= 2.0 ? 'WARNING' : 'NORMAL';
                  const badgeColor = nodeStatus === 'CRITICAL' ? 'bg-rose-600' : nodeStatus === 'WARNING' ? 'bg-amber-600' : 'bg-emerald-600';

                  return (
                    <div
                      key={n.nodeId}
                      className="p-2.5 bg-[#0D1117] border border-[#21262D] transition flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-white font-sans font-semibold">
                          Node: {n.nodeId}
                        </span>
                        <span className={`px-1.5 py-0.5 text-[10px] font-bold text-white ${badgeColor}`}>
                          {nodeStatus} ({tilt.toFixed(1)}°)
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Moisture: {n.soilMoisturePct}%</span>
                        <span className="text-amber-400 font-bold">
                          {distanceKm} km away
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-3 bg-[#0D1117] border border-[#21262D] text-slate-400 text-xs font-sans space-y-1">
                  <p className="font-semibold text-slate-300">
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
          <div className="p-4 rounded-none bg-[#161B22] border border-[#30363D] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Volume2 className="w-4 h-4 text-amber-400" />
                <span>Localized Advisory</span>
              </div>
              <span 
                className="text-[10px] font-mono px-1.5 py-0.5 border"
                style={{
                  color: nodeSummary.threatColor,
                  borderColor: `${nodeSummary.threatColor}66`,
                  backgroundColor: `${nodeSummary.threatColor}15`
                }}
              >
                {nodeSummary.threatLevel}
              </span>
            </div>

            <div className="space-y-2 text-xs max-h-56 overflow-y-auto custom-scrollbar pr-1">
              {nodeSummary.threatLevel === 'CRITICAL' ? (
                <>
                  <div className="p-2.5 bg-rose-950/30 border border-rose-800 text-rose-200">
                    <p className="font-bold text-[11px] font-mono text-rose-400">ENGLISH</p>
                    <p className="mt-0.5">🚨 Critical slope displacement detected within 10 km. Halt immediately and move to designated evacuation shelter.</p>
                  </div>
                  <div className="p-2.5 bg-rose-950/30 border border-rose-800 text-rose-200">
                    <p className="font-bold text-[11px] font-mono text-rose-400">HINDI</p>
                    <p className="mt-0.5">🚨 10 किमी के भीतर गंभीर भूस्खलन खतरा। तुरंत वाहन रोकें और सुरक्षित स्थान पर जाएं।</p>
                  </div>
                </>
              ) : nodeSummary.threatLevel === 'WARNING' ? (
                <>
                  <div className="p-2.5 bg-amber-950/30 border border-amber-800 text-amber-200">
                    <p className="font-bold text-[11px] font-mono text-amber-400">ENGLISH</p>
                    <p className="mt-0.5">⚠️ Caution: Active slope movement or elevated rainfall within 10 km. Drive with extreme caution.</p>
                  </div>
                  <div className="p-2.5 bg-amber-950/30 border border-amber-800 text-amber-200">
                    <p className="font-bold text-[11px] font-mono text-amber-400">HINDI</p>
                    <p className="mt-0.5">⚠️ सावधानी: 10 किमी के भीतर हल्का भूस्खलन या भारी बारिश दर्ज की गई है। सतर्क रहें।</p>
                  </div>
                </>
              ) : (
                <div className="p-2.5 bg-emerald-950/20 border border-emerald-800/40 text-emerald-200 font-sans">
                  <p className="font-bold text-[11px] font-mono text-emerald-400">STATUS: NORMAL</p>
                  <p className="mt-0.5 text-xs">
                    {nodeSummary.hasCoverage
                      ? 'All slope monitoring nodes within 10 km report stable terrain. Highway traffic running normally.'
                      : 'No active sensor nodes in this 10 km perimeter. Drive cautiously and observe highway markers.'}
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

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
