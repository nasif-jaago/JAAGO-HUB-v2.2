import { NextResponse } from 'next/server';
import { logger } from '@jaago/logger';
import { getSupabaseAdminClient } from '@jaago/auth';
import { usersDatabase, deleteUsersByIds, UserItem } from '@/lib/users-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').toLowerCase().trim();
  const role = searchParams.get('role') || 'all';
  const status = searchParams.get('status') || 'all';
  const department = searchParams.get('department') || 'all';

  let allUsers: UserItem[] = [...usersDatabase];

  try {
    const supabaseAdmin = getSupabaseAdminClient();
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000,
    });

    if (!authError && authData?.users) {
      // Map Supabase Auth users
      const supabaseUserItems: UserItem[] = authData.users.map((su) => {
        const existingLocal = usersDatabase.find((u) => u.email.toLowerCase() === (su.email || '').toLowerCase());
        const meta = su.user_metadata || {};

        return {
          id: su.id,
          fullName: meta['full_name'] || meta['name'] || existingLocal?.fullName || su.email?.split('@')[0] || 'User',
          email: su.email || '',
          role: meta['role'] || existingLocal?.role || 'Staff',
          department: meta['department'] || existingLocal?.department || 'General',
          branch: meta['branch'] || existingLocal?.branch || 'Head Office (Banani)',
          jobTitle: meta['job_title'] || existingLocal?.jobTitle || 'Team Member',
          phone: meta['phone'] || su.phone || existingLocal?.phone || '',
          status: su.banned_until ? 'suspended' : su.email_confirmed_at ? 'active' : 'invited',
          employeeId: meta['employee_id'] || existingLocal?.employeeId || null,
          isEmployeeLinked: Boolean(meta['employee_id'] || existingLocal?.isEmployeeLinked),
          avatarUrl: meta['avatar_url'] || meta['picture'] || existingLocal?.avatarUrl || '',
          createdAt: su.created_at || existingLocal?.createdAt || new Date().toISOString(),
          lastLoginAt: su.last_sign_in_at || existingLocal?.lastLoginAt || null,
        };
      });

      // Merge Supabase users with local
      const seenEmails = new Set<string>();
      const merged: UserItem[] = [];

      for (const su of supabaseUserItems) {
        if (!seenEmails.has(su.email.toLowerCase())) {
          seenEmails.add(su.email.toLowerCase());
          merged.push(su);
        }
      }

      for (const u of usersDatabase) {
        if (!seenEmails.has(u.email.toLowerCase())) {
          seenEmails.add(u.email.toLowerCase());
          merged.push(u);
        }
      }

      allUsers = merged;
    }
  } catch (err: any) {
    logger.warn('AUTH', 'users.fetch_supabase_fallback', { metadata: { error: err?.message } });
  }

  let filtered = [...allUsers];

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
      totalActive: allUsers.filter((u) => u.status === 'active').length,
      totalInvited: allUsers.filter((u) => u.status === 'invited').length,
      totalEmployees: allUsers.filter((u) => u.isEmployeeLinked).length,
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
      password,
    } = body;

    if (!fullName || !email) {
      return NextResponse.json({ error: 'Full name and email are required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const employeeId = createEmployee ? `JFT-2026-${Math.floor(1000 + Math.random() * 9000)}` : null;
    const initialPassword = password || `Password@123`;

    let createdId = `u-${Date.now().toString().slice(-4)}`;

    try {
      const supabaseAdmin = getSupabaseAdminClient();
      const { data: supaUser, error: supaErr } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: initialPassword,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          name: fullName,
          role,
          department,
          branch,
          job_title: jobTitle,
          phone,
          employee_id: employeeId,
          organization_id: 'org-jaago-dhaka',
        },
      });

      if (supaErr) {
        // If user already exists in Supabase, update metadata
        if (supaErr.message.includes('already registered') || supaErr.message.includes('already exists')) {
          const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
          const match = userList?.users?.find((u) => u.email?.toLowerCase() === cleanEmail);
          if (match) {
            createdId = match.id;
            await supabaseAdmin.auth.admin.updateUserById(match.id, {
              user_metadata: {
                full_name: fullName,
                role,
                department,
                branch,
                job_title: jobTitle,
                phone,
                employee_id: employeeId,
              },
            });
          }
        } else {
          logger.warn('AUTH', 'user.create_supabase_failed', { metadata: { error: supaErr.message } });
        }
      } else if (supaUser?.user) {
        createdId = supaUser.user.id;
      }
    } catch (err: any) {
      logger.warn('AUTH', 'user.create_supabase_error', { metadata: { error: err?.message } });
    }

    const newUser: UserItem = {
      id: createdId,
      fullName,
      email: cleanEmail,
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

    logger.info('AUDIT', 'user.created', {
      metadata: { userId: createdId, email: cleanEmail, role, employeeId },
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
      return NextResponse.json({ error: 'No user IDs provided for deletion' }, { status: 400 });
    }

    deleteUsersByIds(ids);

    try {
      const supabaseAdmin = getSupabaseAdminClient();
      for (const id of ids) {
        if (id.includes('-') && id.length > 20) {
          // UUID format -> delete from Supabase Auth
          await supabaseAdmin.auth.admin.deleteUser(id);
        }
      }
    } catch (err: any) {
      logger.warn('AUTH', 'users.delete_supabase_error', { metadata: { error: err?.message } });
    }

    logger.info('AUDIT', 'users.deleted', {
      metadata: { userIds: ids, count: ids.length },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${ids.length} user account(s).`,
      deletedIds: ids,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Bulk delete operation failed' }, { status: 500 });
  }
}
