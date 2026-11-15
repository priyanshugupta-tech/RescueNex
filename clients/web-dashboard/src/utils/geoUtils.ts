export interface GeoLocation {
  latitude: number;
  longitude: number;
  cityName?: string;
  source: 'GPS' | 'SEARCH' | 'DEFAULT';
  accuracyM?: number;
  selectedAt: number;
}

export interface GeocodedLocation {
  id: string;
  name: string;
  displayName: string;
  latitude: number;
  longitude: number;
}

/**
 * Calculates distance between two coordinates in Kilometers (Haversine Formula)
 */
export const calculateDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

/**
 * Queries OpenStreetMap Nominatim for any Indian city, town, village, or highway pass
 */
export const searchLocationNominatim = async (query: string): Promise<GeocodedLocation[]> => {
  if (!query || query.trim().length < 2) return [];

  try {
    const q = encodeURIComponent(query.trim());
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=5&countrycodes=in`,
      {
        headers: {
          'Accept-Language': 'en'
        }
      }
    );

    if (!res.ok) return [];
    const items = await res.json();

    return items.map((item: any, idx: number) => {
      const parts = (item.display_name || '').split(',');
      const shortName = parts[0] || query;
      return {
        id: `${item.place_id || idx}`,
        name: shortName.trim(),
        displayName: item.display_name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon)
      };
    });
  } catch (e) {
    console.warn('Geocoding search error:', e);
    return [];
  }
};

/**
 * Popular Quick-Select Transit Points along NH-44 & Mountain Passes
 */
export const QUICK_TRANSIT_POINTS: GeocodedLocation[] = [
  { id: 'RAMBAN', name: 'Ramban', displayName: 'Ramban Central Corridor', latitude: 33.2422, longitude: 75.2443 },
  { id: 'BANIHAL', name: 'Banihal', displayName: 'Banihal, Jawahar Tunnel approach', latitude: 33.4975, longitude: 75.2014 },
  { id: 'PATNITOP', name: 'Patnitop', displayName: 'Patnitop / Kud Pass', latitude: 33.0911, longitude: 75.3283 },
  { id: 'BATOTE', name: 'Batote', displayName: 'Batote Gorge Intersection', latitude: 33.1600, longitude: 75.3200 },
  { id: 'SRINAGAR', name: 'Srinagar', displayName: 'Srinagar Kashmir Valley Terminal', latitude: 34.0837, longitude: 74.7973 },
  { id: 'JAMMU', name: 'Jammu', displayName: 'Jammu Tawi Southern Staging', latitude: 32.7266, longitude: 74.8570 }
];
