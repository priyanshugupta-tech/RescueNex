import React, { useState, useEffect } from 'react';
import { Navigation, Search, MapPin, X, Loader2, Check } from 'lucide-react';
import {
  GeoLocation,
  GeocodedLocation,
  searchLocationNominatim,
  QUICK_TRANSIT_POINTS
} from '../utils/geoUtils.ts';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelect: (loc: GeoLocation) => void;
  currentLocation: GeoLocation | null;
}

export const LocationModal: React.FC<LocationModalProps> = ({
  isOpen,
  onClose,
  onLocationSelect,
  currentLocation
}) => {
  const [isLocating, setIsLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodedLocation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Live search debounce
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setErrorMsg('');
      try {
        const results = await searchLocationNominatim(searchQuery);
        setSearchResults(results);
        if (results.length === 0) {
          setErrorMsg(`No locations found for "${searchQuery}".`);
        }
      } catch {
        setErrorMsg('Search service unavailable. Please try again.');
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  if (!isOpen) return null;

  const handleUseGPS = () => {
    setErrorMsg('');
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const geo: GeoLocation = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          source: 'GPS',
          accuracyM: pos.coords.accuracy,
          cityName: 'Live Device GPS',
          selectedAt: Date.now()
        };
        onLocationSelect(geo);
        onClose();
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setErrorMsg('Location permission denied. Please search your city or town below.');
        } else {
          setErrorMsg('Unable to retrieve GPS fix. Please search your location below.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleLocationPick = (item: GeocodedLocation) => {
    const geo: GeoLocation = {
      latitude: item.latitude,
      longitude: item.longitude,
      cityName: item.name,
      source: 'SEARCH',
      selectedAt: Date.now()
    };
    onLocationSelect(geo);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-[#0D1117] border border-[#30363D] rounded-none shadow-2xl p-6 text-slate-200">
        
        {/* Header - Clean typography without decorative boxed icons */}
        <div className="flex items-start justify-between pb-4 border-b border-[#21262D]">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight font-sans">
              Allow Access to Your Location or Select Current Location
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-sans">
              Targeted 10 km Perimeter: Live risk monitoring within 10 km radius of your location.
            </p>
          </div>
          {currentLocation && (
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Live GPS Button */}
        <div className="my-5">
          <button
            onClick={handleUseGPS}
            disabled={isLocating}
            className="w-full py-2.5 px-4 rounded-none bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition shadow disabled:opacity-50"
          >
            <Navigation className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
            {isLocating ? 'Acquiring GPS Fix...' : 'Allow Access to Your Location (Live GPS)'}
          </button>
          {errorMsg && (
            <p className="mt-2 text-xs text-rose-400 font-mono">
              {errorMsg}
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-[#21262D]"></div>
          <span className="flex-shrink mx-3 text-xs font-mono uppercase text-slate-400 font-bold tracking-wider">
            OR Search Any City / Town / Village
          </span>
          <div className="flex-grow border-t border-[#21262D]"></div>
        </div>

        {/* Dynamic Search Input */}
        <div className="relative mt-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type any city, town, or pass (e.g. Ramban, Banihal, Doda, Kishtwar, Anantnag)..."
              className="w-full pl-9 pr-9 py-2.5 bg-[#161B22] border border-[#30363D] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-sans"
              autoFocus={!currentLocation}
            />
            {isSearching && (
              <Loader2 className="w-4 h-4 text-amber-400 animate-spin absolute right-3 top-3" />
            )}
            {searchQuery && !isSearching && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Dynamic Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="mt-2 border border-[#30363D] bg-[#161B22] max-h-52 overflow-y-auto divide-y divide-[#21262D]">
              {searchResults.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleLocationPick(item)}
                  className="w-full text-left p-3 hover:bg-[#21262D] transition flex items-start justify-between group"
                >
                  <div className="pr-2">
                    <p className="text-xs font-bold text-white group-hover:text-amber-400 font-sans">
                      {item.name}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate max-w-sm mt-0.5 font-sans">
                      {item.displayName}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 shrink-0">
                    {item.latitude.toFixed(3)}°, {item.longitude.toFixed(3)}°
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick Suggestions Chips */}
        <div className="mt-4">
          <p className="text-[11px] text-slate-400 font-sans uppercase font-semibold mb-2">
            Common Corridor Points:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_TRANSIT_POINTS.map((pt) => {
              const isSelected = currentLocation?.cityName?.toLowerCase() === pt.name.toLowerCase();
              return (
                <button
                  key={pt.id}
                  onClick={() => handleLocationPick(pt)}
                  className={`px-2.5 py-1 text-xs transition border flex items-center gap-1.5 ${
                    isSelected
                      ? 'border-amber-400 bg-amber-500/10 text-amber-300 font-semibold'
                      : 'border-[#30363D] bg-[#161B22] hover:bg-[#21262D] text-slate-300'
                  }`}
                >
                  <span>{pt.name}</span>
                  {isSelected && <Check className="w-3 h-3 text-amber-400" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-5 pt-3 border-t border-[#21262D] flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            10 km Radius Proximity Filter Active
          </span>
          {currentLocation && (
            <span className="text-slate-300 font-semibold truncate max-w-[200px]">
              Active: {currentLocation.cityName || `${currentLocation.latitude.toFixed(2)}°, ${currentLocation.longitude.toFixed(2)}°`}
            </span>
          )}
        </div>

      </div>
    </div>
  );
};
