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
  apiToken: process.env.BIOTIME_API_TOKEN || 'bdb2bffa3748e8aa85fc43bcdc1e51690f89eb20',
  autoSyncEnabled: true,
  syncIntervalMinutes: 5,
  lastSyncTime: new Date().toISOString(),
  lastSyncStatus: 'SUCCESS',
  totalSyncedToday: 20472,
  totalPersonnel: 148,
  webhookUrl: 'https://hub.jaago.com.bd/api/v1/biotime/push',
  companyCode: 'JAAGO_BD',
  autoCreateAttendanceRecords: true,
};

let serverDevices: BioTimeDevice[] = [];
let serverConfig: BioTimeConfig = { ...INITIAL_BIOTIME_CONFIG };
let serverLogs: BioTimePunchLog[] = [];

/**
 * Fetch live devices from remote ZKTeco BioTime Server (http://182.160.105.162:4390)
 */
export async function fetchLiveBioTimeDevices(): Promise<BioTimeDevice[]> {
  const serverUrl = process.env.BIOTIME_SERVER_URL || 'http://182.160.105.162:4390';
  const apiToken = process.env.BIOTIME_API_TOKEN || 'bdb2bffa3748e8aa85fc43bcdc1e51690f89eb20';

  try {
    const res = await fetch(`${serverUrl}/iclock/api/terminals/`, {
      headers: { 'Authorization': `Token ${apiToken}` },
      cache: 'no-store',
    });

    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.data) && json.data.length > 0) {
        const liveDevices: BioTimeDevice[] = json.data.map((item: any) => ({
          id: `bio-dev-${item.id || item.sn}`,
          name: item.alias || item.terminal_name || `Terminal ${item.sn}`,
          serialNumber: item.sn,
          ipAddress: item.ip_address || '192.168.1.1',
          port: 4370,
          locationBranch: item.area_name || item.area?.area_name || 'Banani HQ (Dhaka)',
          deviceType: item.face_count > 0 ? 'Face Recognition' : 'Fingerprint Scanner',
          protocol: item.push_ver?.includes('Push') ? 'ZKTeco Push SDK' : 'ADMS Protocol',
          status: 'ONLINE',
          lastHeartbeat: item.last_activity || new Date().toISOString(),
          pingLatencyMs: Math.floor(Math.random() * 20) + 12,
          totalUsers: Number(item.user_count || 0),
          totalPunches: Number(item.transaction_count || 0),
          firmwareVersion: item.fw_ver || 'Ver 8.2.4',
          isActive: true,
        }));
        serverDevices = liveDevices;
        return liveDevices;
      }
    }
  } catch (err) {
    console.warn('BioTime live device fetch notice:', err);
  }

  return serverDevices;
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
  const serverUrl = process.env.BIOTIME_SERVER_URL || 'http://182.160.105.162:4390';
  const apiToken = process.env.BIOTIME_API_TOKEN || 'bdb2bffa3748e8aa85fc43bcdc1e51690f89eb20';

  try {
    let url = `${serverUrl}/iclock/api/transactions/?ordering=-punch_time&page=${page}&page_size=${pageSize}`;
    if (startTime) url += `&start_time=${encodeURIComponent(startTime)}`;
    if (endTime) url += `&end_time=${encodeURIComponent(endTime)}`;

    const res = await fetch(url, {
      headers: { 'Authorization': `Token ${apiToken}` },
      cache: 'no-store',
    });

    if (res.ok) {
      const json = await res.json();
      const total = typeof json.count === 'number' ? json.count : 20472;
      const totalPages = Math.ceil(total / pageSize);
      serverConfig.totalSyncedToday = total;

      if (Array.isArray(json.data)) {
        const liveLogs: BioTimePunchLog[] = json.data.map((item: any) => ({
          id: `zk-tx-${item.id}`,
          deviceSn: item.terminal_sn || 'VGU6251500095',
          deviceName: item.terminal_alias || item.area_alias || 'JAAGO Foundation HQ',
          locationBranch: item.area_alias || 'JAAGO Foundation HQ',
          employeeCode: String(item.emp_code || item.emp || ''),
          employeeName: item.first_name ? `${item.first_name} ${item.last_name || ''}`.trim() : `Staff (${item.emp_code})`,
          department: item.department || 'General Staff',
          punchTime: item.punch_time ? new Date(item.punch_time).toISOString() : new Date().toISOString(),
          punchState: item.punch_state_display?.toUpperCase().includes('OUT') ? 'CHECK_OUT' : 'CHECK_IN',
          verifyType: (item.verify_type_display as any) || 'Face',
          syncStatus: 'PROCESSED',
          createdAt: item.upload_time ? new Date(item.upload_time).toISOString() : new Date().toISOString(),
        }));
        serverLogs = liveLogs;
        return { logs: liveLogs, total, page, pageSize, totalPages };
      }
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
  const serverUrl = process.env.BIOTIME_SERVER_URL || 'http://182.160.105.162:4390';
  const apiToken = process.env.BIOTIME_API_TOKEN || 'bdb2bffa3748e8aa85fc43bcdc1e51690f89eb20';

  try {
    const res = await fetch(`${serverUrl}/personnel/api/employees/?page=1&page_size=1`, {
      headers: { 'Authorization': `Token ${apiToken}` },
      cache: 'no-store',
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
  return serverConfig.totalPersonnel || 148;
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
