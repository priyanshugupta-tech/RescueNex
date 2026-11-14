import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { AlertsPage } from './pages/AlertsPage.tsx';
import { AnalyticsPage } from './pages/AnalyticsPage.tsx';
import { AuthPage } from './pages/AuthPage.tsx';
import { AdminPage } from './pages/AdminPage.tsx';
import { api } from './services/api.ts';
import { socketService } from './services/socket.ts';
import { MountainSector, NodeTelemetry, SectorWeatherData } from './types/index.ts';

const MainApp: React.FC = () => {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState<'hud' | 'alerts' | 'analytics' | 'admin' | 'auth'>('hud');

  // Live Gateway state
  const [sectors, setSectors] = useState<MountainSector[]>([]);
  const [telemetry, setTelemetry] = useState<NodeTelemetry | null>(null);
  const [weather, setWeather] = useState<SectorWeatherData | null>(null);
  const [activeAlertCount, setActiveAlertCount] = useState<number>(0);
  const [aiOnline, setAiOnline] = useState<boolean>(false);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [liveGps, setLiveGps] = useState<{ lat: number | null; lon: number | null; fix: boolean }>({
    lat: null,
    lon: null,
    fix: false
  });

  const loadInitialData = async () => {
    try {
      // 1. Health check
      const healthRes = await api.get('/api/health');
      setAiOnline(healthRes.data.aiEngineStatus === 'HEALTHY');

      // 2. Sectors
      const sectorsRes = await api.get('/api/telemetry/sectors');
      if (sectorsRes.data.success) {
        setSectors(sectorsRes.data.sectors || []);
      }

      // 3. Connected nodes
      const nodesRes = await api.get('/api/telemetry/nodes');
      if (nodesRes.data.success && nodesRes.data.nodes?.length > 0) {
        const latest = nodesRes.data.nodes[nodesRes.data.nodes.length - 1];
        setTelemetry(latest);
        if (latest.latitude && latest.longitude) {
          setLiveGps({ lat: latest.latitude, lon: latest.longitude, fix: latest.gpsFix ?? true });
        }
      }

      // 4. Weather
      const weatherRes = await api.get('/api/weather');
      if (weatherRes.data.success && weatherRes.data.weather?.length > 0) {
        setWeather(weatherRes.data.weather[0]);
      }

      // 5. Alerts
      const alertsRes = await api.get('/api/alerts');
      if (alertsRes.data.success) {
        setActiveAlertCount(alertsRes.data.activeAlerts?.length || 0);
      }
    } catch (e) {
      console.warn('Initial data load error:', e);
    }
  };

  useEffect(() => {
    loadInitialData();

    // WebSocket real-time event listeners
    const socket = socketService.connect();

    socket.on('connect', () => setWsConnected(true));
    socket.on('disconnect', () => setWsConnected(false));

    socket.on('TELEMETRY_STREAM', (data: any) => {
      if (data.telemetry) {
        setTelemetry(data.telemetry);
        if (data.telemetry.latitude && data.telemetry.longitude) {
          setLiveGps({
            lat: data.telemetry.latitude,
            lon: data.telemetry.longitude,
            fix: data.telemetry.gpsFix ?? true
          });
        }
      }
      if (data.aiStatus) {
        setAiOnline(data.aiStatus === 'ONLINE' || data.aiStatus === 'HEALTHY');
      }
    });

    socket.on('WEATHER_UPDATED', (weatherList: any) => {
      if (Array.isArray(weatherList) && weatherList.length > 0) {
        setWeather(weatherList[0]);
      }
    });

    socket.on('EMERGENCY_ALERT', () => {
      loadInitialData();
    });

    return () => {
      socket.off('TELEMETRY_STREAM');
      socket.off('WEATHER_UPDATED');
      socket.off('EMERGENCY_ALERT');
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background text-slate-100">
      {/* Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab: any) => setCurrentTab(tab)}
        activeAlertCount={activeAlertCount}
        liveGps={liveGps}
        aiOnline={aiOnline}
        wsConnected={wsConnected}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {currentTab === 'hud' && (
          <DashboardPage
            sectors={sectors}
            telemetry={telemetry}
            weather={weather}
            liveGps={liveGps}
            onRefreshData={loadInitialData}
          />
        )}

        {currentTab === 'alerts' && <AlertsPage />}

        {currentTab === 'analytics' && <AnalyticsPage />}

        {currentTab === 'auth' && (
          <AuthPage onSuccess={() => setCurrentTab('hud')} />
        )}

        {currentTab === 'admin' && user?.role === 'ADMIN' && <AdminPage />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 px-4 py-3 text-center text-xs text-slate-500 font-mono">
        <p>RescueNex • Autonomous Landslide Monitoring System • Innovathon 2.0 (SDMA / BRO J&K)</p>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
};

export default App;
