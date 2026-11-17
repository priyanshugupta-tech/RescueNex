import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MountainSector, NodeTelemetry } from '../types/index.ts';
import { GeoLocation } from '../utils/geoUtils.ts';

// Fix Leaflet default marker icons in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom IoT Node Pin with dynamic risk color
const createNodeIcon = (risk: 'SAFE' | 'WARNING' | 'CRITICAL', nodeId: string) => {
  const dotColor = risk === 'CRITICAL' ? 'bg-rose-500' : risk === 'WARNING' ? 'bg-amber-500' : 'bg-emerald-500';
  return L.divIcon({
    className: 'custom-node-pin',
    html: `
      <div class="relative flex items-center justify-center">
        <div class="w-4 h-4 rounded-full ${dotColor} border-2 border-white shadow"></div>
        <div class="absolute -top-6 px-1.5 py-0.5 rounded bg-[#161B22] text-[9px] font-mono text-slate-200 font-medium border border-[#30363D] whitespace-nowrap shadow-md">
          📡 ${nodeId}
        </div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

// Custom User Location Pin with dynamic color matching 10 km threat status
const createUserPinIcon = (isGPS: boolean, threatColor: string = '#10B981') =>
  L.divIcon({
    className: 'custom-user-pin',
    html: `
      <div class="relative flex items-center justify-center">
        <div class="w-5 h-5 rounded-full border-2 border-white shadow-xl flex items-center justify-center" style="background-color: ${threatColor};">
          <div class="w-2 h-2 rounded-full bg-slate-950"></div>
        </div>
        <div class="absolute -top-7 px-2 py-0.5 rounded text-slate-950 text-[10px] font-mono font-extrabold uppercase border shadow whitespace-nowrap font-sans font-bold" style="background-color: ${threatColor}; border-color: ${threatColor};">
          📍 ${isGPS ? 'YOU (GPS)' : 'YOU'}
        </div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

interface MapRecenterProps {
  center: [number, number];
}

const MapRecenter: React.FC<MapRecenterProps> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 12, { duration: 1.2 });
  }, [center, map]);
  return null;
};

interface GisMapProps {
  sectors: MountainSector[];
  telemetry: NodeTelemetry | null;
  nodes?: NodeTelemetry[];
  userLocation: GeoLocation | null;
  radiusKm?: number;
  threatColor?: string;
  threatLevel?: string;
}

export const GisMap: React.FC<GisMapProps> = ({
  sectors,
  telemetry,
  nodes = [],
  userLocation,
  radiusKm = 10,
  threatColor = '#10B981',
  threatLevel = 'SAFE'
}) => {
  // Strategic Mountain Transit Corridor Line (Himalayan Stretch)
  const transitCorridor: [number, number][] = [
    [32.9250, 75.1400], // Udhampur Portal
    [33.0911, 75.3283], // Patnitop / Nashri
    [33.1600, 75.3200], // Batote
    [33.2422, 75.2443], // Ramban / Chanderkote
    [33.4975, 75.2014], // Banihal Tunnel
    [34.0837, 74.7973]  // Srinagar Terminal
  ];

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'CRITICAL': return '#EF4444';
      case 'WARNING': return '#F59E0B';
      case 'LOW': return '#38BDF8';
      default: return '#10B981';
    }
  };

  // Center on user location if set, else on primary Ramban corridor
  const centerLat = userLocation?.latitude || 33.2422;
  const centerLon = userLocation?.longitude || 75.2443;

  // Active nodes list: either passed array or single telemetry
  const displayNodes = nodes.length > 0 ? nodes : (telemetry ? [telemetry] : []);

  return (
    <div className="relative w-full h-[540px] rounded-none overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
      <MapContainer
        center={[centerLat, centerLon]}
        zoom={11}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
      >
        <MapRecenter center={[centerLat, centerLon]} />

        {/* 100% Free OpenStreetMap Basemap Layer (No API Key Required) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* Mountain Highway Transit Corridor Line */}
        <Polyline
          positions={transitCorridor}
          pathOptions={{ color: '#F59E0B', weight: 3.5, opacity: 0.7, dashArray: '6, 8' }}
        />

        {/* 10 KM User Geofence Radar Circle with Dynamic Threat Color */}
        {userLocation && typeof userLocation.latitude === 'number' && typeof userLocation.longitude === 'number' && !isNaN(userLocation.latitude) && !isNaN(userLocation.longitude) && (
          <>
            <Circle
              center={[userLocation.latitude, userLocation.longitude]}
              radius={radiusKm * 1000} // in meters
              pathOptions={{
                color: threatColor,
                fillColor: threatColor,
                fillOpacity: 0.10,
                weight: 2,
                dashArray: '5, 5'
              }}
            >
              <Popup>
                <div className="p-1 font-sans text-xs">
                  <p className="font-bold" style={{ color: threatColor }}>
                    Your 10 km Area ({threatLevel})
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Live dynamic risk radar. Green = Normal, Yellow = Warning, Red = Critical Hazard.
                  </p>
                </div>
              </Popup>
            </Circle>

            <Marker
              position={[userLocation.latitude, userLocation.longitude]}
              icon={createUserPinIcon(userLocation.source === 'GPS', threatColor)}
            >
              <Popup>
                <div className="p-1.5 font-sans text-xs">
                  <p className="font-bold text-slate-900">
                    {userLocation.cityName || 'Selected Transit Location'}
                  </p>
                  <p className="text-[11px] text-slate-600 font-mono">
                    {userLocation.latitude.toFixed(4)}° N, {userLocation.longitude.toFixed(4)}° E
                  </p>
                  <p className="text-[10px] font-bold mt-1" style={{ color: threatColor }}>
                    Status: {threatLevel} (10 km Radius Active)
                  </p>
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {/* Mountain Sector Radii */}
        {sectors.map((sec) => (
          <Circle
            key={sec.id}
            center={[sec.latitude, sec.longitude]}
            radius={2500}
            pathOptions={{
              color: getRiskColor(sec.currentRiskLevel),
              fillColor: getRiskColor(sec.currentRiskLevel),
              fillOpacity: 0.18,
              weight: 1.5
            }}
          >
            <Popup>
              <div className="p-1 font-sans text-xs">
                <p className="font-bold text-slate-900">{sec.name}</p>
                <p className="text-[11px] text-slate-600 font-mono">
                  {sec.highway} • {sec.kmMarker}
                </p>
                <div className="mt-1 flex items-center justify-between font-mono text-[11px]">
                  <span>LSI Risk:</span>
                  <span className="font-bold" style={{ color: getRiskColor(sec.currentRiskLevel) }}>
                    {sec.currentRiskLevel} ({sec.lsiScore})
                  </span>
                </div>
                {sec.sirenActive && (
                  <p className="text-[10px] text-rose-400 font-semibold mt-1">
                    🚨 Evacuation Siren Triggered
                  </p>
                )}
              </div>
            </Popup>
          </Circle>
        ))}

        {/* Live IoT Sensor Nodes with Dynamic Risk Colors */}
        {displayNodes.map((n) => {
          if (!n || typeof n.latitude !== 'number' || typeof n.longitude !== 'number' || isNaN(n.latitude) || isNaN(n.longitude)) {
            return null;
          }
          const tilt = n.tiltMagnitude || 0;
          const nodeRisk: 'SAFE' | 'WARNING' | 'CRITICAL' =
            tilt >= 4.0 ? 'CRITICAL' : tilt >= 2.0 ? 'WARNING' : 'SAFE';

          return (
            <Marker
              key={n.nodeId}
              position={[n.latitude, n.longitude]}
              icon={createNodeIcon(nodeRisk, n.nodeId)}
            >
              <Popup>
                <div className="p-1.5 font-sans text-xs">
                  <p className="font-bold text-slate-900 flex items-center gap-1">
                    <span>Slope Sensor: {n.nodeId}</span>
                    <span
                      className="text-[9px] px-1 py-0.5 rounded font-mono font-bold text-white"
                      style={{ backgroundColor: nodeRisk === 'CRITICAL' ? '#EF4444' : nodeRisk === 'WARNING' ? '#F59E0B' : '#10B981' }}
                    >
                      {nodeRisk}
                    </span>
                  </p>
                  <div className="mt-1 space-y-0.5 text-[11px] text-slate-700 font-mono">
                    <p>Coordinates: {n.latitude.toFixed(4)}° N, {n.longitude.toFixed(4)}° E</p>
                    <p>Tilt: {tilt}° | Moisture: {n.soilMoisturePct ?? 0}%</p>
                    <p>Vibration: {n.vibrationDetected ? 'DETECTED' : 'NORMAL'}</p>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-3 left-3 z-[1000] p-2.5 rounded-md bg-[#161B22]/90 backdrop-blur border border-[#30363D] text-[11px] font-mono space-y-1 shadow-lg">
        <p className="font-semibold text-slate-300 font-sans uppercase text-[10px] tracking-wider mb-1">
          Status Matrix
        </p>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span className="text-slate-300">Normal / Stable</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          <span className="text-slate-300">Active Warning</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
          <span className="text-slate-300">Critical Hazard</span>
        </div>
      </div>
    </div>
  );
};
