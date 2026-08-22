import { NextResponse } from 'next/server';
import { createApiHandler } from '@jaago/authz';
import { logger } from '@jaago/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// In-memory tenant user registry with comprehensive defaults for instant responsiveness
let usersDatabase = [
  {
    id: 'u-101',
    fullName: 'Nasif Kamal',
    email: 'nasif.kamal@jaago.com.bd',
    role: 'Super Admin',
    department: 'Founder\'s Office / FC',
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
    department: 'Founder\'s Office / FC',
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').toLowerCase().trim();
  const role = searchParams.get('role') || 'all';
  const status = searchParams.get('status') || 'all';
  const department = searchParams.get('department') || 'all';

  let filtered = [...usersDatabase];

  if (q) {
    filtered = filtered.filter(
      (u) =>
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.jobTitle.toLowerCase().includes(q) ||
        (u.employeeId && u.employeeId.toLowerCase().includes(q))
    );
  }

  if (role !== 'all') {
    filtered = filtered.filter((u) => u.role.toLowerCase() === role.toLowerCase());
  }

  if (status !== 'all') {
    filtered = filtered.filter((u) => u.status.toLowerCase() === status.toLowerCase());
  }

  if (department !== 'all') {
    filtered = filtered.filter((u) => u.department.toLowerCase().includes(department.toLowerCase()));
  }

  return NextResponse.json({
    data: filtered,
    meta: {
      total: filtered.length,
      totalActive: usersDatabase.filter((u) => u.status === 'active').length,
      totalInvited: usersDatabase.filter((u) => u.status === 'invited').length,
      totalEmployees: usersDatabase.filter((u) => u.isEmployeeLinked).length,
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      fullName,
      email,
      role = 'Staff',
      department = 'General',
      branch = 'Head Office (Banani)',
      jobTitle = 'Staff Member',
      phone = '',
      createEmployee = false,
    } = body;

    if (!fullName || !email) {
      return NextResponse.json({ error: 'Full name and email are required' }, { status: 400 });
    }

    const existing = usersDatabase.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
    }

    const newId = `u-${Date.now().toString().slice(-4)}`;
    const employeeId = createEmployee ? `JFT-2026-${Math.floor(1000 + Math.random() * 9000)}` : null;

    const newUser = {
      id: newId,
      fullName,
      email,
      role,
      department,
      branch,
      jobTitle,
      phone,
      status: 'active',
      employeeId,
      isEmployeeLinked: Boolean(employeeId),
      avatarUrl: '',
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
    };

    usersDatabase.unshift(newUser);

    logger.info('AUDIT', 'user.created_manually', {
      metadata: { userId: newId, email, role, employeeId },
    });

    return NextResponse.json({ data: newUser, success: true }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
