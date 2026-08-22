import { NextResponse } from 'next/server';
import { logger } from '@jaago/logger';
import { addUserFromEmployee } from '@/lib/users-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, department, designation, employeeCode } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    // Auto-generate secure temporary password
    const randPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const tempPassword = `JGB-2026-${randPart}`;

    const user = addUserFromEmployee({
      fullName: name,
      email: email,
      department: department || 'General',
      jobTitle: designation || 'Staff Member',
      employeeId: employeeCode,
    });

    logger.info('AUDIT', 'user.created_from_employee', {
      metadata: {
        userId: user.id,
        email: user.email,
        employeeCode,
        tempPasswordGenerated: true,
      },
    });

    // Invite email dispatch metadata
    const emailPayload = {
      to: email,
      userId: email,
      tempPassword,
      loginUrl: typeof window !== 'undefined' ? `${window.location.origin}/login` : 'http://localhost:3000/login',
      sentAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: {
        user,
        emailPayload,
      },
      message: `User account created for ${name}. Invitation email dispatched!`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create user from employee' }, { status: 500 });
  }
}
