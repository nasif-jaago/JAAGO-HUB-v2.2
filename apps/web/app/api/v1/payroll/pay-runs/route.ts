import { NextRequest, NextResponse } from 'next/server';
import { PayRun } from '@/lib/payroll-engine';

let inMemoryPayRuns: PayRun[] = [];

export async function GET(_req: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      data: inMemoryPayRuns,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch pay runs' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || !body.id) {
      return NextResponse.json(
        { success: false, error: 'Invalid pay run payload' },
        { status: 400 }
      );
    }

    const index = inMemoryPayRuns.findIndex((r) => r.id === body.id);
    if (index >= 0) {
      inMemoryPayRuns[index] = body;
    } else {
      inMemoryPayRuns.unshift(body);
    }

    return NextResponse.json({
      success: true,
      message: 'Pay run saved successfully',
      data: body,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to save pay run' },
      { status: 500 }
    );
  }
}
