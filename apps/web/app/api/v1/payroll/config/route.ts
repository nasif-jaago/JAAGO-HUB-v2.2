import { NextRequest, NextResponse } from 'next/server';
import { INITIAL_PAYROLL_CONFIG, PayrollConfig } from '@/lib/payroll-engine';

let inMemoryConfig: PayrollConfig = { ...INITIAL_PAYROLL_CONFIG };

export async function GET(_req: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      data: inMemoryConfig,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch payroll config' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid payroll configuration payload' },
        { status: 400 }
      );
    }

    inMemoryConfig = {
      ...inMemoryConfig,
      ...body,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: 'Payroll configuration updated successfully',
      data: inMemoryConfig,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update payroll config' },
      { status: 500 }
    );
  }
}
