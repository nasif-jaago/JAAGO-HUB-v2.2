import { NextResponse } from 'next/server';
import { logger } from '@jaago/logger';
import { linkUserToEmployee } from '@/lib/users-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, employeeCode } = body;

    if (!userId || !employeeCode) {
      return NextResponse.json({ error: 'userId and employeeCode are required' }, { status: 400 });
    }

    linkUserToEmployee(userId, employeeCode);

    logger.info('AUDIT', 'user.linked_to_employee', {
      metadata: { userId, employeeCode },
    });

    return NextResponse.json({
      success: true,
      message: `User ${userId} successfully linked to employee ${employeeCode}.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Linking failed' }, { status: 500 });
  }
}
