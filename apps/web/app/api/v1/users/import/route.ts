import { NextResponse } from 'next/server';
import { logger } from '@jaago/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rows } = body; // Array of user objects parsed from CSV

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No user records provided in payload' }, { status: 400 });
    }

    const imported = [];
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const fullName = row.full_name || row.fullName;
      const email = row.email;
      const role = row.role || 'Staff';
      const department = row.department || 'General';
      const branch = row.branch || 'Head Office (Banani)';
      const jobTitle = row.job_title || row.jobTitle || 'Staff Member';
      const phone = row.phone || '';
      const createEmployee = String(row.create_employee || row.createEmployee).toLowerCase() === 'true';

      if (!fullName || !email) {
        errors.push({ row: i + 1, error: 'Missing required field: full_name or email' });
        continue;
      }

      const employeeId = createEmployee ? `JFT-2026-${Math.floor(1000 + Math.random() * 9000)}` : null;

      imported.push({
        id: `u-imp-${Date.now()}-${i}`,
        fullName,
        email,
        role,
        department,
        branch,
        jobTitle,
        phone,
        status: 'active',
        employeeId,
        isEmployeeLinked: Boolean(employeeId),
        createdAt: new Date().toISOString(),
      });
    }

    logger.info('AUDIT', 'user.csv_imported', {
      metadata: { total: rows.length, importedCount: imported.length, errorCount: errors.length },
    });

    return NextResponse.json({
      success: true,
      importedCount: imported.length,
      errors,
      data: imported,
      message: `Successfully imported ${imported.length} user(s).`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Import failed' }, { status: 500 });
  }
}
