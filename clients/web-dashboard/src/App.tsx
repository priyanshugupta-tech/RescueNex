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
import { LocationModal } from './components/LocationModal.tsx';
import { OfflineIndicator } from './components/OfflineIndicator.tsx';
import { FieldReportModal } from './components/FieldReportModal.tsx';
import { offlineCache } from './services/offlineCache.ts';
import { offlineSync } from './services/offlineSync.ts';
import { api } from './services/api.ts';
import { socketService } from './services/socket.ts';
import { MountainSector, NodeTelemetry, SectorWeatherData, EmergencyAlert } from './types/index.ts';
import { GeoLocation } from './utils/geoUtils.ts';
import { filterAlertsByLocation } from './utils/proximityFilter.ts';
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
  const [nodes, setNodes] = useState<NodeTelemetry[]>([]);
  const [weather, setWeather] = useState<SectorWeatherData | null>(null);
  const [activeAlerts, setActiveAlerts] = useState<EmergencyAlert[]>([]);
  const [activeAlertCount, setActiveAlertCount] = useState<number>(0);
  const [, setAiOnline] = useState<boolean>(false);
  const [, setWsConnected] = useState<boolean>(false);

  // User 10 km Geofence Location State (Persisted in localStorage)
  const [userLocation, setUserLocation] = useState<GeoLocation | null>(() => {
    try {
      const saved = localStorage.getItem('rescuenex_user_location');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    // Default initial location: Ramban Highway Center
    return {
      latitude: 33.2422,
      longitude: 75.2443,
      cityName: 'Ramban',
      source: 'CITY_SELECT',
      selectedAt: Date.now()
    };
  });

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Auto-prompt location selector when user enters dashboard if not previously configured
  useEffect(() => {
    const hasPrompted = sessionStorage.getItem('rescuenex_location_prompted');
    if (!hasPrompted && location.pathname === '/dashboard') {
      setIsLocationModalOpen(true);
      sessionStorage.setItem('rescuenex_location_prompted', 'true');
    }
  }, [location.pathname]);

  const handleUpdateLocation = (newLoc: GeoLocation) => {
    setUserLocation(newLoc);
    localStorage.setItem('rescuenex_user_location', JSON.stringify(newLoc));
    // Synchronize transit corridor location with core gateway for geofenced evacuation broadcasts
    if (user) {
      api.post('/api/broadcast/location', {
        latitude: newLoc.latitude,
        longitude: newLoc.longitude,
        cityName: newLoc.cityName
      }).catch((e) => console.warn('Location sync for broadcast notice skipped:', e.message));
    }
  };

  const loadInitialData = async () => {
    try {
      // 1. Health check
      const healthRes = await api.get('/api/health');
      setAiOnline(healthRes.data.aiEngineStatus === 'HEALTHY');

      // 2. Sectors
      const sectorsRes = await api.get('/api/telemetry/sectors');
      let loadedSectors: MountainSector[] = [];
      if (sectorsRes.data.success) {
        loadedSectors = (sectorsRes.data.sectors || []).map((sec: any) => ({
          ...sec,
          lsiScore: sec.lsiScore ?? sec.currentLsiScore ?? 0,
          currentLsiScore: sec.currentLsiScore ?? sec.lsiScore ?? 0
        }));
        setSectors(loadedSectors);
        offlineCache.save('sectors', loadedSectors);
      }

      // 3. Connected nodes
      const nodesRes = await api.get('/api/telemetry/nodes');
      if (nodesRes.data.success && nodesRes.data.nodes?.length > 0) {
        setNodes(nodesRes.data.nodes);
        offlineCache.save('nodes', nodesRes.data.nodes);
        const latest = nodesRes.data.nodes[nodesRes.data.nodes.length - 1];
        setTelemetry(latest);
        offlineCache.save('latest_telemetry', latest);
      }

      // 4. Weather
      const weatherRes = await api.get('/api/weather');
      if (weatherRes.data.success && weatherRes.data.weather?.length > 0) {
        setWeather(weatherRes.data.weather[0]);
        offlineCache.save('weather', weatherRes.data.weather[0]);
      }

      // 5. Alerts with 10 km location filtering
      const alertsRes = await api.get('/api/alerts');
      if (alertsRes.data.success) {
        const rawAlerts: EmergencyAlert[] = alertsRes.data.activeAlerts || [];
        setActiveAlerts(rawAlerts);
        offlineCache.save('alerts', rawAlerts);

        if (userLocation && loadedSectors.length > 0) {
          const { relevantAlerts } = filterAlertsByLocation(
            userLocation.latitude,
            userLocation.longitude,
            loadedSectors,
            rawAlerts,
            10
          );
          setActiveAlertCount(relevantAlerts.length);
        } else {
          setActiveAlertCount(rawAlerts.length);
        }
      }
    } catch (e) {
      console.warn('[Offline Mode] Network unreachable, loading from local emergency cache:', e);
      // Fallback seamlessly to offline cache
      const cached = offlineCache.getAllCachedBundle();
      if (cached.sectors.length > 0) {
        setSectors(cached.sectors);
      }
      if (cached.nodes.length > 0) {
        setNodes(cached.nodes);
        if (cached.latestTelemetry) {
          setTelemetry(cached.latestTelemetry);
        }
      }
      if (cached.weather) {
        setWeather(cached.weather);
      }
      if (cached.alerts.length > 0) {
        setActiveAlerts(cached.alerts);
        if (userLocation && cached.sectors.length > 0) {
          const { relevantAlerts } = filterAlertsByLocation(
            userLocation.latitude,
            userLocation.longitude,
            cached.sectors,
            cached.alerts,
            10
          );
          setActiveAlertCount(relevantAlerts.length);
        } else {
          setActiveAlertCount(cached.alerts.length);
        }
      }
    }
  };

  useEffect(() => {
    loadInitialData();
    const pollTimer = setInterval(loadInitialData, 5000);

    // WebSocket real-time event listeners
    const socket = socketService.connect();

    socket.on('connect', () => setWsConnected(true));
    socket.on('disconnect', () => setWsConnected(false));

    socket.on('TELEMETRY_STREAM', (data: any) => {
      if (data.telemetry) {
        setTelemetry(data.telemetry);
        setNodes((prev) => {
          const idx = prev.findIndex((n) => n.nodeId === data.telemetry.nodeId);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = data.telemetry;
            return next;
          }
          return [...prev, data.telemetry];
        });
      }
      if (data.sector || data.lsiResult) {
        const sectorId = data.sector?.id;
        const newScore = data.lsiResult?.lsiScore ?? data.sector?.lsiScore ?? data.sector?.currentLsiScore;
        const newRisk = data.lsiResult?.riskLevel ?? data.sector?.currentRiskLevel;
        if (sectorId && newScore != null) {
          setSectors((prev) =>
            prev.map((s) =>
              s.id === sectorId
                ? {
                    ...s,
                    lsiScore: newScore,
                    currentLsiScore: newScore,
                    currentRiskLevel: newRisk || s.currentRiskLevel
                  }
                : s
            )
          );
        }
      }
      if (data.aiStatus) {
        setAiOnline(data.aiStatus === 'ONLINE' || data.aiStatus === 'HEALTHY');
      }
    });

    socket.on('SECTOR_STATUS_UPDATED', (data: any) => {
      if (data?.sectorId) {
        setSectors((prev) =>
          prev.map((s) =>
            s.id === data.sectorId
              ? {
                  ...s,
                  currentRiskLevel: data.currentRiskLevel || s.currentRiskLevel,
                  currentLsiScore: data.currentLsiScore ?? s.currentLsiScore,
                  lsiScore: data.currentLsiScore ?? s.lsiScore,
                  sirenActive: data.sirenActive ?? s.sirenActive
                }
              : s
          )
        );
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
      socket.off('SECTOR_STATUS_UPDATED');
      socket.off('WEATHER_UPDATED');
      socket.off('EMERGENCY_ALERT');
    };
  }, [userLocation]);

  const handleProtectedNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-slate-100">
      {/* Offline Status & Background Auto-Sync Indicator */}
      <OfflineIndicator />

      {/* Navbar with active route indicators & location pill */}
      <Navbar
        onProtectedNavigate={handleProtectedNavigate}
        activeAlertCount={activeAlertCount}
        userLocation={userLocation}
        onOpenLocationModal={() => setIsLocationModalOpen(true)}
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

              {/* Operations Dashboard with 10km Radius Geofence */}
              <Route 
                path="/dashboard" 
                element={
                  <DashboardPage
                    sectors={sectors}
                    telemetry={telemetry}
                    nodes={nodes}
                    weather={weather}
                    userLocation={userLocation}
                    onUpdateLocation={handleUpdateLocation}
                    onRefreshData={loadInitialData}
                    alerts={activeAlerts}
                    onOpenReportModal={() => setIsReportModalOpen(true)}
                  />
                } 
              />

              {/* Protected Alerts Feed (Strictly localized to user transit location) */}
              <Route 
                path="/alerts" 
                element={
                  <ProtectedRoute>
                    <AlertsPage 
                      userLocation={userLocation}
                      sectors={sectors}
                      onOpenLocationModal={() => setIsLocationModalOpen(true)}
                      onOpenReportModal={() => setIsReportModalOpen(true)}
                    />
                  </ProtectedRoute>
                } 
              />

              {/* Protected Analytics Table (Strictly localized to user transit location) */}
              <Route 
                path="/analytics" 
                element={
                  <ProtectedRoute>
                    <AnalyticsPage 
                      userLocation={userLocation}
                      onOpenLocationModal={() => setIsLocationModalOpen(true)}
                    />
                  </ProtectedRoute>
                } 
              />

              {/* Authentication (Login / Signup / OTP) */}
              <Route 
                path="/auth" 
                element={
                  user ? (
                    <Navigate to="/dashboard" replace />
                  ) : (
                    <AuthPage onSuccess={() => navigate('/dashboard')} />
                  )
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

              {/* Legal & Compliance Routes */}
              <Route path="/legal" element={<LegalPage />} />
              <Route path="/terms" element={<LegalPage />} />
              <Route path="/privacy" element={<LegalPage />} />
              <Route path="/sop" element={<LegalPage />} />

              {/* Fallback to Overview */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Global Location Geofence Selector Modal */}
      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onLocationSelect={handleUpdateLocation}
        currentLocation={userLocation}
      />

      {/* Ground Scout & Hazard Observation Modal (With Offline Outbox Auto-Sync) */}
      <FieldReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        userLocation={userLocation}
        onReportSubmitted={loadInitialData}
      />

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
