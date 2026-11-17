import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { LogOut, User as UserIcon, ChevronDown, MapPin, Edit2, Phone, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { EmergencyPhoneModal } from './EmergencyPhoneModal.tsx';

interface NavbarProps {
  onProtectedNavigate: (path: string) => void;
  activeAlertCount: number;
  userLocation?: any;
  onOpenLocationModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onProtectedNavigate,
  activeAlertCount,
  userLocation,
  onOpenLocationModal
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto pop-up to prompt adding and verifying mobile number after signup or login
  useEffect(() => {
    if (user && !user.isPhoneVerified) {
      const dismissed = sessionStorage.getItem('rescuenex_phone_prompt_dismissed');
      if (!dismissed) {
        const timer = setTimeout(() => {
          setIsPhoneModalOpen(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [user]);

  const getUserDisplayName = (u: any): string => {
    if (!u) return '';
    if (u.fullName && u.fullName.trim() !== '') return u.fullName;
    if (u.name && u.name.trim() !== '') return u.name;
    if (u.email) return u.email.split('@')[0];
    return 'User';
  };

  const handleNavClick = (path: string, requiresAuth = false) => {
    if (requiresAuth && !user) {
      onProtectedNavigate(path);
      return;
    }
    navigate(path);
  };

  const currentPath = location.pathname;

  return (
    <header className="sticky top-0 z-50 bg-[#0D1117]/95 backdrop-blur-md border-b border-[#21262D] px-4 sm:px-10 lg:px-16 py-2.5 transition-all">
      <div className="w-full max-w-[1700px] mx-auto flex items-center justify-between">
        
        {/* Left: Geometric Brand Logo & Title */}
        <motion.div 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-3 cursor-pointer select-none" 
          onClick={() => navigate('/')}
        >
          <img 
            src="/assets/logo/rescuenex_emblem.svg" 
            alt="RescueNex" 
            className="w-9 h-9 sm:w-10 sm:h-10 object-contain drop-shadow-md"
          />
          <span className="font-extrabold text-2xl tracking-tight text-white font-sans leading-none">
            Rescue<span className="text-amber-400">Nex</span>
          </span>
        </motion.div>

        {/* Center: System Navigation (Chaukor style) */}
        <nav className="hidden md:flex items-center gap-6">
          <button
            onClick={() => handleNavClick('/')}
            className={`text-sm transition-colors pb-1.5 pt-1 border-b-2 rounded-none ${
              currentPath === '/'
                ? 'text-white border-amber-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 border-transparent font-medium'
            }`}
          >
            Overview
          </button>

          <button
            onClick={() => handleNavClick('/dashboard')}
            className={`text-sm transition-colors pb-1.5 pt-1 border-b-2 rounded-none ${
              currentPath === '/dashboard'
                ? 'text-white border-amber-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 border-transparent font-medium'
            }`}
          >
            Dashboard
          </button>

          <button
            onClick={() => handleNavClick('/alerts')}
            className={`text-sm transition-colors pb-1.5 pt-1 border-b-2 rounded-none flex items-center gap-1.5 ${
              currentPath === '/alerts'
                ? 'text-white border-amber-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 border-transparent font-medium'
            }`}
          >
            <span>Alerts</span>
            {activeAlertCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-none bg-rose-600 text-[10px] font-mono text-white font-bold">
                {activeAlertCount}
              </span>
            )}
          </button>

          <button
            onClick={() => handleNavClick('/analytics', true)}
            className={`text-sm transition-colors pb-1.5 pt-1 border-b-2 rounded-none ${
              currentPath === '/analytics'
                ? 'text-white border-amber-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 border-transparent font-medium'
            }`}
          >
            Analytics
          </button>

          {user?.role === 'ADMIN' && (
            <button
              onClick={() => handleNavClick('/admin', true)}
              className={`text-sm transition-colors pb-1.5 pt-1 border-b-2 rounded-none ${
                currentPath === '/admin'
                  ? 'text-white border-amber-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 border-transparent font-medium'
              }`}
            >
              Admin
            </button>
          )}
        </nav>

        {/* Right: User Profile (Chaukor Box with Gol Avatar inside) */}
        <div className="flex items-center gap-3">
          {user && (
            user.isPhoneVerified ? (
              <button
                onClick={() => setIsPhoneModalOpen(true)}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono border border-[#30363D] bg-[#21262D] hover:bg-[#30363D] text-slate-200 rounded-md transition shadow-sm"
                title="Emergency Mobile Alerts Active - Click to Manage"
              >
                <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                <span>+91 {user.phoneNumber ? user.phoneNumber.slice(-10) : ''}</span>
              </button>
            ) : (
              <button
                onClick={() => setIsPhoneModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono border border-[#30363D] bg-[#21262D] hover:bg-[#30363D] text-slate-200 rounded-md transition shadow-sm"
                title="Add & verify mobile number to receive 10 km corridor SMS evacuation alerts"
              >
                <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-medium">+ Add Mobile</span>
              </button>
            )
          )}

          {user ? (
            <div className="relative" ref={dropdownRef}>
              
              {/* Profile Trigger Button: Chaukor box, round avatar inside, clean name */}
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-none border transition select-none text-left shadow-sm ${
                  isDropdownOpen 
                    ? 'border-amber-400 bg-[#21262D]' 
                    : 'border-[#30363D] bg-[#161B22] hover:border-amber-400/60 hover:bg-[#21262D]'
                }`}
                title="User Profile & Settings"
              >
                {/* Gol (Circular) Avatar */}
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/30 border border-amber-500/40 text-amber-300 flex items-center justify-center font-mono text-xs font-bold shrink-0">
                  {getUserDisplayName(user).charAt(0).toUpperCase()}
                </div>

                <span className="text-xs font-semibold text-slate-200 hidden sm:inline">
                  {getUserDisplayName(user)}
                </span>

                <ChevronDown 
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
                    isDropdownOpen ? 'rotate-180 text-amber-400' : ''
                  }`} 
                />
              </button>

              {/* Chaukor Dropdown Menu */}
              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.98 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 mt-2 w-80 rounded-none bg-[#0D1117] border border-[#30363D] shadow-2xl z-50 text-slate-200 overflow-hidden divide-y divide-[#21262D]"
                  >
                    {/* Header: User Summary */}
                    <div className="p-3.5 bg-[#161B22] flex items-center gap-3 rounded-none">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/30 border border-amber-500/40 text-amber-300 flex items-center justify-center font-bold text-sm font-mono shrink-0">
                        {getUserDisplayName(user).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold text-white truncate font-sans">
                            {getUserDisplayName(user)}
                          </p>
                          <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30 shrink-0 rounded-none">
                            {user.role}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                          {user.email}
                        </p>
                      </div>
                    </div>

                    {/* Selected Location Card with Edit Button */}
                    <div className="p-3 bg-[#161B22]/40 space-y-2 rounded-none">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-sans">
                            Selected Location
                          </span>
                        </div>
                        {onOpenLocationModal && (
                          <button
                            onClick={() => {
                              setIsDropdownOpen(false);
                              onOpenLocationModal();
                            }}
                            className="flex items-center gap-1 px-2.5 py-0.5 text-xs font-mono font-semibold text-amber-400 bg-amber-500/10 hover:bg-amber-400 hover:text-black border border-amber-500/40 rounded-none transition shadow-sm"
                            title="Edit Transit Location"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        )}
                      </div>

                      {/* Location Info Box */}
                      <div 
                        onClick={() => {
                          if (onOpenLocationModal) {
                            setIsDropdownOpen(false);
                            onOpenLocationModal();
                          }
                        }}
                        className="p-2.5 bg-[#0D1117] border border-[#21262D] hover:border-amber-500/40 cursor-pointer rounded-none space-y-1 font-mono text-[11px] transition"
                        title="Click to change location"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-sans">Transit Point:</span>
                          <span className="font-bold text-white text-xs">
                            {userLocation?.cityName || 'Not Configured'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-sans">Coordinates:</span>
                          <span className="text-amber-400 text-[10px]">
                            {userLocation && typeof userLocation.latitude === 'number'
                              ? `${userLocation.latitude.toFixed(4)}°N, ${userLocation.longitude.toFixed(4)}°E`
                              : '--'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Emergency Mobile Broadcast Alerts Card */}
                    <div className="p-3 bg-[#161B22]/40 space-y-2 rounded-none border-t border-[#21262D]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-sans">
                            Emergency Mobile Alerts
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setIsDropdownOpen(false);
                            setIsPhoneModalOpen(true);
                          }}
                          className="flex items-center gap-1 px-2.5 py-0.5 text-xs font-mono font-medium rounded text-slate-200 bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] transition shadow-sm"
                          title="Configure SMS Emergency Evacuation Broadcasts"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>{user.isPhoneVerified ? 'Manage' : 'Verify'}</span>
                        </button>
                      </div>

                      <div 
                        onClick={() => {
                          setIsDropdownOpen(false);
                          setIsPhoneModalOpen(true);
                        }}
                        className="p-2.5 bg-[#0D1117] border border-[#21262D] hover:border-amber-500/40 cursor-pointer rounded-none space-y-1 font-mono text-[11px] transition"
                        title="Click to configure phone and SMS broadcast"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-sans">Mobile Number:</span>
                          <span className={`text-[10px] font-bold ${user.phoneNumber ? 'text-white' : 'text-slate-500'}`}>
                            {user.phoneNumber ? `+91 ${user.phoneNumber.slice(-10)}` : 'Not Added'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Logout Option */}
                    <div className="p-1.5">
                      <button
                        onClick={async () => {
                          setIsDropdownOpen(false);
                          await logout();
                          navigate('/auth');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-rose-400 hover:bg-rose-950/20 rounded-none transition"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-400" />
                        <span>Sign Out</span>
                      </button>
                    </div>

                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          ) : (
            <button
              onClick={() => navigate('/auth')}
              className="flex items-center gap-2 px-4 py-2 rounded-none bg-[#161B22] hover:bg-[#21262D] text-slate-200 border border-[#30363D] text-xs font-semibold transition-all hover:border-slate-500 shadow-sm"
            >
              <UserIcon className="w-4 h-4 text-amber-400" />
              <span>Sign In</span>
            </button>
          )}
        </div>

      </div>

      {/* Emergency Phone & Broadcast Channel Configuration Modal */}
      <EmergencyPhoneModal
        isOpen={isPhoneModalOpen}
        onClose={() => setIsPhoneModalOpen(false)}
      />
    </header>
  );
};
