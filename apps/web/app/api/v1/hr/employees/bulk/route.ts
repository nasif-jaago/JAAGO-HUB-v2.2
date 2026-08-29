import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@jaago/auth';
import { logger } from '@jaago/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

/**
 * High-performance bulk employee importer with automatic master entity definition
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const employees = Array.isArray(body.employees) ? body.employees : Array.isArray(body) ? body : [];

    if (employees.length === 0) {
      return NextResponse.json({ success: false, error: 'No employee records provided for import' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdminClient();
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: 'Database connection unavailable' }, { status: 500 });
    }

    // ── 1. EXTRACT AND AUTO-DEFINE MASTER ENTITIES ──
    const uniqueOrgs = new Map<string, { id: string; name: string }>();
    const uniqueDepts = new Map<string, { id: string; name: string; orgName: string; orgId: string }>();
    const uniqueDesigs = new Map<string, { id: string; name: string }>();
    const uniqueBranches = new Map<string, { id: string; name: string; orgId: string }>();
    const uniqueProjects = new Map<string, { id: string; name: string; orgName: string; deptName: string }>();
    const uniqueTeams = new Map<string, { id: string; name: string; deptOrProj: string }>();

    employees.forEach((emp: any) => {
      // Organization
      const orgName = (emp.organization || 'JAAGO Foundation').trim();
      const orgKey = orgName.toLowerCase();
      if (orgName && !uniqueOrgs.has(orgKey)) {
        uniqueOrgs.set(orgKey, { id: `org-${slugify(orgName)}`, name: orgName });
      }
      const orgId = uniqueOrgs.get(orgKey)?.id || 'org-1';

      // Department
      const deptName = (emp.department || '').trim();
      const deptKey = deptName.toLowerCase();
      if (deptName && !uniqueDepts.has(deptKey)) {
        uniqueDepts.set(deptKey, {
          id: `dept-${slugify(deptName)}`,
          name: deptName,
          orgName,
          orgId,
        });
      }

      // Designation
      const desigName = (emp.designation || '').trim();
      const desigKey = desigName.toLowerCase();
      if (desigName && !uniqueDesigs.has(desigKey)) {
        uniqueDesigs.set(desigKey, { id: `des-${slugify(desigName)}`, name: desigName });
      }

      // Branch
      const branchName = (emp.branch || '').trim();
      const branchKey = branchName.toLowerCase();
      if (branchName && !uniqueBranches.has(branchKey)) {
        uniqueBranches.set(branchKey, {
          id: `br-${slugify(branchName)}`,
          name: branchName,
          orgId,
        });
      }

      // Project
      const projectName = (emp.project || '').trim();
      const projectKey = projectName.toLowerCase();
      if (projectName && projectName !== 'General Operations' && !uniqueProjects.has(projectKey)) {
        uniqueProjects.set(projectKey, {
          id: `prj-${slugify(projectName)}`,
          name: projectName,
          orgName,
          deptName,
        });
      }

      // Team
      const teamName = (emp.team || '').trim();
      const teamKey = teamName.toLowerCase();
      if (teamName && teamName !== 'Core Development Team' && !uniqueTeams.has(teamKey)) {
        uniqueTeams.set(teamKey, {
          id: `tm-${slugify(teamName)}`,
          name: teamName,
          deptOrProj: deptName || projectName,
        });
      }
    });

    // ── 2. AUTO-UPSERT MASTER ENTITIES TO SUPABASE ──
    try {
      // Upsert Organizations
      if (uniqueOrgs.size > 0) {
        const orgPayloads = Array.from(uniqueOrgs.values()).map((o) => ({
          id: o.id,
          name: o.name,
          currency: 'BDT',
          country: 'Bangladesh',
          brand_color: '#FED900',
          updated_at: new Date().toISOString(),
        }));
        await supabaseAdmin.from('organizations').upsert(orgPayloads, { onConflict: 'id' });
      }

      // Upsert Departments
      if (uniqueDepts.size > 0) {
        const deptPayloads = Array.from(uniqueDepts.values()).map((d) => ({
          id: d.id,
          name: d.name,
          organization_name: d.orgName,
          organization_id: d.orgId,
          code: d.name.slice(0, 4).toUpperCase(),
          updated_at: new Date().toISOString(),
        }));
        await supabaseAdmin.from('departments').upsert(deptPayloads, { onConflict: 'id' });
      }

      // Upsert Designations
      if (uniqueDesigs.size > 0) {
        const desigPayloads = Array.from(uniqueDesigs.values()).map((d) => ({
          id: d.id,
          name: d.name,
          code: d.name.slice(0, 4).toUpperCase(),
          updated_at: new Date().toISOString(),
        }));
        await supabaseAdmin.from('designations').upsert(desigPayloads, { onConflict: 'id' });
      }

      // Upsert Branches
      if (uniqueBranches.size > 0) {
        const branchPayloads = Array.from(uniqueBranches.values()).map((b) => ({
          id: b.id,
          name: b.name,
          organization_id: b.orgId,
          city: 'Dhaka',
          country: 'Bangladesh',
        }));
        await supabaseAdmin.from('organization_branches').upsert(branchPayloads, { onConflict: 'id' });
      }

      // Upsert Projects
      if (uniqueProjects.size > 0) {
        const projectPayloads = Array.from(uniqueProjects.values()).map((p) => ({
          id: p.id,
          name: p.name,
          organization_name: p.orgName,
          parent_department_name: p.deptName,
          status: 'ACTIVE',
          updated_at: new Date().toISOString(),
        }));
        await supabaseAdmin.from('projects').upsert(projectPayloads, { onConflict: 'id' });
      }

      // Upsert Teams
      if (uniqueTeams.size > 0) {
        const teamPayloads = Array.from(uniqueTeams.values()).map((t) => ({
          id: t.id,
          name: t.name,
          department_or_project: t.deptOrProj,
          updated_at: new Date().toISOString(),
        }));
        await supabaseAdmin.from('teams').upsert(teamPayloads, { onConflict: 'id' });
      }
    } catch (masterErr) {
      console.warn('Auto-define master entities partial warning:', masterErr);
    }

    // ── 3. MAP EMPLOYEE RECORDS TO DATABASE PAYLOADS ──
    const employeePayloads = employees.map((emp: any) => {
      const isArchived = emp.status === 'Archived' || Boolean(emp.isArchived);
      return {
        code: String(emp.code || '').trim(),
        name: String(emp.name || '').trim(),
        avatar_url: emp.avatarUrl || emp.avatar_url || null,
        designation: emp.designation || 'Program Officer',
        work_email: emp.workEmail || emp.work_email || null,
        work_mobile: emp.workMobile || emp.work_mobile || null,
        working_schedule: emp.workingSchedule || emp.working_schedule || 'JAAGO HQ (10:00 AM - 06:00 PM)',
        status: isArchived ? 'Archived' : (emp.status || 'Active'),
        is_archived: isArchived,

        // Tab 1: Work
        organization: emp.organization || 'JAAGO Foundation',
        branch: emp.branch || 'Head Office (Banani)',
        department: emp.department || 'Program Implementation',
        project: emp.project || 'General Operations',
        team: emp.team || null,
        supervisor: emp.supervisor || null,
        secondary_supervisor: emp.secondarySupervisor || emp.secondary_supervisor || null,
        work_location: emp.workLocation || emp.work_location || 'Banani, Dhaka',
        remark: emp.remark || null,

        // Tab 2: Personal
        personal_email: emp.personalEmail || emp.personal_email || null,
        personal_phone: emp.personalPhone || emp.personal_phone || null,
        bank_name: emp.bankName || emp.bank_name || null,
        bank_account_number: emp.bankAccountNumber || emp.bank_account_number || null,
        nick_name: emp.nickName || emp.nick_name || null,
        nid: emp.nid || null,
        blood_group: emp.bloodGroup || emp.blood_group || null,
        birthday: emp.birthday ? String(emp.birthday).slice(0, 10) : null,
        gender: emp.gender || null,
        religion: emp.religion || 'Islam',
        marital_status: emp.maritalStatus || emp.marital_status || 'Single',
        emergency_contact_name: emp.emergencyContactName || emp.emergency_contact_name || null,
        emergency_phone: emp.emergencyPhone || emp.emergency_phone || null,
        nationality: emp.nationality || 'Bangladeshi',
        passport_no: emp.passportNo || emp.passport_no || null,
        home_address: emp.homeAddress || emp.home_address || null,
        dependent_children: Number(emp.dependentChildren || emp.dependent_children || 0),

        // Tab 3: Payroll
        joining_date: emp.joiningDate ? String(emp.joiningDate).slice(0, 10) : null,
        contract_end_date: emp.contractEndDate ? String(emp.contractEndDate).slice(0, 10) : null,
        wage_type: emp.wageType || emp.wage_type || 'Fixed',
        wage: Number(emp.wage || 0),
        salary_jul_dec: Number(emp.salaryJulDec || emp.salary_jul_dec || 0),
        salary_jan_jun: Number(emp.salaryJanJun || emp.salary_jan_jun || 0),
        monthly_total_allowance: emp.monthlyTotalAllowance || emp.monthly_total_allowance || 'Yes',
        six_months_completion_status: emp.sixMonthsCompletionStatus || emp.six_months_completion_status || 'Yes',
        probationary_status: emp.probationaryStatus || emp.probationary_status || 'Confirmed',
        contract_type: emp.contractType || emp.contract_type || 'Full Time',
        no_tax_deduction: Boolean(emp.noTaxDeduction || emp.no_tax_deduction),
        bonus_eligibility: emp.bonusEligibility || emp.bonus_eligibility || 'Yes',
        pf_applies: emp.pfApplies || emp.pf_applies || 'Yes',
        pf_rate: Number(emp.pfRate || emp.pf_rate || 10),
        regular_salary: Number(emp.regularSalary || emp.regular_salary || 0),
        extra_hours: Number(emp.extraHours || emp.extra_hours || 0),
        extra_payment: Number(emp.extraPayment || emp.extra_payment || 0),
        calculation_value: emp.calculationValue || emp.calculation_value || '1.0x',
        temporary_salary: Number(emp.temporarySalary || emp.temporary_salary || 0),
        total_current_salary: Number(emp.totalCurrentSalary || emp.total_current_salary || 0),
        currency: emp.currency || 'BDT',
        adjustment_start_date: emp.adjustmentStartDate ? String(emp.adjustmentStartDate).slice(0, 10) : null,
        adjustment_end_date: emp.adjustmentEndDate ? String(emp.adjustmentEndDate).slice(0, 10) : null,
        assigned_teacher_staff: emp.assignedTeacherStaff || emp.assigned_teacher_staff || null,
        payroll_remark: emp.payrollRemark || emp.payroll_remark || null,

        // Tab 4: Insurance
        insurance_status: emp.insuranceStatus || emp.insurance_status || 'Active',
        insurance_coverage_category: emp.insuranceCoverageCategory || emp.insurance_coverage_category || null,
        insurance_monthly_premium: Number(emp.insuranceMonthlyPremium ?? emp.insurance_monthly_premium ?? 1500),
        employee_health_insurance_id: emp.employeeHealthInsuranceId || emp.employee_health_insurance_id || null,
        spouse_health_insurance_id: emp.spouseHealthInsuranceId || emp.spouse_health_insurance_id || null,
        spouse_name: emp.spouseName || emp.spouse_name || null,
        child1_health_insurance_id: emp.child1HealthInsuranceId || emp.child1_health_insurance_id || null,
        child1_name: emp.child1Name || emp.child1_name || null,
        child2_health_insurance_id: emp.child2HealthInsuranceId || emp.child2_health_insurance_id || null,
        child2_name: emp.child2Name || emp.child2_name || null,
        child3_health_insurance_id: emp.child3HealthInsuranceId || emp.child3_health_insurance_id || null,
        child3_name: emp.child3Name || emp.child3_name || null,

        // Tab 5: DSP
        office_days: emp.officeDays || emp.office_days || 'Sunday to Thursday',
        custom_office_days_from: emp.customOfficeDaysFrom || emp.custom_office_days_from || null,
        custom_office_days_to: emp.customOfficeDaysTo || emp.custom_office_days_to || null,
        office_hours: emp.officeHours || emp.office_hours || '10:00 AM - 06:00 PM',
        rfid: emp.rfid || null,
        leave_group: emp.leaveGroup || emp.leave_group || 'Standard Full-time',
        employee_type: emp.employeeType || emp.employee_type || 'Permanent',

        // Tab 6: Leave & Attendance
        leave_policy: emp.leavePolicy || emp.leave_policy || null,
        casual_leave_allocated: Number(emp.casualLeaveAllocated ?? emp.casual_leave_allocated ?? 14),
        casual_leave_used: Number(emp.casualLeaveUsed ?? emp.casual_leave_used ?? 0),
        sick_leave_allocated: Number(emp.sickLeaveAllocated ?? emp.sick_leave_allocated ?? 10),
        sick_leave_used: Number(emp.sickLeaveUsed ?? emp.sick_leave_used ?? 0),
        earned_leave_allocated: Number(emp.earnedLeaveAllocated ?? emp.earned_leave_allocated ?? 15),
        earned_leave_used: Number(emp.earnedLeaveUsed ?? emp.earned_leave_used ?? 0),
        special_leave_allocated: Number(emp.specialLeaveAllocated ?? emp.special_leave_allocated ?? 5),
        special_leave_used: Number(emp.specialLeaveUsed ?? emp.special_leave_used ?? 0),
        weekend_days: emp.weekendDays || emp.weekend_days || 'Friday & Saturday',
        overtime_eligible: emp.overtimeEligible || emp.overtime_eligible || 'No',
        attendance_grace_period_min: Number(emp.attendanceGracePeriodMin ?? emp.attendance_grace_period_min ?? 15),

        is_user: Boolean(emp.isUser || emp.is_user),
        user_id: emp.userId || emp.user_id || null,
        updated_at: new Date().toISOString(),
      };
    });

    // ── 4. CHUNKED UPSERTS INTO SUPABASE (100 rows per chunk) ──
    const CHUNK_SIZE = 100;
    let totalUpserted = 0;
    const errors: string[] = [];

    for (let i = 0; i < employeePayloads.length; i += CHUNK_SIZE) {
      const chunk = employeePayloads.slice(i, i + CHUNK_SIZE);
      const { error } = await supabaseAdmin
        .from('employees')
        .upsert(chunk, { onConflict: 'code' });

      if (error) {
        console.error(`Chunk ${i / CHUNK_SIZE + 1} upsert error:`, error.message);
        errors.push(`Batch ${i + 1}-${i + chunk.length}: ${error.message}`);
      } else {
        totalUpserted += chunk.length;
      }
    }

    logger.info('AUDIT', 'employees.bulk_imported', {
      metadata: { totalRequested: employees.length, totalUpserted, errorsCount: errors.length },
    });

    return NextResponse.json({
      success: true,
      totalRequested: employees.length,
      totalUpserted,
      errors: errors.length > 0 ? errors : undefined,
      autoDefined: {
        organizations: uniqueOrgs.size,
        departments: uniqueDepts.size,
        designations: uniqueDesigs.size,
        branches: uniqueBranches.size,
        projects: uniqueProjects.size,
        teams: uniqueTeams.size,
      },
    });
  } catch (err: any) {
    console.error('Bulk employee import error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error during bulk import' }, { status: 500 });
  }
}
