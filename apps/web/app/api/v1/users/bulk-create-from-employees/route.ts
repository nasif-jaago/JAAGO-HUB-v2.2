import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@jaago/auth';
import { logger } from '@jaago/logger';
import { sendEmail } from '@/lib/email-service';
import { addUserFromEmployee } from '@/lib/users-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface BulkInviteEmployeeItem {
  id?: string;
  name: string;
  code?: string;
  employeeCode?: string;
  workEmail?: string;
  email?: string;
  personalEmail?: string;
  department?: string;
  designation?: string;
  branch?: string;
  organization?: string;
}

/**
 * POST /api/v1/users/bulk-create-from-employees
 * Accepts a list of employees, provisions Supabase Auth user accounts,
 * generates strong credentials, updates employees table (is_user: true),
 * and dispatches the official pnc.employee_welcome invite email to work_email.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { employees } = body as { employees: BulkInviteEmployeeItem[] };

    if (!Array.isArray(employees) || employees.length === 0) {
      return NextResponse.json({ success: false, error: 'No employees provided for invitation' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdminClient();
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: 'Supabase client unavailable' }, { status: 500 });
    }

    // Resolve base origin for login URL
    const originHeader = request.headers.get('origin');
    const hostHeader = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const protoHeader = request.headers.get('x-forwarded-proto') || 'https';
    let baseOrigin = 'https://hub.jaago.com.bd';

    if (originHeader && !originHeader.includes('undefined')) {
      baseOrigin = originHeader;
    } else if (hostHeader) {
      baseOrigin = `${protoHeader}://${hostHeader}`;
    } else if (process.env.NEXT_PUBLIC_APP_URL) {
      baseOrigin = process.env.NEXT_PUBLIC_APP_URL;
    }

    const results: Array<{
      name: string;
      email: string;
      code: string;
      success: boolean;
      userId?: string;
      error?: string;
      emailStatus?: string;
      logId?: string;
    }> = [];

    for (const emp of employees) {
      const name = emp.name;
      const code = emp.code || emp.employeeCode || '';
      let targetEmail = (emp.workEmail || emp.email || '').trim().toLowerCase();

      // Normalize or generate work email if not set
      if (!targetEmail || !targetEmail.includes('@')) {
        const sanitized = name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '.')
          .replace(/\.+/g, '.')
          .replace(/^\.|\.$/g, '');
        targetEmail = `${sanitized || 'employee'}@jaago.com.bd`;
      }

      // Generate random temporary password
      const randPart = Math.random().toString(36).substring(2, 6).toUpperCase();
      const randNum = Math.floor(100 + Math.random() * 900);
      const tempPassword = `Jaago@2026!${randPart}${randNum}`;
      const loginUrl = `${baseOrigin.replace(/\/$/, '')}/login?email=${encodeURIComponent(targetEmail)}`;

      let userId = '';
      let errorReason = '';

      try {
        // 1. Provision Supabase Auth User
        const { data: supaUser, error: supaErr } = await supabaseAdmin.auth.admin.createUser({
          email: targetEmail,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            full_name: name,
            name: name,
            role: 'Officer',
            department: emp.department || 'General',
            branch: emp.branch || 'Head Office (Banani)',
            job_title: emp.designation || 'Staff Member',
            employee_code: code,
            employee_id: code,
            organization_id: 'org-jaago-dhaka',
          },
        });

        if (supaErr) {
          if (supaErr.message.includes('already registered') || supaErr.message.includes('already exists')) {
            const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
            const match = userList?.users?.find((u) => u.email?.toLowerCase() === targetEmail);
            if (match) {
              userId = match.id;
              await supabaseAdmin.auth.admin.updateUserById(match.id, {
                password: tempPassword,
                user_metadata: {
                  full_name: name,
                  department: emp.department || match.user_metadata?.department || 'General',
                  job_title: emp.designation || match.user_metadata?.job_title || 'Staff Member',
                  employee_code: code,
                  branch: emp.branch || match.user_metadata?.branch || 'Head Office (Banani)',
                },
              });
            } else {
              errorReason = supaErr.message;
            }
          } else {
            errorReason = supaErr.message;
          }
        } else if (supaUser?.user) {
          userId = supaUser.user.id;
        }

        if (userId) {
          // 2. Mark employee record in public.employees as active user
          if (emp.id) {
            await supabaseAdmin
              .from('employees')
              .update({ is_user: true, user_id: userId, updated_at: new Date().toISOString() })
              .eq('id', emp.id);
          } else if (code) {
            await supabaseAdmin
              .from('employees')
              .update({ is_user: true, user_id: userId, updated_at: new Date().toISOString() })
              .eq('code', code);
          } else {
            await supabaseAdmin
              .from('employees')
              .update({ is_user: true, user_id: userId, updated_at: new Date().toISOString() })
              .eq('work_email', targetEmail);
          }

          // 3. Add to memory cache
          addUserFromEmployee({
            fullName: name,
            email: targetEmail,
            department: emp.department || 'General',
            jobTitle: emp.designation || 'Staff Member',
            employeeId: code,
            branch: emp.branch || 'Head Office (Banani)',
          });

          // 4. Send official welcome invite email via Central Email Pipeline
          const emailSendResult = await sendEmail({
            templateKey: 'pnc.employee_welcome',
            to: targetEmail,
            cc: emp.personalEmail,
            variables: {
              employeeName: name,
              employeeCode: code || 'N/A',
              designation: emp.designation || 'Staff Member',
              department: emp.department || 'General',
              workEmail: targetEmail,
              tempPassword,
              loginUrl,
            },
            module: 'pnc',
            relatedEntity: { type: 'employee', id: code || userId },
          });

          results.push({
            name,
            email: targetEmail,
            code,
            success: true,
            userId,
            emailStatus: emailSendResult.status,
            logId: emailSendResult.logId,
          });

          logger.info('AUDIT', 'employee.user_provisioned_and_invited', {
            metadata: { name, email: targetEmail, code, userId, emailStatus: emailSendResult.status },
          });
        } else {
          results.push({
            name,
            email: targetEmail,
            code,
            success: false,
            error: errorReason || 'Failed to create Supabase Auth user',
          });
        }
      } catch (err: any) {
        results.push({
          name,
          email: targetEmail,
          code,
          success: false,
          error: err?.message || 'Unexpected invitation error',
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      total: employees.length,
      successful: successCount,
      failed: failedCount,
      results,
      message: `Successfully provisioned & sent invites to ${successCount} employee(s)${failedCount > 0 ? ` (${failedCount} failed)` : ''}.`,
    });
  } catch (err: any) {
    logger.error('SYSTEM', 'bulk_invite_employees.failed', { metadata: { error: err?.message } });
    return NextResponse.json({ success: false, error: err?.message || 'Bulk invite process failed' }, { status: 500 });
  }
}
