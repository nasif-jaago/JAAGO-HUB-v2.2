import { NextResponse } from 'next/server';
import { logger } from '@jaago/logger';
import { usersDatabase, deleteUsersByIds } from '@/lib/users-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { ids } = body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No user IDs provided for hard deletion' }, { status: 400 });
    }

    deleteUsersByIds(ids);

    logger.info('AUDIT', 'users.hard_deleted', {
      metadata: { userIds: ids, count: ids.length },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully hard deleted ${ids.length} user account(s) permanently.`,
      deletedIds: ids,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Bulk delete operation failed' }, { status: 500 });
  }
}
