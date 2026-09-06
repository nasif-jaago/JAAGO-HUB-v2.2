import { NextRequest, NextResponse } from 'next/server';
import {
  evaluateDynamicSalaryStructure,
  INITIAL_PAYROLL_CONFIG,
  RuleContext,
} from '@/lib/payroll-engine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { structureId, contract, settings, inputs } = body;

    const effectiveContract: RuleContext['contract'] = {
      wage: Number(contract?.wage || 60000),
      pf_rate: contract?.pf_rate !== undefined ? Number(contract.pf_rate) : 0.05,
      bonus_eligibility: contract?.bonus_eligibility ?? true,
      gender: contract?.gender || 'male',
      freedom_fighter: Boolean(contract?.freedom_fighter),
      disabled_third_gender: Boolean(contract?.disabled_third_gender),
      no_tax_deduction: Boolean(contract?.no_tax_deduction),
      pf_enabled: contract?.pf_enabled ?? true,
      insurance_status: contract?.insurance_status || 'Disabled',
      insurance_monthly_premium: Number(contract?.insurance_monthly_premium || 0),
      department: contract?.department || 'General',
    };

    if (contract?.basic_wage !== undefined && contract?.basic_wage !== null) {
      effectiveContract.basic_wage = Number(contract.basic_wage);
    }
    if (contract?.joining_date) {
      effectiveContract.joining_date = String(contract.joining_date);
    }
    if (contract?.contract_start_date) {
      effectiveContract.contract_start_date = String(contract.contract_start_date);
    }

    const effectiveSettings = { ...INITIAL_PAYROLL_CONFIG, ...(settings || {}) };
    const effectiveInputs = inputs || {};

    const result = evaluateDynamicSalaryStructure(
      structureId || 'JAAGO_PAY_ATT_INS',
      effectiveContract,
      effectiveSettings,
      effectiveInputs
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Calculation failed' },
      { status: 500 }
    );
  }
}
