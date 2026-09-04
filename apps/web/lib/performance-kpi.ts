'use client';

export type KPIStatus = 'Draft' | 'Submitted' | 'Approved' | 'Needs Revision';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';

export interface PerformanceKPI {
  id: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  period: string; // e.g., 'Q3 2026' or 'FY 2026-2027'
  title: string;
  category: 'Operational Excellence' | 'Project Delivery' | 'Community & Stakeholder Impact' | 'Innovation & Growth' | 'Leadership & Culture';
  description: string;
  targetMetric: string;
  currentProgress: number; // 0 - 100%
  weightage: number; // e.g. 20, 25%
  status: KPIStatus;
  supervisorName?: string | undefined;
  supervisorComments?: string | undefined;
  ratingScore?: number | undefined; // 1 to 5
  approvedAt?: string | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface KanbanTaskLog {
  id: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  kpiId?: string | undefined;
  kpiTitle?: string | undefined;
  title: string;
  description?: string | undefined;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  estimatedHours?: number | undefined;
  actualHours?: number | undefined;
  assignedBy?: string | undefined;
  tags?: string[] | undefined;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_KPIS: PerformanceKPI[] = [
  {
    id: 'kpi-1',
    employeeCode: 'FO032507061190',
    employeeName: 'Nasif Kamal',
    department: "Founder's Office / FC",
    period: 'Q3 2026',
    title: 'Platform Digital Transformation & Biometric Sync',
    category: 'Operational Excellence',
    description: 'Deliver realtime BioTime biometric device syncing across all 13 JAAGO regional branches with zero sync loss.',
    targetMetric: '100% device uptime & < 50ms sync latency',
    currentProgress: 95,
    weightage: 30,
    status: 'Approved',
    supervisorName: 'Korvi Rakshand (Founder & ED)',
    supervisorComments: 'Outstanding architecture and execution on biometric device integration.',
    ratingScore: 5,
    approvedAt: '2026-09-01T10:00:00Z',
    createdAt: '2026-07-01T09:00:00Z',
    updatedAt: '2026-09-04T12:00:00Z',
  },
  {
    id: 'kpi-2',
    employeeCode: 'FO032507061190',
    employeeName: 'Nasif Kamal',
    department: "Founder's Office / FC",
    period: 'Q3 2026',
    title: 'People & Culture Role-Based Access Control (RBAC)',
    category: 'Project Delivery',
    description: 'Implement granular RBAC permission matrix for DSP program scoped coordinators and departmental managers.',
    targetMetric: 'Complete module lockdown & automated policy audit',
    currentProgress: 100,
    weightage: 25,
    status: 'Approved',
    supervisorName: 'Korvi Rakshand (Founder & ED)',
    supervisorComments: 'RBAC guard and DSP scope restrictions fully certified.',
    ratingScore: 5,
    approvedAt: '2026-09-02T14:30:00Z',
    createdAt: '2026-07-01T09:00:00Z',
    updatedAt: '2026-09-04T12:00:00Z',
  },
  {
    id: 'kpi-3',
    employeeCode: 'FO032507061190',
    employeeName: 'Nasif Kamal',
    department: "Founder's Office / FC",
    period: 'Q3 2026',
    title: 'Sub-second Data Hydration & UI Smoothness',
    category: 'Innovation & Growth',
    description: 'Optimize page transitions and universal SWR caching across Attendance, Leaves, and Employee directories.',
    targetMetric: '0ms instant local paint & 100% build pass rate',
    currentProgress: 90,
    weightage: 25,
    status: 'Submitted',
    supervisorName: 'Korvi Rakshand (Founder & ED)',
    createdAt: '2026-07-01T09:00:00Z',
    updatedAt: '2026-09-04T12:00:00Z',
  },
  {
    id: 'kpi-4',
    employeeCode: 'FO032507061190',
    employeeName: 'Nasif Kamal',
    department: "Founder's Office / FC",
    period: 'Q3 2026',
    title: 'Departmental Collaboration & Team Analytics',
    category: 'Leadership & Culture',
    description: 'Launch unified My Team, Contacts Excel View, and Cross-department collaborative hubs.',
    targetMetric: 'Organization-wide rollout across all departments',
    currentProgress: 75,
    weightage: 20,
    status: 'Draft',
    createdAt: '2026-07-01T09:00:00Z',
    updatedAt: '2026-09-04T12:00:00Z',
  },
];

const DEFAULT_TASKS: KanbanTaskLog[] = [
  {
    id: 'task-1',
    employeeCode: 'FO032507061190',
    employeeName: 'Nasif Kamal',
    department: "Founder's Office / FC",
    kpiId: 'kpi-1',
    kpiTitle: 'Platform Digital Transformation & Biometric Sync',
    title: 'BioTime TCP Heartbeat Keepalive Monitor',
    description: 'Set up background socket daemon to maintain persistent sync with BioTime 8.5 cloud endpoints.',
    priority: 'High',
    status: 'done',
    dueDate: '2026-09-02',
    estimatedHours: 8,
    actualHours: 6.5,
    assignedBy: 'Korvi Rakshand',
    tags: ['BioTime', 'Backend', 'Critical'],
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-09-02T16:00:00Z',
  },
  {
    id: 'task-2',
    employeeCode: 'FO032507061190',
    employeeName: 'Nasif Kamal',
    department: "Founder's Office / FC",
    kpiId: 'kpi-2',
    kpiTitle: 'People & Culture Role-Based Access Control (RBAC)',
    title: 'DSP Scope Filter Verification across Attendance Logs',
    description: 'Ensure DSP scoped accounts can strictly view only Digital School Program staff records.',
    priority: 'Urgent',
    status: 'done',
    dueDate: '2026-09-03',
    estimatedHours: 6,
    actualHours: 5,
    assignedBy: 'Korvi Rakshand',
    tags: ['Security', 'RBAC', 'DSP'],
    createdAt: '2026-09-02T09:00:00Z',
    updatedAt: '2026-09-03T18:00:00Z',
  },
  {
    id: 'task-3',
    employeeCode: 'FO032507061190',
    employeeName: 'Nasif Kamal',
    department: "Founder's Office / FC",
    kpiId: 'kpi-3',
    kpiTitle: 'Sub-second Data Hydration & UI Smoothness',
    title: 'Route Transition Top Progress Indicator & SWR Cache',
    description: 'Integrate top glowing progress bar and promise deduplication on employee rosters.',
    priority: 'Medium',
    status: 'review',
    dueDate: '2026-09-05',
    estimatedHours: 4,
    actualHours: 3.5,
    assignedBy: 'Self',
    tags: ['Performance', 'Frontend'],
    createdAt: '2026-09-04T08:00:00Z',
    updatedAt: '2026-09-04T16:00:00Z',
  },
  {
    id: 'task-4',
    employeeCode: 'FO032507061190',
    employeeName: 'Nasif Kamal',
    department: "Founder's Office / FC",
    kpiId: 'kpi-4',
    kpiTitle: 'Departmental Collaboration & Team Analytics',
    title: 'Excel-style Contacts Directory with 1-Click Copy Phone',
    description: 'Build fast search table showing Name, Department, Mobile with copy icon, Work Email, Blood Group.',
    priority: 'High',
    status: 'in_progress',
    dueDate: '2026-09-06',
    estimatedHours: 5,
    actualHours: 2,
    assignedBy: 'Self',
    tags: ['Contacts', 'UI', 'Excel'],
    createdAt: '2026-09-04T10:00:00Z',
    updatedAt: '2026-09-04T18:00:00Z',
  },
  {
    id: 'task-5',
    employeeCode: 'FO032507061190',
    employeeName: 'Nasif Kamal',
    department: "Founder's Office / FC",
    kpiId: 'kpi-4',
    kpiTitle: 'Departmental Collaboration & Team Analytics',
    title: 'On-Leave Calendar Integration for Team Absence Tracking',
    description: 'Pull live approved leave records from Leave Calendar to show who is away today and this week.',
    priority: 'Medium',
    status: 'todo',
    dueDate: '2026-09-08',
    estimatedHours: 4,
    actualHours: 0,
    assignedBy: 'Korvi Rakshand',
    tags: ['Leaves', 'Calendar', 'Team'],
    createdAt: '2026-09-04T11:00:00Z',
    updatedAt: '2026-09-04T11:00:00Z',
  },
];

const STORAGE_KEY_KPIS = 'jaago_performance_kpis_v2';
const STORAGE_KEY_TASKS = 'jaago_performance_tasks_v2';

export function getLocalKPIs(empCode?: string): PerformanceKPI[] {
  if (typeof window === 'undefined') return DEFAULT_KPIS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_KPIS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        if (empCode) {
          const filtered = parsed.filter(
            (k: PerformanceKPI) => k.employeeCode?.toLowerCase() === empCode.toLowerCase()
          );
          return filtered.length > 0 ? filtered : parsed;
        }
        return parsed;
      }
    }
  } catch {}
  localStorage.setItem(STORAGE_KEY_KPIS, JSON.stringify(DEFAULT_KPIS));
  return DEFAULT_KPIS;
}

export function saveLocalKPI(kpi: PerformanceKPI): PerformanceKPI[] {
  const all = getLocalKPIs();
  const existingIdx = all.findIndex((k) => k.id === kpi.id);
  let updated: PerformanceKPI[];
  if (existingIdx >= 0) {
    updated = all.map((k) => (k.id === kpi.id ? { ...kpi, updatedAt: new Date().toISOString() } : k));
  } else {
    updated = [{ ...kpi, id: kpi.id || `kpi-${Date.now()}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...all];
  }
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_KPIS, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('jaago_kpi_updated', { detail: kpi }));
    } catch {}
  }
  return updated;
}

export function deleteLocalKPI(kpiId: string): PerformanceKPI[] {
  const all = getLocalKPIs();
  const updated = all.filter((k) => k.id !== kpiId);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_KPIS, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('jaago_kpi_updated', { detail: { id: kpiId, deleted: true } }));
    } catch {}
  }
  return updated;
}

export function getLocalTasks(empCode?: string): KanbanTaskLog[] {
  if (typeof window === 'undefined') return DEFAULT_TASKS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TASKS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        if (empCode) {
          const filtered = parsed.filter(
            (t: KanbanTaskLog) => t.employeeCode?.toLowerCase() === empCode.toLowerCase()
          );
          return filtered.length > 0 ? filtered : parsed;
        }
        return parsed;
      }
    }
  } catch {}
  localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(DEFAULT_TASKS));
  return DEFAULT_TASKS;
}

export function saveLocalTask(task: KanbanTaskLog): KanbanTaskLog[] {
  const all = getLocalTasks();
  const existingIdx = all.findIndex((t) => t.id === task.id);
  let updated: KanbanTaskLog[];
  if (existingIdx >= 0) {
    updated = all.map((t) => (t.id === task.id ? { ...task, updatedAt: new Date().toISOString() } : t));
  } else {
    updated = [{ ...task, id: task.id || `task-${Date.now()}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...all];
  }
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('jaago_task_updated', { detail: task }));
    } catch {}
  }
  return updated;
}

export function updateTaskStatus(taskId: string, newStatus: TaskStatus): KanbanTaskLog[] {
  const all = getLocalTasks();
  const updated = all.map((t) => (t.id === taskId ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t));
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('jaago_task_updated', { detail: { id: taskId, status: newStatus } }));
    } catch {}
  }
  return updated;
}

export function deleteLocalTask(taskId: string): KanbanTaskLog[] {
  const all = getLocalTasks();
  const updated = all.filter((t) => t.id !== taskId);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('jaago_task_updated', { detail: { id: taskId, deleted: true } }));
    } catch {}
  }
  return updated;
}
