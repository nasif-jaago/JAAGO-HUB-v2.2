import { NextRequest, NextResponse } from 'next/server';
import {
  evaluateSalaryRules,
  INITIAL_PAYROLL_CONFIG,
  PayrollConfig,
  RuleContext,
} from '@/lib/payroll-engine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const contract: RuleContext['contract'] = body.contract || {
      wage: 60000,
      pf_rate: 0.05,
      bonus_eligibility: true,
      gender: 'male',
      freedom_fighter: false,
      disabled_third_gender: false,
      no_tax_deduction: false,
      pf_enabled: true,
      insurance_status: 'Disabled',
      department: 'General',
    };

    const settings: PayrollConfig = body.settings || INITIAL_PAYROLL_CONFIG;
    const inputs: RuleContext['inputs'] = body.inputs || {};

    const calculation = evaluateSalaryRules(contract, settings, inputs);

    return NextResponse.json({
      success: true,
      data: calculation,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Simulation execution failed' },
      { status: 500 }
    );
  }
}
