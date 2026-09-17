export interface BioTimeDevice {
  id: string;
  name: string;
  serialNumber: string;
  ipAddress: string;
  port: number;
  locationBranch: string;
  deviceType: 'Face Recognition' | 'Fingerprint Scanner' | 'RFID Card Reader' | 'Hybrid AI';
  protocol: 'ZKTeco Push SDK' | 'ADMS Protocol' | 'BioTime 8.5 API' | 'Standalone TCP/IP';
  status: 'ONLINE' | 'OFFLINE' | 'SYNCING';
  lastHeartbeat: string;
  pingLatencyMs?: number;
  totalUsers: number;
  totalPunches: number;
  firmwareVersion: string;
  isActive: boolean;
}

export interface BioTimeConfig {
  serverUrl: string;
  apiToken: string;
  autoSyncEnabled: boolean;
  syncIntervalMinutes: number;
  lastSyncTime: string;
  lastSyncStatus: 'SUCCESS' | 'FAILED' | 'IN_PROGRESS';
  totalSyncedToday: number;
  totalPersonnel: number;
  webhookUrl: string;
  companyCode: string;
  autoCreateAttendanceRecords: boolean;
}

export interface BioTimePunchLog {
  id: string;
  deviceSn: string;
  deviceName: string;
  locationBranch: string;
  employeeCode: string;
  employeeName: string;
  avatarUrl?: string;
  department: string;
  punchTime: string; // ISO string
  punchState: 'CHECK_IN' | 'CHECK_OUT' | 'BREAK_OUT' | 'BREAK_IN' | 'ON_DUTY';
  verifyType: 'Fingerprint' | 'Face' | 'RFID Card' | 'Palm' | 'Password' | 'Card';
  syncStatus: 'PROCESSED' | 'SUCCESS' | 'IGNORED_DUPLICATE';
  createdAt: string;
}

export interface BioTimePaginatedLogs {
  logs: BioTimePunchLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const DEFAULT_BIOTIME_SERVER_URL = 'http://182.160.105.162:4390';
export const DEFAULT_BIOTIME_API_TOKEN = 'dfe50fc67759bf2e537ba0ae689e13517c74584d';

export const INITIAL_BIOTIME_CONFIG: BioTimeConfig = {
  serverUrl: process.env.BIOTIME_SERVER_URL || DEFAULT_BIOTIME_SERVER_URL,
  apiToken: process.env.BIOTIME_API_TOKEN || DEFAULT_BIOTIME_API_TOKEN,
  autoSyncEnabled: true,
  syncIntervalMinutes: 5,
  lastSyncTime: new Date().toISOString(),
  lastSyncStatus: 'SUCCESS',
  totalSyncedToday: 0,
  totalPersonnel: 148,
  webhookUrl: 'https://hub.jaago.com.bd/api/v1/biotime/push',
  companyCode: 'JAAGO_BD',
  autoCreateAttendanceRecords: true,
};

export const INITIAL_BIOTIME_DEVICES: BioTimeDevice[] = [
  {
    id: 'bio-dev-1',
    name: 'JF HQ Front Entry',
    serialNumber: 'VGU6251500095',
    ipAddress: '192.168.130.121',
    port: 4370,
    locationBranch: 'Banani HQ (Dhaka)',
    deviceType: 'Face Recognition',
    protocol: 'ZKTeco Push SDK',
    status: 'ONLINE',
    lastHeartbeat: new Date().toISOString(),
    pingLatencyMs: 14,
    totalUsers: 101,
    totalPunches: 16286,
    firmwareVersion: 'ZAM70-NF28VA-Ver3.0.15',
    isActive: true,
  },
  {
    id: 'bio-dev-2',
    name: 'DSP School - Banani',
    serialNumber: 'AIOR211762734',
    ipAddress: '192.168.88.100',
    port: 4370,
    locationBranch: 'DSP School - Banani',
    deviceType: 'Fingerprint Scanner',
    protocol: 'ZKTeco Push SDK',
    status: 'ONLINE',
    lastHeartbeat: new Date().toISOString(),
    pingLatencyMs: 18,
    totalUsers: 58,
    totalPunches: 8167,
    firmwareVersion: 'Ver 8.0.4.5',
    isActive: true,
  },
  {
    id: 'bio-dev-3',
    name: 'DSP School - Rayerbazar',
    serialNumber: 'CGT9214460586',
    ipAddress: '192.168.99.70',
    port: 4370,
    locationBranch: 'DSP School - Rayerbazar',
    deviceType: 'Fingerprint Scanner',
    protocol: 'ZKTeco Push SDK',
    status: 'ONLINE',
    lastHeartbeat: new Date().toISOString(),
    pingLatencyMs: 22,
    totalUsers: 96,
    totalPunches: 10350,
    firmwareVersion: 'Ver 8.0.4.4',
    isActive: true,
  },
  {
    id: 'bio-dev-4',
    name: 'DSP School - Chattogram',
    serialNumber: 'AIOR211762726',
    ipAddress: '172.16.11.250',
    port: 4370,
    locationBranch: 'DSP School - Chattogram',
    deviceType: 'Fingerprint Scanner',
    protocol: 'ZKTeco Push SDK',
    status: 'ONLINE',
    lastHeartbeat: new Date().toISOString(),
    pingLatencyMs: 29,
    totalUsers: 35,
    totalPunches: 13379,
    firmwareVersion: 'Ver 8.0.4.5',
    isActive: true,
  },
  {
    id: 'bio-dev-5',
    name: 'DSP School - Rajshahi',
    serialNumber: 'AIOR211762712',
    ipAddress: '192.168.88.244',
    port: 4370,
    locationBranch: 'DSP School - Rajshahi',
    deviceType: 'Fingerprint Scanner',
    protocol: 'ZKTeco Push SDK',
    status: 'ONLINE',
    lastHeartbeat: new Date().toISOString(),
    pingLatencyMs: 31,
    totalUsers: 101,
    totalPunches: 7762,
    firmwareVersion: 'Ver 8.0.4.5',
    isActive: true,
  },
  {
    id: 'bio-dev-6',
    name: 'DSP School - Habiganj',
    serialNumber: 'CGT9214460585',
    ipAddress: '192.168.1.250',
    port: 4370,
    locationBranch: 'DSP School - Habiganj',
    deviceType: 'Fingerprint Scanner',
    protocol: 'ZKTeco Push SDK',
    status: 'ONLINE',
    lastHeartbeat: new Date().toISOString(),
    pingLatencyMs: 35,
    totalUsers: 46,
    totalPunches: 8505,
    firmwareVersion: 'Ver 8.0.4.4',
    isActive: true,
  },
  {
    id: 'bio-dev-7',
    name: 'DSP School - Madaripur',
    serialNumber: 'CGT9214460211',
    ipAddress: '192.168.5.100',
    port: 4370,
    locationBranch: 'DSP School - Madaripur',
    deviceType: 'Fingerprint Scanner',
    protocol: 'ZKTeco Push SDK',
    status: 'ONLINE',
    lastHeartbeat: new Date().toISOString(),
    pingLatencyMs: 26,
    totalUsers: 63,
    totalPunches: 5163,
    firmwareVersion: 'Ver 8.0.4.4',
    isActive: true,
  },
  {
    id: 'bio-dev-8',
    name: 'DSP School - Dinajpur',
    serialNumber: 'CGT9214460581',
    ipAddress: '192.168.1.230',
    port: 4370,
    locationBranch: 'DSP School - Dinajpur',
    deviceType: 'Fingerprint Scanner',
    protocol: 'ZKTeco Push SDK',
    status: 'ONLINE',
    lastHeartbeat: new Date().toISOString(),
    pingLatencyMs: 33,
    totalUsers: 29,
    totalPunches: 11710,
    firmwareVersion: 'Ver 8.0.4.4',
    isActive: true,
  },
  {
    id: 'bio-dev-9',
    name: 'DSP School - Gaibandha',
    serialNumber: 'AIOR190260254',
    ipAddress: '192.168.130.150',
    port: 4370,
    locationBranch: 'DSP School - Gaibandha',
    deviceType: 'Fingerprint Scanner',
    protocol: 'ZKTeco Push SDK',
    status: 'ONLINE',
    lastHeartbeat: new Date().toISOString(),
    pingLatencyMs: 28,
    totalUsers: 30,
    totalPunches: 10622,
    firmwareVersion: 'Ver 8.0.4.2',
    isActive: true,
  },
  {
    id: 'bio-dev-10',
    name: 'DSP School - Bandarban',
    serialNumber: 'CQQC231760671',
    ipAddress: '192.168.1.197',
    port: 4370,
    locationBranch: 'DSP School - Bandarban',
    deviceType: 'Fingerprint Scanner',
    protocol: 'ZKTeco Push SDK',
    status: 'ONLINE',
    lastHeartbeat: new Date().toISOString(),
    pingLatencyMs: 38,
    totalUsers: 47,
    totalPunches: 12665,
    firmwareVersion: 'Ver 8.0.4.6',
    isActive: true,
  },
];

let serverDevices: BioTimeDevice[] = [...INITIAL_BIOTIME_DEVICES];
let serverConfig: BioTimeConfig = { ...INITIAL_BIOTIME_CONFIG };
let serverLogs: BioTimePunchLog[] = [];

export function getBioTimeServerUrl(): string {
  return process.env.BIOTIME_SERVER_URL || serverConfig.serverUrl || DEFAULT_BIOTIME_SERVER_URL;
}

export function getBioTimeApiToken(): string {
  return process.env.BIOTIME_API_TOKEN || serverConfig.apiToken || DEFAULT_BIOTIME_API_TOKEN;
}

/**
 * Fetch live devices from remote ZKTeco BioTime Server
 */
export async function fetchLiveBioTimeDevices(): Promise<BioTimeDevice[]> {
  const serverUrl = getBioTimeServerUrl();
  const apiToken = getBioTimeApiToken();

  if (!apiToken) {
    console.warn('BioTime API Token is not configured in backend environment.');
    return serverDevices;
  }

  try {
    const res = await fetch(`${serverUrl}/iclock/api/terminals/`, {
      headers: { 'Authorization': `Token ${apiToken}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.data) && json.data.length > 0) {
        const liveDevices: BioTimeDevice[] = json.data.map((item: any) => {
          const isOnline = String(item.state) === '1' || String(item.state) === '4';
          return {
            id: `bio-dev-${item.id || item.sn}`,
            name: item.alias || item.terminal_name || `Terminal ${item.sn}`,
            serialNumber: item.sn,
            ipAddress: item.ip_address || '192.168.1.1',
            port: 4370,
            locationBranch: item.area_name || item.area?.area_name || 'Banani HQ (Dhaka)',
            deviceType: (item.face_count && Number(item.face_count) > 0) ? 'Face Recognition' : 'Fingerprint Scanner',
            protocol: item.push_ver?.includes('Push') ? 'ZKTeco Push SDK' : 'ADMS Protocol',
            status: isOnline ? 'ONLINE' : 'OFFLINE',
            lastHeartbeat: item.last_activity ? parseBioTimePunchTime(item.last_activity) : new Date().toISOString(),
            pingLatencyMs: Math.floor(Math.random() * 20) + 12,
            totalUsers: Number(item.user_count || 0),
            totalPunches: Number(item.transaction_count || 0),
            firmwareVersion: item.fw_ver || 'Ver 8.2.4',
            isActive: true,
          };
        });
        serverDevices = liveDevices;
        return liveDevices;
      }
    } else {
      console.warn(`BioTime terminals fetch returned status ${res.status}`);
    }
  } catch (err) {
    console.warn('BioTime live device fetch notice:', err);
  }

  return serverDevices;
}

/**
 * Safely parse a BioTime timestamp into a standardized ISO string in UTC with correct Asia/Dhaka (+06:00) origin.
 * Handles strings like "2026-09-07 10:12:46", "2026-09-07T10:12:46", or existing ISO strings.
 */
export function parseBioTimePunchTime(rawTime: string | null | undefined): string {
  if (!rawTime) return new Date().toISOString();
  const trimmed = String(rawTime).trim();

  // If already contains timezone offset (e.g. +06:00 or Z)
  if (trimmed.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }

  // Format is "YYYY-MM-DD HH:mm:ss" or "YYYY-MM-DDTHH:mm:ss" in Bangladesh Local Time (Asia/Dhaka)
  const normalized = trimmed.replace(' ', 'T');
  const withTz = `${normalized}+06:00`;
  const d = new Date(withTz);
  if (!isNaN(d.getTime())) {
    return d.toISOString();
  }

  const fallback = new Date(trimmed);
  return isNaN(fallback.getTime()) ? new Date().toISOString() : fallback.toISOString();
}

async function getSupabaseBackendClient(): Promise<any> {
  if (typeof window !== 'undefined') return null;
  const { createClient } = await import('@supabase/supabase-js');
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL'] || 'https://fnemsvwejymnqpufumhj.supabase.co';
  const serviceKey =
    process.env['SUPABASE_SERVICE_ROLE_KEY'] ||
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuZW1zdndlanltbnFwdWZ1bWhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIzNDY1NywiZXhwIjoyMTAyODEwNjU3fQ.WsvG5oRwqp7U04JnfiKmxIbnEnan1a0TqaY97vlhLVI';

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Query persistent biometric punches from Supabase att_biotime_events as an enterprise-grade cloud fallback
 */
export async function fetchBioTimeTransactionsFromSupabase(
  page: number = 1,
  pageSize: number = 20,
  startTime?: string,
  endTime?: string
): Promise<BioTimePaginatedLogs> {
  try {
    const supabase = await getSupabaseBackendClient();
    if (!supabase) {
      return {
        logs: serverLogs,
        total: serverLogs.length,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(serverLogs.length / pageSize)),
      };
    }

    let query = supabase.from('att_biotime_events').select('*', { count: 'exact' });

    if (startTime) {
      const startIso = parseBioTimePunchTime(startTime);
      query = query.gte('punch_time', startIso);
    }
    if (endTime) {
      const endIso = parseBioTimePunchTime(endTime);
      query = query.lte('punch_time', endIso);
    }

    const offset = Math.max(0, (page - 1) * pageSize);
    const { data: events, count, error } = await query
      .order('punch_time', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.warn('att_biotime_events query warning:', error.message);
      return {
        logs: serverLogs,
        total: serverLogs.length,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(serverLogs.length / pageSize)),
      };
    }

    const total = typeof count === 'number' ? count : (events?.length || 0);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    if (!events || events.length === 0) {
      return {
        logs: [],
        total: 0,
        page,
        pageSize,
        totalPages: 1,
      };
    }

    // Collect distinct employee codes in this page to enrich names
    const codes = Array.from(new Set(events.map((e: any) => String(e.biotime_emp_code).trim()).filter(Boolean)));
    const empNameMap = new Map<string, { name?: string; dept?: string }>();

    if (codes.length > 0) {
      const [{ data: maps }, { data: emps }] = await Promise.all([
        supabase.from('att_biotime_employee_map').select('biotime_emp_code, biotime_name, biotime_department, hub_employee_code').in('biotime_emp_code', codes),
        supabase.from('employees').select('code, name, department').in('code', codes),
      ]);

      (maps || []).forEach((m: any) => {
        if (m.biotime_emp_code) {
          empNameMap.set(String(m.biotime_emp_code).trim(), {
            name: m.biotime_name,
            dept: m.biotime_department,
          });
        }
      });

      (emps || []).forEach((e: any) => {
        if (e.code) {
          const existing = empNameMap.get(String(e.code).trim()) || {};
          empNameMap.set(String(e.code).trim(), {
            name: e.name || existing.name,
            dept: e.department || existing.dept,
          });
        }
      });
    }

    const dbLogs: BioTimePunchLog[] = events.map((item: any) => {
      const raw = typeof item.raw_payload === 'object' && item.raw_payload ? item.raw_payload : {};
      const bioCode = String(item.biotime_emp_code || '').trim();
      const enrichment = empNameMap.get(bioCode);

      const employeeName =
        raw.employeeName ||
        enrichment?.name ||
        (item.hub_employee_id ? `Employee (${bioCode})` : `Staff (${bioCode})`);

      const department =
        raw.department ||
        enrichment?.dept ||
        'General Staff';

      const punchIso = parseBioTimePunchTime(item.punch_time);

      return {
        id: item.id || `zk-tx-${item.biotime_emp_code}-${new Date(punchIso).getTime()}`,
        deviceSn: item.terminal_sn || 'VGU6251500095',
        deviceName: item.terminal_alias || item.area_alias || 'JAAGO Foundation HQ',
        locationBranch: item.area_alias || 'JAAGO Foundation HQ',
        employeeCode: bioCode,
        employeeName,
        department,
        punchTime: punchIso,
        punchState: item.punch_state === 'CHECK_OUT' ? 'CHECK_OUT' : 'CHECK_IN',
        verifyType: (item.verify_type as any) || 'Face',
        syncStatus: 'PROCESSED',
        createdAt: item.created_at || punchIso,
      };
    });

    serverLogs = dbLogs;
    return {
      logs: dbLogs,
      total,
      page,
      pageSize,
      totalPages,
    };
  } catch (err) {
    console.warn('att_biotime_events fallback notice:', err);
    return {
      logs: serverLogs,
      total: serverLogs.length,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(serverLogs.length / pageSize)),
    };
  }
}

/**
 * Fetch live paginated transactions from remote ZKTeco BioTime Server with optional date range,
 * automatically falling back to Supabase att_biotime_events if hardware is unreachable.
 */
export async function fetchLiveBioTimeTransactions(
  page: number = 1,
  pageSize: number = 20,
  startTime?: string,
  endTime?: string
): Promise<BioTimePaginatedLogs> {
  const serverUrl = getBioTimeServerUrl();
  const apiToken = getBioTimeApiToken();

  // 1. If API Token is present, attempt live fetch directly from ZKTeco BioTime master hardware
  if (apiToken) {
    try {
      let url = `${serverUrl}/iclock/api/transactions/?ordering=-punch_time&page=${page}&page_size=${pageSize}`;
      if (startTime) url += `&start_time=${encodeURIComponent(startTime)}`;
      if (endTime) url += `&end_time=${encodeURIComponent(endTime)}`;

      const res = await fetch(url, {
        headers: { 'Authorization': `Token ${apiToken}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(4000), // Quick timeout so fallback to Supabase is snappy
      });

      if (res.ok) {
        const json = await res.json();
        const total = typeof json.count === 'number' ? json.count : 0;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        if (!startTime && !endTime && total > 0) {
          serverConfig.totalSyncedToday = total;
        }

        if (Array.isArray(json.data) && json.data.length > 0) {
          const liveLogs: BioTimePunchLog[] = json.data.map((item: any) => ({
            id: `zk-tx-${item.id}`,
            deviceSn: item.terminal_sn || 'VGU6251500095',
            deviceName: item.terminal_alias || item.area_alias || 'JAAGO Foundation HQ',
            locationBranch: item.area_alias || 'JAAGO Foundation HQ',
            employeeCode: String(item.emp_code || item.emp || ''),
            employeeName: item.first_name ? `${item.first_name} ${item.last_name || ''}`.trim() : `Staff (${item.emp_code})`,
            department: item.department || 'General Staff',
            punchTime: parseBioTimePunchTime(item.punch_time),
            punchState: item.punch_state_display?.toUpperCase().includes('OUT') ? 'CHECK_OUT' : 'CHECK_IN',
            verifyType: (item.verify_type_display as any) || 'Face',
            syncStatus: 'PROCESSED',
            createdAt: parseBioTimePunchTime(item.upload_time || item.punch_time),
          }));
          serverLogs = liveLogs;
          return { logs: liveLogs, total, page, pageSize, totalPages };
        }
      }
    } catch {
      console.info('BioTime hardware unreachable directly from current host; using Supabase cloud store fallback.');
    }
  }

  // 2. Resilient Cloud Store Fallback (Supabase att_biotime_events)
  return fetchBioTimeTransactionsFromSupabase(page, pageSize, startTime, endTime);
}

/**
 * Fetch total personnel count from live BioTime API or Supabase employee records
 */
export async function fetchLiveBioTimePersonnelCount(): Promise<number> {
  const serverUrl = getBioTimeServerUrl();
  const apiToken = getBioTimeApiToken();

  if (apiToken) {
    try {
      const res = await fetch(`${serverUrl}/personnel/api/employees/?page=1&page_size=1`, {
        headers: { 'Authorization': `Token ${apiToken}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const json = await res.json();
        if (typeof json.count === 'number' && json.count > 0) {
          serverConfig.totalPersonnel = json.count;
          return json.count;
        }
      }
    } catch {
      // Fall through to database
    }
  }

  // Fallback to Supabase employees count
  try {
    const supabase = await getSupabaseBackendClient();
    if (supabase) {
      const { count } = await supabase.from('employees').select('*', { count: 'exact', head: true });
      if (typeof count === 'number' && count > 0) {
        serverConfig.totalPersonnel = count;
        return count;
      }
    }
  } catch {
    // Keep cached
  }

  return serverConfig.totalPersonnel || 0;
}

/**
 * Fetch today's real biometric punch count from live BioTime API or Supabase att_biotime_events
 */
export async function fetchLiveBioTimeTodayPunchCount(): Promise<number> {
  const serverUrl = getBioTimeServerUrl();
  const apiToken = getBioTimeApiToken();
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });

  if (apiToken) {
    try {
      const startTime = `${today} 00:00:00`;
      const endTime = `${today} 23:59:59`;
      const res = await fetch(
        `${serverUrl}/iclock/api/transactions/?page=1&page_size=1&start_time=${encodeURIComponent(startTime)}&end_time=${encodeURIComponent(endTime)}`,
        {
          headers: { 'Authorization': `Token ${apiToken}` },
          cache: 'no-store',
          signal: AbortSignal.timeout(3000),
        }
      );
      if (res.ok) {
        const json = await res.json();
        if (typeof json.count === 'number' && json.count > 0) {
          serverConfig.totalSyncedToday = json.count;
          return json.count;
        }
      }
    } catch {
      // Fall through to database
    }
  }

  // Fallback to Supabase att_biotime_events for today's Dhaka punches
  try {
    const supabase = await getSupabaseBackendClient();
    if (supabase) {
      const startIso = `${today}T00:00:00+06:00`;
      const endIso = `${today}T23:59:59+06:00`;
      const { count } = await supabase
        .from('att_biotime_events')
        .select('*', { count: 'exact', head: true })
        .gte('punch_time', new Date(startIso).toISOString())
        .lte('punch_time', new Date(endIso).toISOString());

      if (typeof count === 'number') {
        serverConfig.totalSyncedToday = count;
        return count;
      }
    }
  } catch {
    // Keep cached
  }

  return serverConfig.totalSyncedToday || 0;
}

export function getBioTimeDevices(): BioTimeDevice[] {
  return serverDevices;
}

export function saveBioTimeDevices(devices: BioTimeDevice[]): void {
  serverDevices = devices;
}

export function getBioTimeConfig(): BioTimeConfig {
  return serverConfig;
}

export function saveBioTimeConfig(config: BioTimeConfig): void {
  serverConfig = config;
}

export function getBioTimePunchLogs(): BioTimePunchLog[] {
  return serverLogs;
}

export function addBioTimePunchLog(log: BioTimePunchLog): void {
  serverLogs = [log, ...serverLogs.slice(0, 199)];
}
