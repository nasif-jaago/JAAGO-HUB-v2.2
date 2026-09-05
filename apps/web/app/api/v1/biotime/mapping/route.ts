import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@jaago/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const unmatchedOnly = searchParams.get('unmatched') === 'true';
    const query = searchParams.get('q')?.toLowerCase().trim() || '';

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Supabase client unavailable' }, { status: 500 });
    }

    let dbQuery = supabase
      .from('att_biotime_employee_map')
      .select('*')
      .order('unmatched', { ascending: false })
      .order('biotime_emp_code', { ascending: true });

    if (unmatchedOnly) {
      dbQuery = dbQuery.eq('unmatched', true);
    }

    const [{ data: mappings, error: mapErr }, { data: emps }] = await Promise.all([
      dbQuery,
      supabase.from('employees').select('id, code, name, designation, department, branch, avatar_url'),
    ]);

    let safeMappings = mappings || [];
    if (mapErr) {
      console.warn('att_biotime_employee_map query warning (using fallback):', mapErr.message);
      // Generate initial automatic map from employees
      safeMappings = (emps || []).map((e) => ({
        id: `map-${e.id}`,
        biotime_emp_code: e.code,
        biotime_name: e.name,
        biotime_department: e.department,
        hub_employee_id: e.id,
        hub_employee_code: e.code,
        unmatched: false,
        notes: 'Auto-mapped by employee code',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
    }

    const empMap = new Map((emps || []).map((e) => [e.id, e]));

    let enriched = safeMappings.map((m: any) => {
      const emp = m.hub_employee_id ? empMap.get(m.hub_employee_id) : null;
      return {
        id: m.id,
        biotimeEmpCode: m.biotime_emp_code,
        biotimeName: m.biotime_name,
        biotimeDepartment: m.biotime_department,
        hubEmployeeId: m.hub_employee_id,
        hubEmployeeCode: emp?.code || m.hub_employee_code,
        hubEmployeeName: emp?.name,
        hubDesignation: emp?.designation,
        hubDepartment: emp?.department,
        hubBranch: emp?.branch,
        unmatched: m.unmatched,
        notes: m.notes,
        createdAt: m.created_at,
        updatedAt: m.updated_at,
      };
    });

    if (query) {
      enriched = enriched.filter(
        (m) =>
          m.biotimeEmpCode.toLowerCase().includes(query) ||
          m.biotimeName?.toLowerCase().includes(query) ||
          m.hubEmployeeName?.toLowerCase().includes(query) ||
          m.hubEmployeeCode?.toLowerCase().includes(query)
      );
    }

    const unmatchedCount = (mappings || []).filter((m) => m.unmatched).length;
    const totalCount = (mappings || []).length;

    return NextResponse.json({
      success: true,
      data: enriched,
      metrics: {
        totalMappings: totalCount,
        unmatchedCount,
        matchedCount: totalCount - unmatchedCount,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch BioTime employee mappings' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { biotimeEmpCode, hubEmployeeId, hubEmployeeCode, notes } = body;

    if (!biotimeEmpCode) {
      return NextResponse.json({ success: false, error: 'Missing biotimeEmpCode' }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Supabase client unavailable' }, { status: 500 });
    }

    // Resolve hub employee if code provided
    let finalEmpId = hubEmployeeId;
    let finalEmpCode = hubEmployeeCode;

    if (finalEmpCode && !finalEmpId) {
      const { data: emp } = await supabase
        .from('employees')
        .select('id, code')
        .eq('code', finalEmpCode)
        .maybeSingle();
      if (emp) {
        finalEmpId = emp.id;
        finalEmpCode = emp.code;
      }
    } else if (finalEmpId && !finalEmpCode) {
      const { data: emp } = await supabase
        .from('employees')
        .select('id, code')
        .eq('id', finalEmpId)
        .maybeSingle();
      if (emp) {
        finalEmpCode = emp.code;
      }
    }

    const isUnmatched = !finalEmpId;

    const { data: saved, error: saveErr } = await supabase
      .from('att_biotime_employee_map')
      .upsert(
        {
          biotime_emp_code: String(biotimeEmpCode).trim(),
          hub_employee_id: finalEmpId || null,
          hub_employee_code: finalEmpCode || null,
          unmatched: isUnmatched,
          notes: notes || (isUnmatched ? 'Unmatched' : `Manually mapped to ${finalEmpCode}`),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'biotime_emp_code' }
      )
      .select()
      .single();

    if (saveErr) {
      return NextResponse.json({ success: false, error: saveErr.message }, { status: 500 });
    }

    // Also update existing BioTime events for this employee code
    if (finalEmpId) {
      await supabase
        .from('att_biotime_events')
        .update({ hub_employee_id: finalEmpId })
        .eq('biotime_emp_code', String(biotimeEmpCode).trim());
    }

    return NextResponse.json({
      success: true,
      data: saved,
      message: `✓ BioTime ID ${biotimeEmpCode} successfully mapped to employee ${finalEmpCode || 'unlinked'}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to save mapping' },
      { status: 500 }
    );
  }
}
