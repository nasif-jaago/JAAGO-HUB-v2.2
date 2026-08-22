import { createApiHandler } from '@jaago/authz';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface EmployeeDirectoryItem {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string;
  branch: string;
  department: string;
  designation: string;
  supervisorName: string;
  dateOfJoining: string;
  employmentStatus: 'active' | 'probation' | 'resigned';
  salaryBdt: number;
  // Odoo-Style Model Extended Fields
  todayAttendanceStatus: 'present' | 'late' | 'absent' | 'on_duty' | 'leave';
  checkInTime?: string;
  annualLeaveBalance: number;
  sickLeaveBalance: number;
}

const defaultEmployees: EmployeeDirectoryItem[] = [
  {
    id: 'emp-001',
    employeeCode: 'EMP-001',
    fullName: 'Nasif Kamal',
    email: 'nasif.kamal@jaago.com.bd',
    phone: '+880 1711 000001',
    branch: 'Head Office (Banani)',
    department: 'Executive Office',
    designation: 'Founder & Executive Director',
    supervisorName: 'Board of Trustees',
    dateOfJoining: '2015-04-10',
    employmentStatus: 'active',
    salaryBdt: 250000,
    todayAttendanceStatus: 'present',
    checkInTime: '08:45 AM',
    annualLeaveBalance: 18,
    sickLeaveBalance: 12,
  },
  {
    id: 'emp-002',
    employeeCode: 'EMP-002',
    fullName: 'Habibur Rahman',
    email: 'habibur.rahman@jaago.com.bd',
    phone: '+880 1711 000002',
    branch: 'Rayer Bazar Free School',
    department: 'Education Program',
    designation: 'Campus Principal',
    supervisorName: 'Nasif Kamal',
    dateOfJoining: '2018-02-15',
    employmentStatus: 'active',
    salaryBdt: 120000,
    todayAttendanceStatus: 'present',
    checkInTime: '08:30 AM',
    annualLeaveBalance: 14,
    sickLeaveBalance: 10,
  },
  {
    id: 'emp-003',
    employeeCode: 'EMP-003',
    fullName: 'Farhana Ahmed',
    email: 'farhana.ahmed@jaago.com.bd',
    phone: '+880 1711 000003',
    branch: 'Head Office (Banani)',
    department: 'Digital Literacy Hub',
    designation: 'Lead Program Manager',
    supervisorName: 'Nasif Kamal',
    dateOfJoining: '2020-07-01',
    employmentStatus: 'active',
    salaryBdt: 140000,
    todayAttendanceStatus: 'on_duty',
    checkInTime: '09:00 AM',
    annualLeaveBalance: 20,
    sickLeaveBalance: 14,
  },
  {
    id: 'emp-004',
    employeeCode: 'EMP-004',
    fullName: 'Tanvir Hossain',
    email: 'tanvir.hossain@jaago.com.bd',
    phone: '+880 1711 000004',
    branch: 'Chittagong Campus',
    department: 'Volunteer for Bangladesh',
    designation: 'Regional Coordinator',
    supervisorName: 'Farhana Ahmed',
    dateOfJoining: '2022-01-10',
    employmentStatus: 'active',
    salaryBdt: 85000,
    todayAttendanceStatus: 'present',
    checkInTime: '08:50 AM',
    annualLeaveBalance: 16,
    sickLeaveBalance: 12,
  },
];

export const GET = createApiHandler({
  requireAuth: true,
  async handler(_request, context) {
    return Response.json({
      data: defaultEmployees,
      meta: {
        total: defaultEmployees.length,
        organizationId: context.organizationId,
      },
    });
  },
});

export const POST = createApiHandler({
  requireAuth: true,
  async handler(request) {
    const body = await request.json();
    const newEmp: EmployeeDirectoryItem = {
      id: `emp_${Date.now()}`,
      employeeCode: body.employeeCode || `EMP-00${defaultEmployees.length + 1}`,
      fullName: body.fullName,
      email: body.email,
      phone: body.phone || '',
      branch: body.branch || 'Head Office (Banani)',
      department: body.department || 'Education Program',
      designation: body.designation || 'Program Officer',
      supervisorName: body.supervisorName || 'Nasif Kamal',
      dateOfJoining: body.dateOfJoining || new Date().toISOString().slice(0, 10),
      employmentStatus: 'active',
      salaryBdt: body.salaryBdt || 50000,
      todayAttendanceStatus: 'present',
      checkInTime: '09:00 AM',
      annualLeaveBalance: 18,
      sickLeaveBalance: 14,
    };

    defaultEmployees.push(newEmp);

    return Response.json({
      data: newEmp,
    });
  },
});
