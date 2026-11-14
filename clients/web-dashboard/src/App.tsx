import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { LandingPage } from './pages/LandingPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { AlertsPage } from './pages/AlertsPage.tsx';
import { AnalyticsPage } from './pages/AnalyticsPage.tsx';
import { AuthPage } from './pages/AuthPage.tsx';
import { AdminPage } from './pages/AdminPage.tsx';
import { LegalPage } from './pages/LegalPage.tsx';
import { Footer } from './components/Footer.tsx';
import { api } from './services/api.ts';
import { socketService } from './services/socket.ts';
import { MountainSector, NodeTelemetry, SectorWeatherData } from './types/index.ts';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Protected Route Guard with 1-second redirect loader
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      const timer = setTimeout(() => {
        navigate('/auth', { state: { from: location.pathname } });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user, loading, navigate, location]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-8 space-y-3">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
        <p className="text-sm text-slate-300 font-sans">Verifying security credentials...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-8 space-y-3">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
        <p className="text-sm text-slate-300 font-sans">Redirecting to Sign In...</p>
      </div>
    );
  }

  return <>{children}</>;
};

// Admin Route Guard
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-8 space-y-3">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const MainAppContent: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Live Gateway state
  const [sectors, setSectors] = useState<MountainSector[]>([]);
  const [telemetry, setTelemetry] = useState<NodeTelemetry | null>(null);
  const [weather, setWeather] = useState<SectorWeatherData | null>(null);
  const [activeAlertCount, setActiveAlertCount] = useState<number>(0);
  const [, setAiOnline] = useState<boolean>(false);
  const [, setWsConnected] = useState<boolean>(false);
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

  const handleProtectedNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-slate-100">
      {/* Navbar with active route indicators */}
      <Navbar
        onProtectedNavigate={handleProtectedNavigate}
        activeAlertCount={activeAlertCount}
      />

      {/* Main Content Area with Real URL Routing */}
      <main className="flex-1 w-full max-w-[1700px] mx-auto px-9 sm:px-16 lg:px-20 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <Routes location={location}>
              {/* Home / Overview */}
              <Route 
                path="/" 
                element={
                  <LandingPage
                    sectors={sectors}
                    weather={weather}
                    isAuthenticated={!!user}
                    onNavigate={(path) => navigate(path)}
                  />
                } 
              />

              {/* Protected Operations Dashboard */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <DashboardPage
                      sectors={sectors}
                      telemetry={telemetry}
                      weather={weather}
                      liveGps={liveGps}
                      onRefreshData={loadInitialData}
                    />
                  </ProtectedRoute>
                } 
              />

              {/* Protected Alerts Feed */}
              <Route 
                path="/alerts" 
                element={
                  <ProtectedRoute>
                    <AlertsPage />
                  </ProtectedRoute>
                } 
              />

              {/* Protected Analytics Table */}
              <Route 
                path="/analytics" 
                element={
                  <ProtectedRoute>
                    <AnalyticsPage />
                  </ProtectedRoute>
                } 
              />

              {/* Protected Admin Approvals */}
              <Route 
                path="/admin" 
                element={
                  <AdminRoute>
                    <AdminPage />
                  </AdminRoute>
                } 
              />

              {/* Authentication */}
              <Route 
                path="/auth" 
                element={<AuthPage onSuccess={() => navigate('/dashboard')} />} 
              />
              <Route path="/login" element={<Navigate to="/auth" replace />} />

              {/* Legal & Policy Pages */}
              <Route path="/terms" element={<LegalPage />} />
              <Route path="/privacy" element={<LegalPage />} />
              <Route path="/sop" element={<LegalPage />} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer with Real Route Links */}
      <Footer activeAlertCount={activeAlertCount} />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <MainAppContent />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
