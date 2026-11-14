import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { LandingPage } from './pages/LandingPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { AlertsPage } from './pages/AlertsPage.tsx';
import { AnalyticsPage } from './pages/AnalyticsPage.tsx';
import { AuthPage } from './pages/AuthPage.tsx';
import { AdminPage } from './pages/AdminPage.tsx';
import { Footer } from './components/Footer.tsx';
import { LegalModal } from './components/LegalModal.tsx';
import { api } from './services/api.ts';
import { socketService } from './services/socket.ts';
import { MountainSector, NodeTelemetry, SectorWeatherData } from './types/index.ts';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MainApp: React.FC = () => {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState<'landing' | 'hud' | 'alerts' | 'analytics' | 'admin' | 'auth'>('landing');

  // Redirect transition loader state
  const [isRedirecting, setIsRedirecting] = useState<boolean>(false);
  const [redirectMessage, setRedirectMessage] = useState<string>('');

  // Auto-redirect to dashboard when user logs in from auth/landing
  useEffect(() => {
    if (user && (currentTab === 'auth' || currentTab === 'landing')) {
      setCurrentTab('hud');
    }
  }, [user]);

  // Auth Guard: protect internal operational tabs with 1-sec message & loader
  const handleSelectTab = (tab: string) => {
    const protectedTabs = ['hud', 'alerts', 'analytics', 'admin'];
    if (!user && protectedTabs.includes(tab)) {
      setIsRedirecting(true);
      setRedirectMessage('Protected Operations Area • Authentication Required. Redirecting to Secure Access...');
      setTimeout(() => {
        setIsRedirecting(false);
        setCurrentTab('auth');
      }, 1000);
      return;
    }
    if (tab === 'admin' && user?.role !== 'ADMIN') {
      setCurrentTab('hud');
      return;
    }
    setCurrentTab(tab as any);
  };

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
      {/* Expansive Navbar with 1.5x side padding */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        activeAlertCount={activeAlertCount}
      />

      {/* Main Content Area: 1.5x side padding (px-9 sm:px-16 lg:px-20) */}
      <main className="flex-1 w-full max-w-[1700px] mx-auto px-9 sm:px-16 lg:px-20 py-8">
        
        {/* Simple Redirect Loader */}
        {isRedirecting ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-8 space-y-3">
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
            <p className="text-sm text-slate-300 font-sans">
              Redirecting to Sign In...
            </p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              {currentTab === 'landing' && (
                <LandingPage
                  sectors={sectors}
                  weather={weather}
                  isAuthenticated={!!user}
                  onNavigate={handleSelectTab}
                />
              )}

              {currentTab === 'hud' && user && (
                <DashboardPage
                  sectors={sectors}
                  telemetry={telemetry}
                  weather={weather}
                  liveGps={liveGps}
                  onRefreshData={loadInitialData}
                />
              )}

              {currentTab === 'alerts' && user && <AlertsPage />}

              {currentTab === 'analytics' && user && <AnalyticsPage />}

              {currentTab === 'auth' && (
                <AuthPage onSuccess={() => setCurrentTab('hud')} />
              )}

              {currentTab === 'admin' && user?.role === 'ADMIN' && <AdminPage />}

              {/* Fallback Auth Guard screen if unauthenticated user arrives at deep tab */}
              {!user && ['hud', 'alerts', 'analytics', 'admin'].includes(currentTab) && (
                <AuthPage onSuccess={() => setCurrentTab('hud')} />
              )}
            </motion.div>
          </AnimatePresence>
        )}

      </main>

      {/* Rich Multi-Column Enterprise Footer */}
      <Footer
        onSelectTab={handleSelectTab}
        onOpenLegal={(tab) => {
          setLegalTab(tab);
          setIsLegalOpen(true);
        }}
        activeAlertCount={activeAlertCount}
      />

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
