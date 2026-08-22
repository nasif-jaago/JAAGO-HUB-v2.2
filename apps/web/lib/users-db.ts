export interface UserItem {
  id: string;
  fullName: string;
  email: string;
  role: string;
  department: string;
  branch: string;
  jobTitle: string;
  phone: string;
  status: string;
  employeeId: string | null;
  isEmployeeLinked: boolean;
  avatarUrl: string;
  createdAt: string;
  lastLoginAt: string | null;
}

export let usersDatabase: UserItem[] = [
  {
    id: 'u-101',
    fullName: 'Nasif Kamal',
    email: 'nasif.kamal@jaago.com.bd',
    role: 'Super Admin',
    department: "Founder's Office / FC",
    branch: 'Head Office (Banani)',
    jobTitle: 'Coordinator',
    phone: '+880 1711 000101',
    status: 'active',
    employeeId: 'JFT-2026-0417',
    isEmployeeLinked: true,
    avatarUrl: '',
    createdAt: '2026-01-15T08:30:00Z',
    lastLoginAt: '2026-08-22T09:05:00Z',
  },
  {
    id: 'u-102',
    fullName: 'Masoor Rahman',
    email: 'masoor.rahman@jaago.com.bd',
    role: 'Manager',
    department: 'Human Resources',
    branch: 'Head Office (Banani)',
    jobTitle: 'HR Manager',
    phone: '+880 1711 000102',
    status: 'active',
    employeeId: 'JFT-2026-0102',
    isEmployeeLinked: true,
    avatarUrl: '',
    createdAt: '2026-01-20T09:00:00Z',
    lastLoginAt: '2026-08-22T08:45:00Z',
  },
  {
    id: 'u-103',
    fullName: 'Farhana Islam',
    email: 'farhana.islam@jaago.com.bd',
    role: 'Coordinator',
    department: 'Education & Schools',
    branch: 'Rayer Bazar School',
    jobTitle: 'Education Coordinator',
    phone: '+880 1711 000103',
    status: 'active',
    employeeId: 'JFT-2026-0205',
    isEmployeeLinked: true,
    avatarUrl: '',
    createdAt: '2026-02-01T10:15:00Z',
    lastLoginAt: '2026-08-21T17:20:00Z',
  },
  {
    id: 'u-104',
    fullName: 'Habibur Rahman',
    email: 'habibur.rahman@jaago.com.bd',
    role: 'Officer',
    department: 'Admin & Procurement',
    branch: 'Head Office (Banani)',
    jobTitle: 'Senior Procurement Officer',
    phone: '+880 1711 000104',
    status: 'active',
    employeeId: 'JFT-2026-0312',
    isEmployeeLinked: true,
    avatarUrl: '',
    createdAt: '2026-02-15T11:00:00Z',
    lastLoginAt: '2026-08-22T07:50:00Z',
  },
  {
    id: 'u-105',
    fullName: 'Tariqul Ahmed',
    email: 'tariqul.ahmed@jaago.com.bd',
    role: 'Officer',
    department: 'Programs & Development',
    branch: 'Chittagong Campus',
    jobTitle: 'Field Officer',
    phone: '+880 1711 000105',
    status: 'invited',
    employeeId: null,
    isEmployeeLinked: false,
    avatarUrl: '',
    createdAt: '2026-08-10T14:30:00Z',
    lastLoginAt: null,
  },
  {
    id: 'u-106',
    fullName: 'Nabila Chowdhury',
    email: 'nabila.chowdhury@jaago.com.bd',
    role: 'Staff',
    department: 'Finance & Accounts',
    branch: 'Head Office (Banani)',
    jobTitle: 'Accounts Executive',
    phone: '+880 1711 000106',
    status: 'active',
    employeeId: 'JFT-2026-0489',
    isEmployeeLinked: true,
    avatarUrl: '',
    createdAt: '2026-03-01T09:30:00Z',
    lastLoginAt: '2026-08-22T08:15:00Z',
  },
  {
    id: 'u-107',
    fullName: 'Sadia Zaman',
    email: 'sadia.zaman@jaago.com.bd',
    role: 'Intern',
    department: "Founder's Office / FC",
    branch: 'Head Office (Banani)',
    jobTitle: 'Executive Intern',
    phone: '+880 1711 000107',
    status: 'invited',
    employeeId: null,
    isEmployeeLinked: false,
    avatarUrl: '',
    createdAt: '2026-08-18T16:00:00Z',
    lastLoginAt: null,
  },
  {
    id: 'u-108',
    fullName: 'Kazi Tanvir',
    email: 'kazi.tanvir@jaago.com.bd',
    role: 'Volunteer',
    department: 'Volunteer for Bangladesh (VBD)',
    branch: 'Bandarban Hub',
    jobTitle: 'Youth Leader',
    phone: '+880 1711 000108',
    status: 'suspended',
    employeeId: null,
    isEmployeeLinked: false,
    avatarUrl: '',
    createdAt: '2026-04-12T12:00:00Z',
    lastLoginAt: '2026-07-30T10:00:00Z',
  },
];

export function deleteUsersByIds(ids: string[]) {
  usersDatabase = usersDatabase.filter((u) => !ids.includes(u.id));
  return usersDatabase;
}
