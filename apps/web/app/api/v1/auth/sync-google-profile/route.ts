import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-auth';
import { logger } from '@jaago/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Synchronizes Google OAuth profile picture automatically into Supabase
 * (both public.employees table and auth.users user_metadata).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, email, avatarUrl, fullName } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Missing email' },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const supabaseAdmin = getSupabaseAdmin();

    // 1. Check/Update public.employees table in Supabase
    const updatePayload: Record<string, any> = {};
    if (avatarUrl) updatePayload.avatar_url = avatarUrl;
    if (userId) updatePayload.user_id = userId;

    let targetEmployee: any = null;

    if (Object.keys(updatePayload).length > 0) {
      const { data: updatedEmps, error: empError } = await supabaseAdmin
        .from('employees')
        .update(updatePayload)
        .or(`work_email.ilike.${cleanEmail},personal_email.ilike.${cleanEmail}${userId ? `,user_id.eq.${userId}` : ''}`)
        .select('*');

      if (empError) {
        logger.warn('SYSTEM', 'auth.sync_google_profile_emp_error', {
          metadata: { error: empError.message, email: cleanEmail },
        });
      }

      if (updatedEmps && updatedEmps.length > 0) {
        targetEmployee = updatedEmps[0];
      }
    }

    // If not updated, check if employee already exists without requiring update
    if (!targetEmployee) {
      const { data: existingEmps } = await supabaseAdmin
        .from('employees')
        .select('*')
        .or(`work_email.ilike.${cleanEmail},personal_email.ilike.${cleanEmail}${userId ? `,user_id.eq.${userId}` : ''}`)
        .limit(1);

      if (existingEmps && existingEmps.length > 0) {
        targetEmployee = existingEmps[0];
      }
    }

    // If this is an upcoming new user who doesn't have an employee record yet, auto-provision one
    if (!targetEmployee) {
      const resolvedName =
        fullName ||
        cleanEmail
          .split('@')[0]
          .replace(/[._]/g, ' ')
          .replace(/\b\w/g, (c: string) => c.toUpperCase()) ||
        'Staff Member';

      // Generate unique employee code with collision prevention
      let autoCode = '';
      for (let attempt = 0; attempt < 5; attempt++) {
        const codeSeq = Math.floor(1000 + Math.random() * 9000);
        const testCode = `JFT-${new Date().getFullYear()}-${codeSeq}`;
        const { data: codeCheck } = await supabaseAdmin
          .from('employees')
          .select('id')
          .eq('code', testCode)
          .maybeSingle();
        if (!codeCheck) {
          autoCode = testCode;
          break;
        }
      }
      if (!autoCode) {
        autoCode = `JFT-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
      }

      const { data: insertedEmp, error: insertErr } = await supabaseAdmin
        .from('employees')
        .insert({
          code: autoCode,
          name: resolvedName,
          work_email: cleanEmail,
          personal_email: cleanEmail,
          avatar_url: avatarUrl || null,
          user_id: userId || null,
          designation: 'Staff Member',
          department: 'General',
          organization: 'JAAGO Foundation Trust',
          branch: 'Head Office (Banani)',
          status: 'active',
          is_user: true,
        })
        .select('*')
        .single();

      if (insertErr) {
        logger.warn('SYSTEM', 'auth.sync_google_profile_insert_error', {
          metadata: { error: insertErr.message, email: cleanEmail },
        });
      } else {
        targetEmployee = insertedEmp;
      }
    }

    // 2. Also ensure auth.users user_metadata has the avatarUrl and picture
    if (userId) {
      try {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (userData?.user) {
          const currentMeta = userData.user.user_metadata || {};
          const metaUpdates: Record<string, any> = { ...currentMeta };
          if (avatarUrl) {
            metaUpdates.avatar_url = avatarUrl;
            metaUpdates.picture = avatarUrl;
          }
          if (fullName && !currentMeta.full_name) {
            metaUpdates.full_name = fullName;
            metaUpdates.name = fullName;
          }
          if (targetEmployee?.code && !currentMeta.employee_code) {
            metaUpdates.employee_code = targetEmployee.code;
          }

          await supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: metaUpdates,
          });
        }
      } catch (authMetaErr: any) {
        logger.warn('SYSTEM', 'auth.sync_google_profile_meta_error', {
          metadata: { error: authMetaErr?.message, userId },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        avatarUrl: targetEmployee?.avatar_url || avatarUrl || null,
        employee: targetEmployee,
      },
    });
  } catch (err: any) {
    logger.error('SYSTEM', 'auth.sync_google_profile_error', {
      metadata: { error: err?.message },
    });
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
