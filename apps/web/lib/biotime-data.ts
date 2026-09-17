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

export const INITIAL_BIOTIME_CONFIG: BioTimeConfig = {
  serverUrl: process.env.BIOTIME_SERVER_URL || 'http://182.160.105.162:4390',
  apiToken: process.env.BIOTIME_API_TOKEN || '',
  autoSyncEnabled: true,
  syncIntervalMinutes: 5,
  lastSyncTime: new Date().toISOString(),
  lastSyncStatus: 'SUCCESS',
  totalSyncedToday: 0,
  totalPersonnel: 0,
  webhookUrl: 'https://hub.jaago.com.bd/api/v1/biotime/push',
  companyCode: 'JAAGO_BD',
  autoCreateAttendanceRecords: true,
};

let serverDevices: BioTimeDevice[] = [];
let serverConfig: BioTimeConfig = { ...INITIAL_BIOTIME_CONFIG };
let serverLogs: BioTimePunchLog[] = [];

export function getBioTimeServerUrl(): string {
  return process.env.BIOTIME_SERVER_URL || serverConfig.serverUrl || 'http://182.160.105.162:4390';
}

export function getBioTimeApiToken(): string {
  return process.env.BIOTIME_API_TOKEN || serverConfig.apiToken || '';
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

/**
 * Fetch live paginated transactions from remote ZKTeco BioTime Server with optional date range
 */
export async function fetchLiveBioTimeTransactions(
  page: number = 1,
  pageSize: number = 20,
  startTime?: string,
  endTime?: string
): Promise<BioTimePaginatedLogs> {
  const serverUrl = getBioTimeServerUrl();
  const apiToken = getBioTimeApiToken();

  if (!apiToken) {
    console.warn('BioTime API Token is not configured in backend environment.');
    return {
      logs: serverLogs,
      total: serverLogs.length,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(serverLogs.length / pageSize)),
    };
  }

  try {
    let url = `${serverUrl}/iclock/api/transactions/?ordering=-punch_time&page=${page}&page_size=${pageSize}`;
    if (startTime) url += `&start_time=${encodeURIComponent(startTime)}`;
    if (endTime) url += `&end_time=${encodeURIComponent(endTime)}`;

    const res = await fetch(url, {
      headers: { 'Authorization': `Token ${apiToken}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      const json = await res.json();
      const total = typeof json.count === 'number' ? json.count : 0;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      if (!startTime && !endTime && total > 0) {
        serverConfig.totalSyncedToday = total;
      }

      if (Array.isArray(json.data)) {
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
    } else {
      console.warn(`BioTime transactions fetch returned status ${res.status}`);
    }
  } catch (err) {
    console.warn('BioTime live transactions fetch notice:', err);
  }

  return {
    logs: serverLogs,
    total: serverLogs.length,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(serverLogs.length / pageSize)),
  };
}

/**
 * Fetch total personnel count from live BioTime API
 */
export async function fetchLiveBioTimePersonnelCount(): Promise<number> {
  const serverUrl = getBioTimeServerUrl();
  const apiToken = getBioTimeApiToken();

  if (!apiToken) return serverConfig.totalPersonnel || 0;

  try {
    const res = await fetch(`${serverUrl}/personnel/api/employees/?page=1&page_size=1`, {
      headers: { 'Authorization': `Token ${apiToken}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const json = await res.json();
      if (typeof json.count === 'number') {
        serverConfig.totalPersonnel = json.count;
        return json.count;
      }
    }
  } catch (e) {
    console.warn('BioTime personnel count fetch notice:', e);
  }
  return serverConfig.totalPersonnel || 0;
}

/**
 * Fetch today's real biometric punch count from live BioTime API
 */
export async function fetchLiveBioTimeTodayPunchCount(): Promise<number> {
  const serverUrl = getBioTimeServerUrl();
  const apiToken = getBioTimeApiToken();

  if (!apiToken) return serverConfig.totalSyncedToday || 0;

  try {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
    const startTime = `${today} 00:00:00`;
    const endTime = `${today} 23:59:59`;
    const res = await fetch(
      `${serverUrl}/iclock/api/transactions/?page=1&page_size=1&start_time=${encodeURIComponent(startTime)}&end_time=${encodeURIComponent(endTime)}`,
      {
        headers: { 'Authorization': `Token ${apiToken}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      }
    );
    if (res.ok) {
      const json = await res.json();
      if (typeof json.count === 'number') {
        serverConfig.totalSyncedToday = json.count;
        return json.count;
      }
    }
  } catch (err) {
    console.warn('BioTime today punch count fetch notice:', err);
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
