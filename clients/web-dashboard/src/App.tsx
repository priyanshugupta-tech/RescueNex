import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { AlertsPage } from './pages/AlertsPage.tsx';
import { AnalyticsPage } from './pages/AnalyticsPage.tsx';
import { AuthPage } from './pages/AuthPage.tsx';
import { AdminPage } from './pages/AdminPage.tsx';
import { LegalModal } from './components/LegalModal.tsx';
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
  const [isLegalOpen, setIsLegalOpen] = useState<boolean>(false);
  const [legalTab, setLegalTab] = useState<'terms' | 'privacy' | 'sop'>('terms');
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
    // Initial load + periodic polling every 5s for live API synchronization
    loadInitialData();
    const pollTimer = setInterval(loadInitialData, 5000);

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
      clearInterval(pollTimer);
      socket.off('TELEMETRY_STREAM');
      socket.off('WEATHER_UPDATED');
      socket.off('EMERGENCY_ALERT');
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background text-slate-100">
      {/* Expansive, Spacious Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab: any) => setCurrentTab(tab)}
        activeAlertCount={activeAlertCount}
      />

      {/* Main Content Area: Wide responsive layout */}
      <main className="flex-1 w-full max-w-[1700px] mx-auto p-4 sm:p-8">
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

      {/* Spacious, Authoritative Footer with Genuine Legal & Compliance Links */}
      <footer className="border-t border-slate-800/80 bg-slate-950/90 px-6 sm:px-10 py-4 text-xs text-slate-400 font-sans shadow-inner">
        <div className="w-full max-w-[1700px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm text-white">
              Rescue<span className="text-amber-400">Nex</span>
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400 text-[11px] font-mono">
              Autonomous Landslide Monitoring System • Innovathon 2.0 (SDMA / BRO J&K)
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] font-medium">
            <button
              onClick={() => {
                setLegalTab('terms');
                setIsLegalOpen(true);
              }}
              className="text-slate-400 hover:text-white transition underline underline-offset-4 decoration-slate-700 hover:decoration-amber-400"
            >
              Terms of Service
            </button>
            <button
              onClick={() => {
                setLegalTab('privacy');
                setIsLegalOpen(true);
              }}
              className="text-slate-400 hover:text-white transition underline underline-offset-4 decoration-slate-700 hover:decoration-amber-400"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => {
                setLegalTab('sop');
                setIsLegalOpen(true);
              }}
              className="text-slate-400 hover:text-white transition underline underline-offset-4 decoration-slate-700 hover:decoration-amber-400"
            >
              Disaster Advisory & SOP
            </button>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 text-[10px] font-mono">
              NDMA CAP v1.2 Compliant
            </span>
          </div>
        </div>
      </footer>

      {/* Legal & Operations Dialog */}
      <LegalModal
        isOpen={isLegalOpen}
        initialTab={legalTab}
        onClose={() => setIsLegalOpen(false)}
      />
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
