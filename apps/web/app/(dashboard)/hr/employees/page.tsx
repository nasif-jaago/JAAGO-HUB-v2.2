'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Building2,
  GraduationCap,
  Plus,
  X,
  CheckCircle2,
} from 'lucide-react';
import { EnterpriseTable, ColumnDef } from '@jaago/ui';
import { EmployeeDirectoryItem } from '@/app/api/v1/hr/employees/route';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeDirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeDirectoryItem | null>(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [branch, setBranch] = useState('Head Office (Banani)');
  const [department, setDepartment] = useState('Education Program');
  const [designation, setDesignation] = useState('Program Officer');
  const [salaryBdt, setSalaryBdt] = useState('65000');

  const fetchEmployees = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('jaago_access_token') : null;
      const res = await fetch('/api/v1/hr/employees', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.data) {
        setEmployees(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) return;

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('jaago_access_token') : null;
      const res = await fetch('/api/v1/hr/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          branch,
          department,
          designation,
          salaryBdt: Number(salaryBdt),
        }),
      });

      const data = await res.json();
      if (data.data) {
        setShowAddModal(false);
        setFullName('');
        setEmail('');
        setPhone('');
        fetchEmployees();
      }
    } catch (err) {
      console.error('Failed to add employee:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Present
          </span>
        );
      case 'on_duty':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
            On Duty
          </span>
        );
      case 'late':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Late
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-surface border border-border text-muted-foreground">
            {status}
          </span>
        );
    }
  };

  const columns: ColumnDef<EmployeeDirectoryItem>[] = [
    {
      key: 'employeeCode',
      header: 'Code',
      accessor: (row) => (
        <span className="font-mono text-xs font-bold text-primary bg-surface px-2 py-1 rounded-lg border border-border">
          {row.employeeCode}
        </span>
      ),
    },
    {
      key: 'fullName',
      header: 'Staff Name & Contact',
      accessor: (row) => (
        <div>
          <div className="font-bold text-foreground">{row.fullName}</div>
          <div className="text-[11px] text-muted-foreground">{row.email}</div>
        </div>
      ),
    },
    {
      key: 'department',
      header: 'Department / Role',
      accessor: (row) => (
        <div>
          <div className="text-xs font-semibold text-foreground">{row.designation}</div>
          <div className="text-[11px] text-muted-foreground">{row.department}</div>
        </div>
      ),
    },
    {
      key: 'branch',
      header: 'Campus / Location',
      accessor: (row) => <span className="text-xs text-foreground font-medium">{row.branch}</span>,
    },
    {
      key: 'todayAttendanceStatus',
      header: 'Live Attendance (Odoo Ext)',
      accessor: (row) => (
        <div className="flex items-center space-x-2">
          {getStatusBadge(row.todayAttendanceStatus)}
          {row.checkInTime && <span className="text-[11px] font-mono text-muted-foreground">{row.checkInTime}</span>}
        </div>
      ),
    },
    {
      key: 'annualLeaveBalance',
      header: 'Leave Quotas',
      accessor: (row) => (
        <span className="text-[11px] font-mono text-muted-foreground">
          {row.annualLeaveBalance}d Annual &bull; {row.sickLeaveBalance}d Sick
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 text-foreground">
      {/* ── HEADER ── */}
      <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground font-black flex items-center justify-center shadow-lg border border-primary/30">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              HR &amp; Employees Directory
            </h1>
            <p className="text-xs text-muted-foreground">
              Organizational Hierarchy &bull; Odoo-Style Model Inheritance &bull; Leave &amp; Live Attendance
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-2xl bg-primary text-primary-foreground font-black text-xs flex items-center space-x-2 hover:bg-primary/90 shadow-lg transition"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Employee</span>
        </button>
      </div>

      {/* ── 4 STAT CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
            <span>TOTAL STAFF</span>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="text-3xl font-black tracking-tight text-foreground font-mono">
            384
          </div>
          <div className="text-[11px] text-muted-foreground">Nationwide foundation workforce</div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
            <span>HEAD OFFICE</span>
            <Building2 className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black tracking-tight text-amber-400 font-mono">
            120
          </div>
          <div className="text-[11px] text-muted-foreground">Banani Executive &amp; Admin Hub</div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
            <span>FREE SCHOOLS &amp; HUBS</span>
            <GraduationCap className="h-4 w-4 text-primary" />
          </div>
          <div className="text-3xl font-black tracking-tight text-foreground font-mono">
            264
          </div>
          <div className="text-[11px] text-muted-foreground">Teachers, principals &amp; coordinators</div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
            <span>LIVE ATTENDANCE</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black tracking-tight text-emerald-400 font-mono">
            95.8%
          </div>
          <div className="text-[11px] text-muted-foreground">Biometric &amp; web punch verified</div>
        </div>
      </div>

      {/* ── ENTERPRISE TABLE ── */}
      {loading ? (
        <div className="p-12 text-center text-muted-foreground rounded-2xl bg-card border border-border">
          Loading employee records...
        </div>
      ) : (
        <EnterpriseTable
          columns={columns}
          data={employees}
          keyField="id"
          title="Staff Directory &amp; Reporting Structure"
          searchPlaceholder="Search staff by name, code, department, branch..."
          onRowClick={(emp) => setSelectedEmployee(emp)}
        />
      )}

      {/* ── EMPLOYEE PROFILE DRAWER ── */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-end">
          <div className="bg-card border-l border-border/90 w-full max-w-md h-full p-6 space-y-5 overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground font-black text-lg flex items-center justify-center shadow">
                  {selectedEmployee.fullName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-black text-base text-foreground">{selectedEmployee.fullName}</h3>
                  <p className="text-xs text-muted-foreground">{selectedEmployee.designation}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="p-2 rounded-xl hover:bg-surface text-muted-foreground hover:text-foreground transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-surface border border-border space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Employee Code:</span>
                <span className="font-mono text-primary font-bold">{selectedEmployee.employeeCode}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Branch Location:</span>
                <span className="text-foreground font-semibold">{selectedEmployee.branch}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Department:</span>
                <span className="text-foreground font-semibold">{selectedEmployee.department}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Reports To (Supervisor):</span>
                <span className="text-foreground font-semibold">{selectedEmployee.supervisorName}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Date of Joining:</span>
                <span className="text-foreground">{selectedEmployee.dateOfJoining}</span>
              </div>
            </div>

            {/* Odoo-Style Inheritance Summary */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Leave &amp; Attendance (Model Extension)
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-surface border border-border text-center">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">Annual Balance</div>
                  <div className="text-xl font-black text-primary font-mono mt-0.5">
                    {selectedEmployee.annualLeaveBalance} <span className="text-xs">Days</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-surface border border-border text-center">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">Sick Balance</div>
                  <div className="text-xl font-black text-emerald-400 font-mono mt-0.5">
                    {selectedEmployee.sickLeaveBalance} <span className="text-xs">Days</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD EMPLOYEE MODAL ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border/90 rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-foreground">Add New Employee</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-xl hover:bg-surface text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-muted-foreground">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Shakil Ahmed"
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="shakil@jaago.com.bd"
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+880 1711..."
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground">Branch</label>
                  <select
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-foreground focus:ring-1 focus:ring-primary"
                  >
                    <option>Head Office (Banani)</option>
                    <option>Rayer Bazar Free School</option>
                    <option>Chittagong Campus</option>
                    <option>Bandarban Online School</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-foreground focus:ring-1 focus:ring-primary"
                  >
                    <option>Education Program</option>
                    <option>Digital Literacy Hub</option>
                    <option>Volunteer for Bangladesh</option>
                    <option>Finance &amp; Admin</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground">Designation / Role</label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. Senior Officer"
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground">Monthly Salary (BDT)</label>
                  <input
                    type="number"
                    value={salaryBdt}
                    onChange={(e) => setSalaryBdt(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-foreground focus:ring-1 focus:ring-primary focus:outline-none font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-black text-xs hover:bg-primary/90 transition shadow-lg mt-2"
              >
                Register Employee Record
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
