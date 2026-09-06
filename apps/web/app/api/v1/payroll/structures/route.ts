import { NextRequest, NextResponse } from 'next/server';
import {
  DEFAULT_SALARY_STRUCTURES,
  SalaryStructureDefinition,
} from '@/lib/payroll-engine';

// In-memory fallback / cache for API route parity
let cachedStructures: SalaryStructureDefinition[] = [...DEFAULT_SALARY_STRUCTURES];

export async function GET() {
  return NextResponse.json({
    success: true,
    data: cachedStructures,
    total: cachedStructures.length,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name || !body.code) {
      return NextResponse.json(
        { success: false, error: 'Structure name and code are required' },
        { status: 400 }
      );
    }

    const newStructure: SalaryStructureDefinition = {
      id: body.id || `struct-${Date.now().toString(36)}`,
      name: body.name,
      code: body.code.toUpperCase().replace(/[^A-Z0-9_]/g, '_'),
      scheduledPay: body.scheduledPay || 'Monthly',
      country: body.country || 'Bangladesh',
      slipDisplayName: body.slipDisplayName || 'Salary Slip',
      workedDaysLinesEnabled: body.workedDaysLinesEnabled ?? true,
      active: body.active ?? true,
      ruleCodes: Array.isArray(body.ruleCodes) ? body.ruleCodes : [],
      description: body.description || '',
    };

    const existingIdx = cachedStructures.findIndex(
      (s) => s.id === newStructure.id || s.code === newStructure.code
    );

    if (existingIdx >= 0) {
      cachedStructures[existingIdx] = newStructure;
    } else {
      cachedStructures.push(newStructure);
    }

    return NextResponse.json({
      success: true,
      data: newStructure,
      message: 'Salary Structure saved successfully',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to create structure' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (Array.isArray(body)) {
      cachedStructures = body;
      return NextResponse.json({
        success: true,
        data: cachedStructures,
        message: 'All structures updated successfully',
      });
    }

    const id = body.id;
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Structure ID is required for update' },
        { status: 400 }
      );
    }

    const index = cachedStructures.findIndex((s) => s.id === id);
    if (index === -1) {
      return NextResponse.json(
        { success: false, error: 'Structure not found' },
        { status: 404 }
      );
    }

    cachedStructures[index] = {
      ...cachedStructures[index],
      ...body,
    };

    return NextResponse.json({
      success: true,
      data: cachedStructures[index],
      message: 'Structure updated successfully',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update structure' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Structure ID is required' },
        { status: 400 }
      );
    }

    cachedStructures = cachedStructures.filter((s) => s.id !== id);
    return NextResponse.json({
      success: true,
      message: 'Structure deleted successfully',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to delete structure' },
      { status: 500 }
    );
  }
}
