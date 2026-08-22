import { ExportColumnDef } from '@jaago/importexport';
import { logger } from '@jaago/logger';

export interface ReportDefinitionData {
  key: string;
  name: string;
  category: 'hr' | 'finance' | 'education' | 'operations';
  description: string;
  columns: ExportColumnDef<Record<string, unknown>>[];
}

export class ReportingEngine {
  private static definitions: ReportDefinitionData[] = [
    {
      key: 'hr_attendance_monthly',
      name: 'Monthly Staff Attendance & Leave Audit',
      category: 'hr',
      description: 'Breakdown of staff present days, leaves taken, on-duty trips, and attendance percentage',
      columns: [
        { key: 'employeeId', header: 'Employee ID' },
        { key: 'name', header: 'Staff Name' },
        { key: 'branch', header: 'Branch / Location' },
        { key: 'presentDays', header: 'Present Days' },
        { key: 'leaveDays', header: 'Leave Days' },
        { key: 'attendanceRate', header: 'Attendance %' },
      ],
    },
    {
      key: 'finance_expense_breakdown',
      name: 'Program Expense & Requisition Summary',
      category: 'finance',
      description: 'Departmental expenditure, approved purchase orders, and remaining budget allocations',
      columns: [
        { key: 'code', header: 'Cost Center' },
        { key: 'department', header: 'Department' },
        { key: 'allocatedBudget', header: 'Allocated (BDT)' },
        { key: 'spentAmount', header: 'Spent (BDT)' },
        { key: 'burnRate', header: 'Burn Rate %' },
      ],
    },
    {
      key: 'education_student_enrollment',
      name: 'Free School Student Enrollment & Attendance',
      category: 'education',
      description: 'Nationwide school statistics across Rayer Bazar, Banani, Chittagong, and Bandarban',
      columns: [
        { key: 'schoolName', header: 'School Campus' },
        { key: 'enrolledCount', header: 'Total Enrolled' },
        { key: 'maleRatio', header: 'Boys %' },
        { key: 'femaleRatio', header: 'Girls %' },
        { key: 'avgDailyAttendance', header: 'Daily Attendance %' },
      ],
    },
  ];

  public static listDefinitions(): ReportDefinitionData[] {
    return this.definitions;
  }

  public static getDefinition(key: string): ReportDefinitionData | undefined {
    return this.definitions.find((d) => d.key === key);
  }

  public static async executeReport(params: {
    definitionKey: string;
    filters?: Record<string, unknown>;
    organizationId: string;
  }): Promise<{
    definition: ReportDefinitionData;
    rows: Record<string, unknown>[];
    generatedAt: string;
  }> {
    const definition = this.getDefinition(params.definitionKey);
    if (!definition) {
      throw new Error(`Report definition ${params.definitionKey} not found`);
    }

    // Sample data synthesis based on report key
    let rows: Record<string, unknown>[] = [];

    if (params.definitionKey === 'hr_attendance_monthly') {
      rows = [
        { employeeId: 'EMP-001', name: 'Nasif Kamal', branch: 'Head Office (Banani)', presentDays: 22, leaveDays: 1, attendanceRate: '95.6%' },
        { employeeId: 'EMP-002', name: 'Habibur Rahman', branch: 'Rayer Bazar School', presentDays: 20, leaveDays: 3, attendanceRate: '92.0%' },
        { employeeId: 'EMP-003', name: 'Farhana Ahmed', branch: 'Digital Literacy Hub', presentDays: 23, leaveDays: 0, attendanceRate: '100.0%' },
        { employeeId: 'EMP-004', name: 'Tanvir Hossain', branch: 'Chittagong Campus', presentDays: 21, leaveDays: 2, attendanceRate: '94.2%' },
      ];
    } else if (params.definitionKey === 'finance_expense_breakdown') {
      rows = [
        { code: 'EDU-101', department: 'Education Operations', allocatedBudget: 12000000, spentAmount: 9800000, burnRate: '81.6%' },
        { code: 'IT-202', department: 'IT & Digital Literacy', allocatedBudget: 4500000, spentAmount: 3200000, burnRate: '71.1%' },
        { code: 'YTH-303', department: 'Volunteer for Bangladesh', allocatedBudget: 3000000, spentAmount: 2650000, burnRate: '88.3%' },
      ];
    } else {
      rows = [
        { schoolName: 'Rayer Bazar School (Dhaka)', enrolledCount: 650, maleRatio: '48%', femaleRatio: '52%', avgDailyAttendance: '94.8%' },
        { schoolName: 'Banani Campus (Dhaka)', enrolledCount: 420, maleRatio: '50%', femaleRatio: '50%', avgDailyAttendance: '93.2%' },
        { schoolName: 'Bandarban Online School', enrolledCount: 380, maleRatio: '46%', femaleRatio: '54%', avgDailyAttendance: '91.5%' },
        { schoolName: 'Chittagong Campus', enrolledCount: 510, maleRatio: '49%', femaleRatio: '51%', avgDailyAttendance: '96.0%' },
      ];
    }

    logger.info('AUDIT', 'report.executed', {
      organizationId: params.organizationId,
      metadata: { definitionKey: params.definitionKey, rowCount: rows.length },
    });

    return {
      definition,
      rows,
      generatedAt: new Date().toISOString(),
    };
  }
}
