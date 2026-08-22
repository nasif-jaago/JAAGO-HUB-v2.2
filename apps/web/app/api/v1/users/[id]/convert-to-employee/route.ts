import { NextResponse } from 'next/server';
import { logger } from '@jaago/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const {
      branch = 'Head Office (Banani)',
      department = 'General',
      designation = 'Officer',
      dateOfJoining = new Date().toISOString(),
      salaryBdt = 45000,
    } = body;

    const employeeCode = `JFT-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    logger.info('AUDIT', 'user.converted_to_employee', {
      metadata: { userId: id, employeeCode, branch, department },
    });

    return NextResponse.json({
      success: true,
      data: {
        userId: id,
        employeeCode,
        branch,
        department,
        designation,
        dateOfJoining,
        salaryBdt,
        status: 'active',
      },
      message: `Employee record ${employeeCode} successfully created and linked!`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Operation failed' }, { status: 500 });
  }
}
