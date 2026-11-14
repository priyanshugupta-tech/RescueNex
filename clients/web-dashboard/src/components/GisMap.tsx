import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { MountainSector, NodeTelemetry } from '../types/index.ts';

// Fix Leaflet's default marker icons in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Node Icon with radar pulse for the live physical ESP32 GPS
const createNodeIcon = (isWarning: boolean) => L.divIcon({
  className: 'custom-node-pin',
  html: `
    <div class="relative flex items-center justify-center">
      <div class="w-5 h-5 rounded-full ${isWarning ? 'bg-rose-500' : 'bg-sky-500'} border-2 border-white shadow-lg radar-pulse"></div>
      <div class="absolute -top-6 px-1.5 py-0.5 rounded bg-slate-950/90 text-[10px] font-mono text-white font-bold border border-slate-700 whitespace-nowrap shadow">
        ESP32-GPS
      </div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

interface GisMapProps {
  sectors: MountainSector[];
  telemetry: NodeTelemetry | null;
  liveGps: { lat: number | null; lon: number | null; fix: boolean };
}

export const GisMap: React.FC<GisMapProps> = ({ sectors, telemetry, liveGps }) => {
  // NH-44 Key Corridor Anchor Points (Jammu - Srinagar Highway)
  const nh44Corridor: [number, number][] = [
    [33.1500, 75.3000], // Nashri Tunnel
    [33.2450, 75.2400], // Ramban Chanderkote
    [33.3600, 75.2000], // Ramsu
    [33.5100, 75.1800], // Banihal Tunnel
    [33.6000, 75.1500]  // Qazigund Entrance
  ];

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'CRITICAL': return '#EF4444'; // Muted Crimson
      case 'WARNING': return '#F59E0B';  // Warm Amber
      case 'LOW': return '#38BDF8';      // Soft Sky
      default: return '#10B981';         // Emerald
    }
  };

  const isCritical = telemetry && telemetry.tiltMagnitude > 4.0;
  const mapCenterLat = (liveGps.lat !== null) ? liveGps.lat : 33.35;
  const mapCenterLon = (liveGps.lon !== null) ? liveGps.lon : 75.20;

  return (
    <div className="relative w-full h-[520px] rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner">
      <MapContainer
        center={[mapCenterLat, mapCenterLon]}
        zoom={11}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
      >
        {/* Dark Tactical CartoDB TileLayer */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* NH-44 Highway Path */}
        <Polyline
          positions={nh44Corridor}
          pathOptions={{ color: '#F59E0B', weight: 3, opacity: 0.6, dashArray: '6, 8' }}
        />

        {/* Mountain Sector Radii */}
        {sectors.map((sec) => (
          <Circle
            key={sec.id}
            center={[sec.latitude, sec.longitude]}
            radius={2200}
            pathOptions={{
              color: getRiskColor(sec.currentRiskLevel),
              fillColor: getRiskColor(sec.currentRiskLevel),
              fillOpacity: 0.15,
              weight: 1.5
            }}
          >
            <Popup className="tactical-popup">
              <div className="p-1 font-sans text-xs">
                <p className="font-bold text-slate-900">{sec.name}</p>
                <p className="text-[11px] text-slate-600">{sec.highway} • {sec.kmMarker}</p>
                <div className="mt-1 flex items-center justify-between border-t pt-1">
                  <span className="font-semibold text-slate-800">Risk Level:</span>
                  <span className="font-bold" style={{ color: getRiskColor(sec.currentRiskLevel) }}>
                    {sec.currentRiskLevel} ({sec.lsiScore}/100)
                  </span>
                </div>
              </div>
            </Popup>
          </Circle>
        ))}

        {/* Physical Node Real GPS Marker */}
        {liveGps.fix && liveGps.lat !== null && liveGps.lon !== null && (
          <Marker
            position={[liveGps.lat, liveGps.lon]}
            icon={createNodeIcon(isCritical || false)}
          >
            <Popup>
              <div className="p-1.5 font-sans text-xs">
                <p className="font-bold text-slate-900 flex items-center gap-1">
                  <span>ESP32 Physical Node</span>
                  <span className="text-[10px] px-1 py-0.2 bg-sky-100 text-sky-800 rounded font-mono">LIVE GPS</span>
                </p>
                <div className="mt-1 space-y-0.5 text-[11px] text-slate-700 font-mono">
                  <p>Lat/Lon: {liveGps.lat.toFixed(4)}°, {liveGps.lon.toFixed(4)}°</p>
                  <p>Tilt Angle: {telemetry ? `${telemetry.tiltMagnitude}°` : '2.1°'}</p>
                  <p>Soil Moisture: {telemetry ? `${telemetry.soilMoisturePct}%` : '65%'}</p>
                  <p>Battery: {telemetry ? `${telemetry.batteryPct}%` : '92%'}</p>
                </div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-3 left-3 z-[1000] p-2.5 rounded-lg bg-slate-900/90 backdrop-blur border border-slate-800 text-[11px] font-mono space-y-1 shadow-lg">
        <p className="font-bold text-slate-300 font-sans uppercase text-[10px] tracking-wider mb-1">Sector Threat Matrix</p>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span className="text-slate-300">Stable / Low Risk (&lt;40)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <span className="text-slate-300">Moderate Threat (40-74)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
          <span className="text-slate-300">Critical Displacement (&ge;75)</span>
        </div>
      </div>
    </div>
  );
};
