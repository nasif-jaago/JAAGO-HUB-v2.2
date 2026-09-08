'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  FilePlus,
  User,
  CheckCircle2,
  AlertCircle,
  Search,
  Lock,
  Check,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import {
  ContractType,
  WorkingSchedule,
  EmploymentContractVersion,
  normalizeContractType,
  normalizeWorkingSchedule,
} from '@/lib/contracts-engine';
import { FullEmployeeProfile } from '@/lib/supabase-employees';

interface NewContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveContract: (newContract: EmploymentContractVersion) => void;
  employees: FullEmployeeProfile[];
  existingContractToAmend?: EmploymentContractVersion | null;
  initialEmployeeId?: string;
}

export function NewContractModal({
  isOpen,
  onClose,
  onSaveContract,
  employees,
  existingContractToAmend,
  initialEmployeeId,
}: NewContractModalProps) {
  const isAmendment = Boolean(existingContractToAmend);

  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [department, setDepartment] = useState('');
  const [project, setProject] = useState('Core / Org-wide');
  const [organization, setOrganization] = useState<'JAAGO Foundation' | 'JAAGO Foundation Trust'>(
    'JAAGO Foundation'
  );
  const [designation, setDesignation] = useState('');
  const [contractType, setContractType] = useState<ContractType>('Fixed-Term');
  const [workingSchedule, setWorkingSchedule] = useState<WorkingSchedule>('Full-Time');
  const [effectiveDate, setEffectiveDate] = useState('2026-09-07');
  const [startDate, setStartDate] = useState('2026-09-07');
  const [endDate, setEndDate] = useState('2027-09-06');
  const [isPermanent, setIsPermanent] = useState(false);
  const [probationMonths, setProbationMonths] = useState(3);
  const [reportingTo, setReportingTo] = useState('Head of Department');
  const [placeOfPosting, setPlaceOfPosting] = useState('Head Office (Banani), Dhaka');
  const [remunerationAmount, setRemunerationAmount] = useState(45000);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Search state for autocomplete
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute 3-character filtered suggestions
  const trimmedSearch = searchQuery.trim().toLowerCase();
  const hasMinChars = trimmedSearch.length >= 3;
  const suggestedEmployees = useMemo(() => {
    if (!hasMinChars) return [];
    return employees.filter((emp) => {
      const name = (emp.name || '').toLowerCase();
      const code = (emp.code || '').toLowerCase();
      const desig = (emp.designation || '').toLowerCase();
      const dept = (emp.department || '').toLowerCase();
      const loc = (emp.workLocation || emp.branch || '').toLowerCase();
      return (
        name.includes(trimmedSearch) ||
        code.includes(trimmedSearch) ||
        desig.includes(trimmedSearch) ||
        dept.includes(trimmedSearch) ||
        loc.includes(trimmedSearch)
      );
    });
  }, [employees, trimmedSearch, hasMinChars]);

  // Helper to populate all modal fields cleanly from an employee profile
  const populateFromEmployee = (
    emp: FullEmployeeProfile,
    fallback?: EmploymentContractVersion | null
  ) => {
    setSelectedEmpId(emp.id || emp.code);
    setEmployeeName(emp.name);
    setEmployeeCode(emp.code);
    setDepartment(emp.department || fallback?.department || 'Program Implementation');
    setProject(emp.project || fallback?.project || 'General Operations');
    setOrganization(
      emp.organization?.toLowerCase().includes('trust') ||
        fallback?.organization?.toLowerCase().includes('trust')
        ? 'JAAGO Foundation Trust'
        : 'JAAGO Foundation'
    );
    setDesignation(emp.designation || fallback?.designation || 'Program Officer');

    const cType = normalizeContractType(
      fallback?.contractType || emp.contractType,
      fallback?.endDate || emp.contractEndDate,
      emp.employeeType,
      emp.probationaryStatus
    );
    setContractType(cType);

    const sched = normalizeWorkingSchedule(emp.workingSchedule || fallback?.workingSchedule);
    setWorkingSchedule(sched);

    setEffectiveDate(new Date().toISOString().slice(0, 10));

    const start = emp.joiningDate
      ? emp.joiningDate.slice(0, 10)
      : fallback?.startDate || new Date().toISOString().slice(0, 10);
    setStartDate(start);

    const end =
      emp.contractEndDate && emp.contractEndDate.length >= 10 && emp.contractEndDate !== '-'
        ? emp.contractEndDate.slice(0, 10)
        : fallback?.endDate || '';
    setEndDate(end);

    const isPerm =
      cType === 'Permanent' ||
      emp.contractType?.toLowerCase().includes('permanent') ||
      (!end && emp.employeeType?.toLowerCase().includes('permanent'));
    setIsPermanent(isPerm);

    setProbationMonths(
      emp.probationaryStatus === 'On Probation'
        ? 6
        : fallback?.probationMonths ?? 3
    );
    setReportingTo(
      emp.supervisor || fallback?.reportingTo || 'Founder / Head of People & Culture'
    );
    setPlaceOfPosting(
      emp.workLocation ||
        emp.branch ||
        fallback?.placeOfPosting ||
        'Head Office (Banani), Dhaka'
    );

    const rawWage =
      emp.wage ||
      emp.regularSalary ||
      emp.totalCurrentSalary ||
      fallback?.remunerationAmount ||
      45000;
    setRemunerationAmount(Number(rawWage));

    if (fallback) {
      setNotes(`Amending version of ${fallback.contractNo || fallback.id}`);
    } else {
      setNotes(emp.remark || emp.payrollRemark || '');
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    if (existingContractToAmend) {
      const emp = employees.find(
        (e) =>
          e.id === existingContractToAmend.employeeId ||
          e.code === existingContractToAmend.employeeCode
      );
      if (emp) {
        populateFromEmployee(emp, existingContractToAmend);
      } else {
        setSelectedEmpId(existingContractToAmend.employeeId);
        setEmployeeName(existingContractToAmend.employeeName);
        setEmployeeCode(existingContractToAmend.employeeCode);
        setDepartment(existingContractToAmend.department);
        setProject(existingContractToAmend.project);
        setOrganization(existingContractToAmend.organization);
        setDesignation(existingContractToAmend.designation);
        setContractType(existingContractToAmend.contractType);
        setWorkingSchedule(existingContractToAmend.workingSchedule);
        setEffectiveDate(new Date().toISOString().slice(0, 10));
        setStartDate(existingContractToAmend.startDate);
        setEndDate(existingContractToAmend.endDate || '');
        setIsPermanent(
          existingContractToAmend.contractType === 'Permanent' || !existingContractToAmend.endDate
        );
        setProbationMonths(existingContractToAmend.probationMonths ?? 3);
        setReportingTo(existingContractToAmend.reportingTo || 'Head of Department');
        setPlaceOfPosting(
          existingContractToAmend.placeOfPosting || 'Head Office (Banani), Dhaka'
        );
        setRemunerationAmount(existingContractToAmend.remunerationAmount || 45000);
        setNotes(`Amending version of ${existingContractToAmend.contractNo}`);
      }
    } else if (initialEmployeeId) {
      const targetEmp = employees.find(
        (e) => e.id === initialEmployeeId || e.code === initialEmployeeId
      );
      if (targetEmp) {
        populateFromEmployee(targetEmp, null);
      } else if (employees.length > 0) {
        populateFromEmployee(employees[0]!, null);
      }
    } else if (employees.length > 0) {
      const first = employees[0];
      if (first) {
        populateFromEmployee(first, null);
      }
    }
  }, [isOpen, existingContractToAmend, initialEmployeeId, employees]);

  const handleSelectEmployee = (emp: FullEmployeeProfile) => {
    populateFromEmployee(emp, null);
    setSearchQuery('');
    setIsDropdownOpen(false);
  };

  const handleContractTypeChange = (type: ContractType) => {
    setContractType(type);
    if (type === 'Permanent') {
      setIsPermanent(true);
      setEndDate('');
    } else {
      setIsPermanent(false);
      if (!endDate) {
        // Set default 1 year duration
        const start = new Date(startDate || new Date());
        start.setFullYear(start.getFullYear() + 1);
        setEndDate(start.toISOString().slice(0, 10));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!employeeName.trim()) {
      setError('Please specify or select an employee.');
      return;
    }

    if (!isPermanent && !endDate) {
      setError('Please provide a Contract End Date for non-permanent contracts.');
      return;
    }

    if (!isPermanent && endDate && startDate && endDate <= startDate) {
      setError('Contract End Date must be after the Start Date.');
      return;
    }

    const prefix = organization === 'JAAGO Foundation Trust' ? 'JFT' : 'JF';
    const year = new Date(effectiveDate).getFullYear();
    const randomSeq = Math.floor(100 + Math.random() * 900);
    const contractNo = `${prefix}/HR/CON/${year}/${randomSeq}`;

    const newContractVersion: EmploymentContractVersion = {
      id: `con-${Date.now()}`,
      tenantId: 'tenant-jaago-main',
      employeeId: selectedEmpId || `emp-${Date.now()}`,
      employeeCode: employeeCode || `EMP-${Date.now().toString().slice(-4)}`,
      employeeName: employeeName.trim(),
      department: department.trim() || 'General Operations',
      project: project.trim() || 'Core / Org-wide',
      organization,
      designation: designation.trim() || 'Officer',
      contractNo,
      contractType,
      workingSchedule,
      effectiveDate,
      startDate,
      endDate: isPermanent ? null : endDate,
      probationMonths: Number(probationMonths),
      placeOfPosting,
      reportingTo,
      remunerationAmount: Number(remunerationAmount),
      statusLifecycle: 'active',
      supersedesId: existingContractToAmend ? existingContractToAmend.id : null,
      supersededAt: null,
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveContract(newContractVersion);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-card border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-md border-b border-border p-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 font-black">
              <FilePlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-foreground">
                New Contract
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 no-scrollbar">
          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-bold flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ── Employee Record (Smart 3-Character Autocomplete Search) ──── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center space-x-1.5">
                <User className="h-3.5 w-3.5 text-amber-500" />
                <span>Employee Record</span>
              </label>
              {!isAmendment && (
                <span className="text-[10.5px] font-semibold text-muted-foreground/80 flex items-center space-x-1">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  <span>Type 3+ letters to search</span>
                </span>
              )}
            </div>

            {isAmendment ? (
              /* Locked view for amendment */
              <div className="p-3 rounded-xl bg-muted/60 border border-border flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-foreground truncate">
                      {employeeName}{' '}
                      <span className="font-mono text-[11px] text-muted-foreground">({employeeCode})</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {designation} • {department}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-1 px-2 py-1 rounded-md bg-muted text-[10px] font-bold text-muted-foreground">
                  <Lock className="h-3 w-3 text-amber-500" />
                  <span>Amendment Target</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2" ref={searchRef}>
                {/* Search Bar with 3-char trigger */}
                <div className="relative">
                  <Search
                    className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${
                      hasMinChars ? 'text-amber-500' : 'text-muted-foreground'
                    }`}
                  />
                  <input
                    type="text"
                    placeholder="Search by name, ID code, designation, or department (min. 3 letters)..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setIsDropdownOpen(true);
                    }}
                    onFocus={() => {
                      if (searchQuery.trim().length >= 3) setIsDropdownOpen(true);
                    }}
                    className="w-full text-xs font-bold bg-muted/60 border border-border rounded-xl pl-10 pr-24 py-2.5 text-foreground placeholder:text-muted-foreground/60 placeholder:font-normal focus:outline-none focus:ring-1 focus:ring-amber-500 transition"
                  />

                  {/* Character indicator / clear button */}
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center space-x-1.5">
                    {searchQuery.length > 0 && searchQuery.length < 3 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground">
                        {searchQuery.length}/3
                      </span>
                    )}
                    {searchQuery.length >= 3 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-500/15 text-amber-500">
                        {suggestedEmployees.length} found
                      </span>
                    )}
                    {searchQuery.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setIsDropdownOpen(false);
                        }}
                        className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Suggestions Popover */}
                  {isDropdownOpen && hasMinChars && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 z-30 bg-card border border-border shadow-2xl rounded-xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-border/50 animate-in fade-in zoom-in-95 duration-150">
                      {suggestedEmployees.length > 0 ? (
                        <>
                          <div className="px-3 py-1.5 bg-muted/40 text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                            <span>Matching Employees ({suggestedEmployees.length})</span>
                            <span className="text-[9px] lowercase font-normal text-muted-foreground">click to select</span>
                          </div>
                          {suggestedEmployees.map((emp) => {
                            const isSelected =
                              emp.id === selectedEmpId || emp.code === employeeCode;
                            const wage =
                              emp.wage ||
                              emp.regularSalary ||
                              emp.totalCurrentSalary ||
                              0;

                            return (
                              <button
                                key={emp.id || emp.code}
                                type="button"
                                onClick={() => handleSelectEmployee(emp)}
                                className={`w-full text-left p-2.5 sm:px-3.5 flex items-center justify-between gap-3 hover:bg-amber-500/10 transition cursor-pointer ${
                                  isSelected ? 'bg-amber-500/15 border-l-2 border-amber-500' : ''
                                }`}
                              >
                                <div className="flex items-center space-x-2.5 min-w-0">
                                  <div className="h-7 w-7 rounded-lg bg-muted text-foreground font-black text-[11px] flex items-center justify-center flex-shrink-0 border border-border">
                                    {emp.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-xs font-black text-foreground truncate flex items-center space-x-1.5">
                                      <span>{emp.name}</span>
                                      <span className="font-mono text-[10.5px] font-semibold text-muted-foreground">
                                        ({emp.code})
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-muted-foreground truncate">
                                      {emp.designation || 'Staff'} •{' '}
                                      <span className="text-foreground/80 font-medium">
                                        {emp.department || 'Operations'}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center space-x-2 flex-shrink-0">
                                  {wage > 0 && (
                                    <span className="font-mono text-[10.5px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                      ৳{Number(wage).toLocaleString()}
                                    </span>
                                  )}
                                  {isSelected && (
                                    <Check className="h-4 w-4 text-amber-500" />
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </>
                      ) : (
                        <div className="p-4 text-center text-xs text-muted-foreground">
                          No employees found matching <span className="font-bold text-foreground">"{searchQuery}"</span>.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Active Selected Employee Card */}
                {employeeName && (
                  <div className="p-2.5 sm:px-3 rounded-xl bg-amber-500/5 border border-amber-500/30 flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="h-7 w-7 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-xs flex-shrink-0">
                        <UserCheck className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-foreground truncate flex items-center space-x-1.5">
                          <span className="truncate">{employeeName}</span>
                          <span className="font-mono text-[11px] font-normal text-muted-foreground">
                            ({employeeCode})
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {designation} • {department}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                        Selected Profile
                      </span>
                      <span className="font-mono text-xs font-bold text-foreground">
                        ৳{Number(remunerationAmount).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Employing Entity & Department & Project */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase text-muted-foreground">
                Employing Entity
              </label>
              <select
                value={organization}
                onChange={(e) =>
                  setOrganization(e.target.value as 'JAAGO Foundation' | 'JAAGO Foundation Trust')
                }
                className="w-full text-xs font-bold bg-muted/60 border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="JAAGO Foundation">JAAGO Foundation</option>
                <option value="JAAGO Foundation Trust">JAAGO Foundation Trust</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase text-muted-foreground">
                Department
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full text-xs font-bold bg-muted/60 border border-border rounded-xl px-3 py-2 text-foreground"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase text-muted-foreground">
                Project / Initiative
              </label>
              <input
                type="text"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="w-full text-xs font-bold bg-muted/60 border border-border rounded-xl px-3 py-2 text-foreground"
                required
              />
            </div>
          </div>

          {/* Designation & Schedule */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase text-muted-foreground">
                Official Designation
              </label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full text-xs font-bold bg-muted/60 border border-border rounded-xl px-3 py-2 text-foreground"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase text-muted-foreground">
                Contract Type
              </label>
              <select
                value={contractType}
                onChange={(e) => handleContractTypeChange(e.target.value as ContractType)}
                className="w-full text-xs font-bold bg-muted/60 border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="Permanent">Permanent</option>
                <option value="Fixed-Term">Fixed-Term</option>
                <option value="Probationary">Probationary</option>
                <option value="Project-Based">Project-Based</option>
                <option value="Intern">Intern</option>
                <option value="Consultant">Consultant</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase text-muted-foreground">
                Working Schedule
              </label>
              <select
                value={workingSchedule}
                onChange={(e) => setWorkingSchedule(e.target.value as WorkingSchedule)}
                className="w-full text-xs font-bold bg-muted/60 border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="Full-Time">Full-Time</option>
                <option value="Part-Time">Part-Time</option>
                <option value="Shift-Based">Shift-Based</option>
                <option value="Flexible">Flexible</option>
              </select>
            </div>
          </div>

          {/* Dates Progression */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-muted/30 p-3.5 rounded-xl border border-border">
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase text-muted-foreground">
                Effective Date (This Version)
              </label>
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="w-full text-xs font-bold bg-card border border-border rounded-xl px-3 py-2 text-foreground"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase text-muted-foreground">
                Employment Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs font-bold bg-card border border-border rounded-xl px-3 py-2 text-foreground"
                required
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black uppercase text-muted-foreground">
                  Contract End Date
                </label>
                <label className="flex items-center space-x-1 text-[10px] font-bold text-amber-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPermanent}
                    onChange={(e) => {
                      setIsPermanent(e.target.checked);
                      if (e.target.checked) setEndDate('');
                    }}
                    className="rounded text-amber-500"
                  />
                  <span>Permanent</span>
                </label>
              </div>
              <input
                type="date"
                value={endDate}
                disabled={isPermanent}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-xs font-bold bg-card border border-border rounded-xl px-3 py-2 text-foreground disabled:opacity-40"
              />
            </div>
          </div>

          {/* Additional Contract Particulars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase text-muted-foreground">
                Probation (Months)
              </label>
              <input
                type="number"
                min="0"
                max="12"
                value={probationMonths}
                onChange={(e) => setProbationMonths(Number(e.target.value))}
                className="w-full text-xs font-bold bg-muted/60 border border-border rounded-xl px-3 py-2 text-foreground"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase text-muted-foreground">
                Reporting To (Supervisor)
              </label>
              <input
                type="text"
                value={reportingTo}
                onChange={(e) => setReportingTo(e.target.value)}
                className="w-full text-xs font-bold bg-muted/60 border border-border rounded-xl px-3 py-2 text-foreground"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase text-muted-foreground">
                Monthly Wage (BDT)
              </label>
              <input
                type="number"
                min="0"
                step="500"
                value={remunerationAmount}
                onChange={(e) => setRemunerationAmount(Number(e.target.value))}
                className="w-full text-xs font-bold bg-muted/60 border border-border rounded-xl px-3 py-2 text-foreground"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase text-muted-foreground">
              Place of Posting
            </label>
            <input
              type="text"
              value={placeOfPosting}
              onChange={(e) => setPlaceOfPosting(e.target.value)}
              className="w-full text-xs font-bold bg-muted/60 border border-border rounded-xl px-3 py-2 text-foreground"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase text-muted-foreground">
              Governance Remarks / Version Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Annual renewal following satisfactory performance evaluation..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs font-medium bg-muted/60 border border-border rounded-xl p-3 text-foreground resize-none"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-border flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center space-x-2 px-5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md shadow-amber-500/20 transition active:scale-95 cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isAmendment ? 'Issue Version Amendment' : 'Create Contract'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
