import { NextRequest, NextResponse } from 'next/server';
import {
  DEFAULT_SALARY_RULES,
  SalaryRuleDefinition,
} from '@/lib/payroll-engine';

let cachedRules: SalaryRuleDefinition[] = [...DEFAULT_SALARY_RULES];

export async function GET() {
  return NextResponse.json({
    success: true,
    data: cachedRules,
    total: cachedRules.length,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name || !body.code) {
      return NextResponse.json(
        { success: false, error: 'Rule name and code are required' },
        { status: 400 }
      );
    }

    const newRule: SalaryRuleDefinition = {
      id: body.id || `rule-${Date.now().toString(36)}`,
      name: body.name,
      code: body.code.toUpperCase().replace(/[^A-Z0-9_]/g, '_'),
      categoryCode: body.categoryCode || 'ALW',
      sequence: Number(body.sequence || 50),
      calculationDetails: body.calculationDetails || '0',
      active: body.active ?? true,
      appearsOnPayslip: body.appearsOnPayslip ?? true,
      contributesToEmployerCost: body.contributesToEmployerCost ?? false,
      description: body.description || '',
      structureCodes: Array.isArray(body.structureCodes) ? body.structureCodes : [],
    };

    const existingIdx = cachedRules.findIndex(
      (r) => r.id === newRule.id || r.code === newRule.code
    );

    if (existingIdx >= 0) {
      cachedRules[existingIdx] = newRule;
    } else {
      cachedRules.push(newRule);
    }

    return NextResponse.json({
      success: true,
      data: newRule,
      message: 'Salary Rule saved successfully',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to create rule' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (Array.isArray(body)) {
      cachedRules = body;
      return NextResponse.json({
        success: true,
        data: cachedRules,
        message: 'All rules updated successfully',
      });
    }

    const id = body.id;
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Rule ID is required for update' },
        { status: 400 }
      );
    }

    const index = cachedRules.findIndex((r) => r.id === id);
    if (index === -1) {
      return NextResponse.json(
        { success: false, error: 'Rule not found' },
        { status: 404 }
      );
    }

    const existingRule = cachedRules[index];
    if (!existingRule) {
      return NextResponse.json(
        { success: false, error: 'Rule not found' },
        { status: 404 }
      );
    }

    const updatedRule = {
      ...existingRule,
      ...body,
      sequence: body.sequence !== undefined ? Number(body.sequence) : existingRule.sequence,
    };

    cachedRules[index] = updatedRule;

    return NextResponse.json({
      success: true,
      data: updatedRule,
      message: 'Rule updated successfully',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update rule' },
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
        { success: false, error: 'Rule ID is required' },
        { status: 400 }
      );
    }

    cachedRules = cachedRules.filter((r) => r.id !== id);
    return NextResponse.json({
      success: true,
      message: 'Rule deleted successfully',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to delete rule' },
      { status: 500 }
    );
  }
}
