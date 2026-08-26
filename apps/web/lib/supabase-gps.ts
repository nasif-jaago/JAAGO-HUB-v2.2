// ═══════════════════════════════════════════════════════════════════════════
// 1. DATA TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

export interface GPSLocationItem {
  id: string;
  name: string;
  branchOffice: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  status: 'Active' | 'Inactive';
  notes?: string | undefined;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. MASTER 32 JAAGO FOUNDATION GPS COORDINATES SEED DATA
// ═══════════════════════════════════════════════════════════════════════════

export const INITIAL_GPS_LOCATIONS: GPSLocationItem[] = [
  {
    id: 'gps-1',
    name: 'Khulna Office',
    branchOffice: 'Khulna Office',
    latitude: 22.815807,
    longitude: 89.553726,
    radiusMeters: 100,
    status: 'Active',
  },
  {
    id: 'gps-2',
    name: 'Barishal Hub',
    branchOffice: 'Barishal Office',
    latitude: 22.709056,
    longitude: 90.351500,
    radiusMeters: 100,
    status: 'Active',
  },
  {
    id: 'gps-3',
    name: 'SHIELD Office',
    branchOffice: 'SHIELD Office',
    latitude: 22.604659,
    longitude: 89.517587,
    radiusMeters: 100,
    status: 'Active',
  },
  {
    id: 'gps-4',
    name: 'USA',
    branchOffice: 'USA Office',
    latitude: 38.070595,
    longitude: -77.375733,
    radiusMeters: 100,
    status: 'Active',
  },
  {
    id: 'gps-5',
    name: 'UK Office',
    branchOffice: 'UK(55 Signia Court, Wembley Hill Road, Wembley, Postcode- HA9 8BE HP47+79 Wembley)',
    latitude: 51.555931,
    longitude: -0.286475,
    radiusMeters: 500,
    status: 'Active',
  },
  {
    id: 'gps-6',
    name: 'Narayanganj Hub',
    branchOffice: 'Narayanganj Office',
    latitude: 23.626323,
    longitude: 90.500866,
    radiusMeters: 100,
    status: 'Active',
  },
  {
    id: 'gps-7',
    name: 'Kishorganj Hub',
    branchOffice: 'Kishorganj Office',
    latitude: 24.441273,
    longitude: 91.055689,
    radiusMeters: 100,
    status: 'Active',
  },
  {
    id: 'gps-8',
    name: 'EMK Center',
    branchOffice: 'Gulshan, Dhaka',
    latitude: 23.788983,
    longitude: 90.416538,
    radiusMeters: 100,
    status: 'Active',
  },
  {
    id: 'gps-9',
    name: 'Uttara my Home',
    branchOffice: 'Test 1.0',
    latitude: 23.856372,
    longitude: 90.384102,
    radiusMeters: 100,
    status: 'Inactive',
    notes: 'Test only location',
  },
  {
    id: 'gps-10',
    name: 'JAAGO Foundation, Teknaf School',
    branchOffice: 'Upazila, Teknaf 4700',
    latitude: 20.848394,
    longitude: 92.279565,
    radiusMeters: 100,
    status: 'Active',
  },
  {
    id: 'gps-11',
    name: 'JAAGO Foundation, Rangpur School',
    branchOffice: 'Kursha',
    latitude: 25.761484,
    longitude: 89.372932,
    radiusMeters: 100,
    status: 'Active',
  },
  {
    id: 'gps-12',
    name: 'JAAGO Foundation School, Banani Branch',
    branchOffice: 'Holding# 289 Block-B Korail-1(South Unite), Word No:19',
    latitude: 23.786800,
    longitude: 90.412590,
    radiusMeters: 100,
    status: 'Active',
  },
  {
    id: 'gps-13',
    name: 'JAAGO Foundation, Rayer Bazar School',
    branchOffice: '91 Sher-E-Bangla Rd, Dhaka 1207',
    latitude: 23.751279,
    longitude: 90.363015,
    radiusMeters: 100,
    status: 'Active',
  },
  {
    id: 'gps-14',
    name: 'JAAGO Foundation, Rajshahi School',
    branchOffice: 'Rajshahi',
    latitude: 24.381226,
    longitude: 88.612499,
    radiusMeters: 100,
    status: 'Active',
  },
  {
    id: 'gps-15',
    name: 'JAAGO Foundation, Madaripur School',
    branchOffice: 'Ukilpara Rd, Madaripur 7900',
    latitude: 23.169995,
    longitude: 90.212625,
    radiusMeters: 100,
    status: 'Active',
  },
  {
    id: 'gps-16',
    name: 'JAAGO Foundation, Habiganj School',
    branchOffice: 'Jagadishpur',
    latitude: 24.135109,
    longitude: 91.396520,
    radiusMeters: 100,
    status: 'Active',
  },
  {
    id: 'gps-17',
    name: 'JAAGO Foundation, Gaibandha School',
    branchOffice: 'Kuthipara',
    latitude: 25.330171,
    longitude: 89.559311,
    radiusMeters: 100,
    status: 'Active',
  },
  {
    id: 'gps-18',
    name: 'JAAGO Foundation, Dinajpur School',
    branchOffice: 'Dhaka - Dinajpur Hwy, Sundarban',
    latitude: 25.757405,
    longitude: 88.727441,
    radiusMeters: 100,
    status: 'Active',
  },
  {
    id: 'gps-19',
    name: 'JAAGO Foundation, Chittagong School',
    branchOffice: 'Moti Jharna Ln, Chattogram',
    latitude: 22.347640,
    longitude: 91.813281,
    radiusMeters: 100,
    status: 'Active',
  },
  {
    id: 'gps-20',
    name: 'JAAGO Foundation, Bandarban School',
    branchOffice: 'Bandarban, Bandarban District 4600',
    latitude: 22.188409,
    longitude: 92.194601,
    radiusMeters: 100,
    status: 'Active',
  },
  {
    id: 'gps-21',
    name: 'JAAGO Foundation, DSP Hub',
    branchOffice: 'House 09, Rd No.1/B, Block: L, Banani, Dhaka-1213, Bangladesh.',
    latitude: 23.796192,
    longitude: 90.406826,
    radiusMeters: 100,
    status: 'Active',
  },
  {
    id: 'gps-22',
    name: 'JAAGO Foundation, Ali Kadam Hub',
    branchOffice: 'Thanda Mistri Para, Ward #1, Alikadam Bus Stand, Alikadam Sadar, Alikadam Upazila, Bandarban Hill Tract District.',
    latitude: 21.650474,
    longitude: 92.323384,
    radiusMeters: 100,
    status: 'Active',
  },
  {
    id: 'gps-23',
    name: 'JAAGO Foundation, Lama Hub',
    branchOffice: 'Nunarjhiri Para, Ward #7, Lama Municipality, Lama Upazila, Bandarban Hill District.',
    latitude: 21.760756,
    longitude: 92.205013,
    radiusMeters: 100,
    status: 'Active',
  },
  {
    id: 'gps-24',
    name: 'JAAGO Foundation, Cox\'s Bazar Hub',
    branchOffice: 'JAAGO Foundation, Hatchery Zone, Marin Drive Road, Kolatoli, Cox\'s Bazar 4700',
    latitude: 21.402682,
    longitude: 91.994479,
    radiusMeters: 100,
    status: 'Active',
  },
  {
    id: 'gps-25',
    name: 'JAAGO Foundation, Bandarban Hub',
    branchOffice: 'Holding No: 0170-00, (Near the Hotel Darjeeling), Village: Moddhom Para, Ward No - 4, Prodhan Sarak, Bandarban Sadar, Bandarban, Bangladesh.',
    latitude: 22.199189,
    longitude: 92.219637,
    radiusMeters: 100,
    status: 'Active',
  },
  {
    id: 'gps-26',
    name: 'JAAGO Foundation, Mymensingh Hub',
    branchOffice: '13 Swadeshi Bazar Rd, Mymensingh',
    latitude: 24.758830,
    longitude: 90.408423,
    radiusMeters: 100,
    status: 'Active',
  },
  {
    id: 'gps-27',
    name: 'JAAGO Foundation, Chattogram Hub',
    branchOffice: 'A.S Tower (1st Floor), Mowlovipara, North Agrabad, Chittagong, Bangladesh.',
    latitude: 22.329640,
    longitude: 91.810856,
    radiusMeters: 100,
    status: 'Active',
  },
  {
    id: 'gps-28',
    name: 'JAAGO Foundation, Sylhet Hub',
    branchOffice: 'Bangladesh Biman Office, Mojumdari, Airport Road, Sylhet, Bangladesh.',
    latitude: 24.910963,
    longitude: 91.870813,
    radiusMeters: 100,
    status: 'Active',
  },
  {
    id: 'gps-29',
    name: 'JAAGO Foundation, Rangpur Hub',
    branchOffice: '2nd floor, Jobaida Tower, Road - 01, House - 24, New Sen Para, Grand Hotel More, Rangpur, Bangladesh.',
    latitude: 25.743642,
    longitude: 89.252173,
    radiusMeters: 100,
    status: 'Active',
  },
  {
    id: 'gps-30',
    name: 'JAAGO Foundation, Rajshahi Hub',
    branchOffice: '180, Sipaipara, 8 No Ward, Rajpara, Rajshahi-6000, Bangladesh.',
    latitude: 24.369648,
    longitude: 88.588425,
    radiusMeters: 100,
    status: 'Active',
  },
  {
    id: 'gps-31',
    name: 'JAAGO Foundation, HQ Extension',
    branchOffice: 'House 57, Road 7, Block H, Banani, Dhaka-1213, Bangladesh.',
    latitude: 23.789069,
    longitude: 90.408705,
    radiusMeters: 100,
    status: 'Active',
  },
  {
    id: 'gps-32',
    name: 'JAAGO Foundation HQ',
    branchOffice: 'Banani, Dhaka - Current Administrative Office',
    latitude: 23.789555,
    longitude: 90.408706,
    radiusMeters: 100,
    status: 'Active',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// 3. STORAGE AND SYNC HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const GPS_STORAGE_KEY = 'jaago_admin_gps_locations_v2';

export function getLocalGPSLocations(): GPSLocationItem[] {
  if (typeof window === 'undefined') return INITIAL_GPS_LOCATIONS;
  try {
    const raw = localStorage.getItem(GPS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(GPS_STORAGE_KEY, JSON.stringify(INITIAL_GPS_LOCATIONS));
      return INITIAL_GPS_LOCATIONS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_GPS_LOCATIONS;
  } catch {
    return INITIAL_GPS_LOCATIONS;
  }
}

export function saveLocalGPSLocations(items: GPSLocationItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GPS_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to cache GPS locations locally:', err);
  }
}

export function mapRowToGPSLocation(row: any): GPSLocationItem {
  return {
    id: row.id,
    name: row.name,
    branchOffice: row.branch_office || row.branchOffice || '',
    latitude: Number(row.latitude || 0),
    longitude: Number(row.longitude || 0),
    radiusMeters: Number(row.radius_meters || row.radiusMeters || 100),
    status: row.status === 'Inactive' ? 'Inactive' : 'Active',
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapGPSLocationToRow(item: GPSLocationItem) {
  return {
    id: item.id,
    name: item.name,
    branch_office: item.branchOffice,
    latitude: item.latitude,
    longitude: item.longitude,
    radius_meters: item.radiusMeters,
    status: item.status,
    notes: item.notes || null,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Fetch all GPS locations from Supabase backend (with local fallback)
 */
export async function fetchGPSLocationsFromSupabase(): Promise<GPSLocationItem[]> {
  try {
    const res = await fetch('/api/v1/admin/gps-locations', {
      cache: 'no-store',
    });
    if (!res.ok) {
      return getLocalGPSLocations();
    }
    const json = await res.json();
    if (json.success && Array.isArray(json.data) && json.data.length > 0) {
      const items = json.data.map(mapRowToGPSLocation);
      saveLocalGPSLocations(items);
      return items;
    }
    return getLocalGPSLocations();
  } catch (err) {
    console.warn('Could not fetch GPS locations from Supabase; using cache:', err);
    return getLocalGPSLocations();
  }
}

/**
 * Save or update single GPS location
 */
export async function saveGPSLocationToSupabase(item: GPSLocationItem): Promise<boolean> {
  // Update local cache optimistically
  const current = getLocalGPSLocations();
  const existingIdx = current.findIndex((l) => l.id === item.id);
  const updated = existingIdx >= 0 ? current.map((l) => (l.id === item.id ? item : l)) : [item, ...current];
  saveLocalGPSLocations(updated);

  try {
    const res = await fetch('/api/v1/admin/gps-locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mapGPSLocationToRow(item)),
    });
    return res.ok;
  } catch (err) {
    console.warn('Failed to sync GPS location to Supabase:', err);
    return false;
  }
}

/**
 * Delete a GPS location
 */
export async function deleteGPSLocationFromSupabase(id: string): Promise<boolean> {
  const current = getLocalGPSLocations();
  saveLocalGPSLocations(current.filter((l) => l.id !== id));

  try {
    const res = await fetch(`/api/v1/admin/gps-locations?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.warn('Failed to delete GPS location from Supabase:', err);
    return false;
  }
}
