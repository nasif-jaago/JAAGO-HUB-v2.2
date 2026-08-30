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

  let allUsers: UserItem[] = [];

  try {
    const supabaseAdmin = getSupabaseAdminClient();

    // 1. Fetch live Supabase Auth users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000,
    });

    // 2. Fetch live employees from Supabase database to cross-reference linked profiles
    const { data: empData } = await supabaseAdmin
      .from('employees')
      .select('id, code, name, work_email, personal_email, designation, department, branch, avatar_url, status');

    const employees = empData || [];

    if (!authError && authData?.users) {
      const supabaseUserItems: UserItem[] = authData.users.map((su) => {
        const meta = su.user_metadata || {};
        const emailLower = (su.email || '').toLowerCase().trim();

        // Cross-reference with live public.employees table
        const matchingEmp = employees.find(
          (e) =>
            (e.work_email && e.work_email.toLowerCase().trim() === emailLower) ||
            (e.personal_email && e.personal_email.toLowerCase().trim() === emailLower) ||
            (meta['employee_code'] && e.code === meta['employee_code']) ||
            (meta['employee_id'] && e.code === meta['employee_id'])
        );

        const linkedCode = matchingEmp?.code || meta['employee_code'] || meta['employee_id'] || null;
        const isLinked = Boolean(linkedCode || matchingEmp);

        return {
          id: su.id,
          fullName: matchingEmp?.name || meta['full_name'] || meta['name'] || su.email?.split('@')[0] || 'User',
          email: su.email || '',
          role: meta['role'] || 'Staff',
          department: matchingEmp?.department || meta['department'] || 'General',
          branch: matchingEmp?.branch || meta['branch'] || 'Head Office (Banani)',
          jobTitle: matchingEmp?.designation || meta['job_title'] || 'Team Member',
          phone: meta['phone'] || su.phone || '',
          status: su.banned_until ? 'suspended' : 'active',
          employeeId: linkedCode,
          isEmployeeLinked: isLinked,
          avatarUrl: matchingEmp?.avatar_url || meta['avatar_url'] || meta['picture'] || '',
          createdAt: su.created_at || new Date().toISOString(),
          lastLoginAt: su.last_sign_in_at || null,
        };
      });

      const seenEmails = new Set<string>();
      const merged: UserItem[] = [];

      for (const su of supabaseUserItems) {
        if (!seenEmails.has(su.email.toLowerCase())) {
          seenEmails.add(su.email.toLowerCase());
          merged.push(su);
        }
      }

      // Add any non-duplicate active memory users
      for (const u of usersDatabase) {
        if (!seenEmails.has(u.email.toLowerCase())) {
          seenEmails.add(u.email.toLowerCase());
          merged.push(u);
        }
      }

      allUsers = merged;
    } else {
      allUsers = [...usersDatabase];
    }
  } catch (err: any) {
    logger.warn('SYSTEM', 'users.fetch_supabase_error', { metadata: { error: err?.message } });
    allUsers = [...usersDatabase];
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
          employee_code: employeeId,
          organization_id: 'org-jaago-dhaka',
        },
      });

      if (supaErr) {
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
                employee_code: employeeId,
              },
            });
          }
        } else {
          logger.warn('SYSTEM', 'user.create_supabase_failed', { metadata: { error: supaErr.message } });
        }
      } else if (supaUser?.user) {
        createdId = supaUser.user.id;
      }
    } catch (err: any) {
      logger.warn('SYSTEM', 'user.create_supabase_error', { metadata: { error: err?.message } });
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
        await supabaseAdmin.auth.admin.deleteUser(id);
      }

      // Clear is_user flag on all linked employee records
      await supabaseAdmin
        .from('employees')
        .update({ is_user: false, user_id: null, updated_at: new Date().toISOString() })
        .in('user_id', ids);

    } catch (err: any) {
      logger.warn('SYSTEM', 'users.delete_supabase_error', { metadata: { error: err?.message } });
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
