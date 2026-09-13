'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Camera,
  Upload,
  ArrowLeft,
  Save,
  CheckCircle2,
  AlertCircle,
  Building2,
  Briefcase,
  Calendar as CalendarIcon,
  DollarSign,
  Clock,
  History,
  User,
  Mail,
  Phone,
  Heart,
  MapPin,
  Sparkles,
  Search,
  Trash2,
  Shield,
  Activity,
  ChevronRight,
  UserCheck,
  Layers,
  Move,
  CalendarDays,
  ArrowUpRight,
  Plus,
  X,
  FilePlus,
  FileText,
  Printer,
  Edit3,
  XCircle,
  Paperclip,
} from 'lucide-react';
import { uploadEmployeePhoto } from '@/lib/supabase-storage';
import { AvatarCropModal } from './avatar-crop-modal';
import { NewContractModal } from '@/components/contracts/NewContractModal';
import { ContractDocumentModal } from '@/components/contracts/ContractDocumentModal';
import {
  EmploymentContractVersion,
  convertEmployeeToContract,
  getStoredCustomContracts,
  saveStoredCustomContracts,
  deriveContractStatus,
} from '@/lib/contracts-engine';
import { formatDisplayDate } from '@/lib/date-format';
import {
  AttendanceLogItem,
  getEmployeeAttendanceLogs,
  fetchAttendanceLogsFromSupabase,
  calculateWorkingHoursString,
  getLocalShifts,
  ShiftItem,
} from '@/lib/supabase-attendance';
import {
  AttendanceRegularizationItem,
  getLocalRegularizations,
  submitAttendanceRegularization,
  calculateShiftStandardTimes,
} from '@/lib/supabase-regularization';
import {
  fetchOrganizationsFromSupabase,
  fetchBranchesFromSupabase,
  fetchDepartmentsFromSupabase,
  fetchProjectsFromSupabase,
  fetchTeamsFromSupabase,
  fetchDesignationsFromSupabase,
  fetchInsuranceCategoriesFromSupabase,
  type OrganizationEntity,
  type OrganizationBranch,
  type DepartmentItem,
  type ProjectItem,
  type TeamItem,
  type DesignationItem,
  type InsuranceCategoryItem,
} from '@/lib/supabase-organization';
import {
  fetchLeaveAllocations,
  fetchLeaveRequests,
  saveLeaveRequest,
  validateLeaveGenderEligibility,
  type LeaveAllocationItem,
  type LeaveRequestItem,
  type LeaveType,
  type HalfDayType,
  BEREAVEMENT_RELATIONSHIPS,
  type BereavementRelationship,
  QUICK_LEAVE_POLICIES,
  fetchPublicHolidays,
  type PublicHolidayItem,
  calculateCasualLeaveDuration,
  validateCasualLeaveRules,
  calculateAnnualLeaveDuration,
  validateAnnualLeaveRules,
} from '@/lib/supabase-time-off';
import { saveEmployeeToSupabase } from '@/lib/supabase-employees';
import { invalidateCache } from '@/lib/data-cache';

export type EmployeeStatus = 'Active' | 'Terminated' | 'Resigned' | 'Incomplete' | 'Archived';

export interface LogHistoryEntry {
  id: string;
  timestamp: string; // ISO string
  formattedDate: string;
  userName: string;
  userRole: string;
  field: string;
  oldValue: string;
  newValue: string;
  actionType?: 'create' | 'update' | 'upload' | 'status_change' | undefined;
}

export interface FullEmployeeProfile {
  id: string;
  name: string;
  code: string;
  avatarUrl?: string | undefined;
  designation: string;
  workEmail: string;
  workMobile: string;
  status: EmployeeStatus;
  isArchived?: boolean;
  workingSchedule: string;

  // ── Tab 1: Work ──
  organization: string;
  branch: string;
  department: string;
  project: string;
  team?: string | undefined;
  supervisor: string;
  secondarySupervisor: string;
  workLocation: string;
  remark: string;

  // ── Tab 2: Personal ──
  // Personal Contact
  personalEmail: string;
  personalPhone: string;
  bankName: string;
  bankAccountNumber: string;
  // Personal Information
  nickName: string;
  nid: string;
  bloodGroup: 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-' | '';
  birthday: string; // YYYY-MM-DD
  gender: 'MALE' | 'FEMALE' | 'OTHER' | '';
  religion: string;
  maritalStatus: 'Single' | 'Married' | 'Divorced' | 'Widowed' | '';
  // Emergency Contact
  emergencyContactName: string;
  emergencyPhone: string;
  // Citizenship & Location
  nationality: string;
  passportNo: string;
  homeAddress: string;
  dependentChildren: number;

  // ── Tab 3: Payroll ──
  // Contract Overview
  joiningDate: string; // YYYY-MM-DD
  contractEndDate: string; // YYYY-MM-DD
  wageType: 'Fixed' | 'Hourly';
  wage: number;
  salaryJulDec: number;
  salaryJanJun: number;
  monthlyTotalAllowance: 'Yes' | 'No';
  sixMonthsCompletionStatus: 'Yes' | 'No';
  probationaryStatus: 'Confirmed' | 'On Probation';
  contractType: 'Full Time' | 'Part Time' | 'Shift' | 'Hourly' | 'Commission';
  noTaxDeduction: boolean;
  bonusEligibility: 'Yes' | 'No';
  pfApplies: 'Yes' | 'No';
  pfRate: number;
  // Payroll Adjustment
  regularSalary: number;
  extraHours: number;
  extraPayment: number;
  calculationValue: string;
  temporarySalary: number;
  totalCurrentSalary: number;
  currency: 'BDT' | 'USD' | 'EUR';
  adjustmentStartDate: string;
  adjustmentEndDate: string;
  assignedTeacherStaff: string;
  payrollRemark: string;

  // ── Tab 4: Insurance ──
  insuranceStatus?: 'Active' | 'Inactive' | string | undefined;
  insuranceCoverageCategory?: string | undefined;
  insuranceMonthlyPremium?: number | undefined;
  employeeHealthInsuranceId?: string | undefined;
  spouseHealthInsuranceId?: string | undefined;
  spouseName?: string | undefined;
  child1HealthInsuranceId?: string | undefined;
  child1Name?: string | undefined;
  child2HealthInsuranceId?: string | undefined;
  child2Name?: string | undefined;
  child3HealthInsuranceId?: string | undefined;
  child3Name?: string | undefined;

  // ── Tab 5: DSP (Digital School Program) ──
  officeDays: string;
  customOfficeDaysFrom?: string | undefined;
  customOfficeDaysTo?: string | undefined;
  officeHours: string;
  rfid: string;
  leaveGroup: string;
  employeeType: 'Permanent' | 'Contractual' | 'Volunteer' | 'Intern' | 'Consultant';

  // ── Tab 6: Leave & Attendance ──
  leavePolicy?: string | undefined;
  casualLeaveAllocated?: number | undefined;
  casualLeaveUsed?: number | undefined;
  sickLeaveAllocated?: number | undefined;
  sickLeaveUsed?: number | undefined;
  earnedLeaveAllocated?: number | undefined;
  earnedLeaveUsed?: number | undefined;
  specialLeaveAllocated?: number | undefined;
  specialLeaveUsed?: number | undefined;
  weekendDays?: string | undefined;
  overtimeEligible?: string | undefined;
  attendanceGracePeriodMin?: number | undefined;
  allowRegularization?: boolean | undefined;

  // ── Tab 7: Log History ──
  logHistory: LogHistoryEntry[];

  // User provisioning
  isUser?: boolean | undefined;
  userId?: string | undefined;
}

interface EmployeeProfileDetailProps {
  initialData?: FullEmployeeProfile | null | undefined;
  allEmployees: {
    id: string;
    name: string;
    code: string;
    designation: string;
    department: string;
    avatarUrl?: string | undefined;
    organization?: string | undefined;
    branch?: string | undefined;
    project?: string | undefined;
    team?: string | undefined;
    workingSchedule?: string | undefined;
  }[];
  currentUser?: { fullName: string; jobTitle: string } | undefined;
  readOnly?: boolean | undefined;
  onSave: (updatedProfile: FullEmployeeProfile) => void;
  onBack: () => void;
  onDelete?: ((code: string) => void) | undefined;
  onCreateUser?: ((employee: FullEmployeeProfile) => void) | undefined;
  onProfileChange?: ((updatedProfile: FullEmployeeProfile) => void) | undefined;
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] as const;
const MARITAL_STATUSES = ['Single', 'Married', 'Divorced', 'Widowed'] as const;
const RELIGIONS = ['Islam', 'Hinduism', 'Christianity', 'Buddhism', 'Other'] as const;
const CONTRACT_TYPES = ['Full Time', 'Part Time', 'Shift', 'Hourly', 'Commission'] as const;
const EMPLOYEE_TYPES = ['Permanent', 'Contractual', 'Volunteer', 'Intern', 'Consultant'] as const;
const LEAVE_GROUPS = ['Standard Full-time', 'DSP Faculty Group', 'Project Staff', 'Casual/Intern Pool'] as const;
const DEFAULT_OFFICE_DAYS = ['Sunday to Thursday', 'Sunday to Thursday (Full Week)', 'Monday to Friday', 'Saturday to Wednesday'] as const;
const DEFAULT_OFFICE_HOURS = ['08:00 AM - 04:00 PM', '09:00 AM - 05:00 PM', '10:00 AM - 06:00 PM', '08:30 AM - 04:30 PM', '07:30 AM - 03:30 PM'] as const;

export function EmployeeProfileDetail({
  initialData,
  allEmployees,
  currentUser = { fullName: 'Nasif Kamal', jobTitle: 'Coordinator' },
  readOnly = false,
  onSave,
  onBack,
  onDelete,
  onCreateUser,
  onProfileChange,
}: EmployeeProfileDetailProps) {
  const isNew = !initialData?.id;

  // Active Tab state: 'WORK' | 'PERSONAL' | 'PAYROLL' | 'CONTRACTS' | 'INSURANCE' | 'DSP' | 'LEAVE_ATTENDANCE' | 'LOG_HISTORY'
  const [activeTab, setActiveTab] = useState<'WORK' | 'PERSONAL' | 'PAYROLL' | 'CONTRACTS' | 'INSURANCE' | 'DSP' | 'LEAVE_ATTENDANCE' | 'LOG_HISTORY'>('WORK');

  // Dynamic organization metadata options from Supabase
  const [organizations, setOrganizations] = useState<OrganizationEntity[]>([]);
  const [branches, setBranches] = useState<OrganizationBranch[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [designations, setDesignations] = useState<DesignationItem[]>([]);
  const [insuranceCategories, setInsuranceCategories] = useState<InsuranceCategoryItem[]>([]);
  const [shifts, setShifts] = useState<ShiftItem[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function loadMetadata() {
      try {
        const [orgs, brs, depts, projs, tms, desigs, insCats] = await Promise.all([
          fetchOrganizationsFromSupabase(),
          fetchBranchesFromSupabase(),
          fetchDepartmentsFromSupabase(),
          fetchProjectsFromSupabase(),
          fetchTeamsFromSupabase(),
          fetchDesignationsFromSupabase(),
          fetchInsuranceCategoriesFromSupabase(),
        ]);
        const loadedShifts = getLocalShifts();
        if (isMounted) {
          setOrganizations(orgs);
          setBranches(brs);
          setDepartments(depts);
          setProjects(projs);
          setTeams(tms);
          setDesignations(desigs);
          setInsuranceCategories(insCats);
          if (loadedShifts) setShifts(loadedShifts);
        }
      } catch (err) {
        console.error('Error loading organization metadata:', err);
      }

      fetchAttendanceLogsFromSupabase(true).then(() => {
        if (isMounted) {
          setAttendanceRefresh((prev) => prev + 1);
        }
      }).catch(() => {});
    }
    loadMetadata();

    const handleAttUpdate = () => {
      fetchAttendanceLogsFromSupabase(true).then(() => {
        setAttendanceRefresh((prev) => prev + 1);
      }).catch(() => {
        setAttendanceRefresh((prev) => prev + 1);
      });
    };
    window.addEventListener('jaago_attendance_updated', handleAttUpdate);
    window.addEventListener('storage', handleAttUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener('jaago_attendance_updated', handleAttUpdate);
      window.removeEventListener('storage', handleAttUpdate);
    };
  }, []);

  const [, setAttendanceRefresh] = useState(0);

  // Form State
  const [formData, setFormData] = useState<FullEmployeeProfile>(() => {
    if (initialData) {
      return {
        ...initialData,
        team: initialData.team || '',
        insuranceStatus: initialData.insuranceStatus || 'Active',
        insuranceCoverageCategory: initialData.insuranceCoverageCategory || 'Standard Full-Time (Plan B)',
        insuranceMonthlyPremium: initialData.insuranceMonthlyPremium ?? 1500,
        employeeHealthInsuranceId: initialData.employeeHealthInsuranceId || '',
        spouseHealthInsuranceId: initialData.spouseHealthInsuranceId || '',
        spouseName: initialData.spouseName || '',
        child1HealthInsuranceId: initialData.child1HealthInsuranceId || '',
        child1Name: initialData.child1Name || '',
        child2HealthInsuranceId: initialData.child2HealthInsuranceId || '',
        child2Name: initialData.child2Name || '',
        child3HealthInsuranceId: initialData.child3HealthInsuranceId || '',
        child3Name: initialData.child3Name || '',
        logHistory: initialData.logHistory || [],
        allowRegularization:
          (initialData as any).allowRegularization !== undefined
            ? (initialData as any).allowRegularization !== false
            : (initialData as any).allow_regularization !== undefined
            ? Boolean((initialData as any).allow_regularization)
            : (initialData as any).regularization_allowed !== undefined
            ? Boolean((initialData as any).regularization_allowed)
            : true,
      };
    }

    const newCode = `JFT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    return {
      id: `emp-${Date.now()}`,
      name: '',
      code: newCode,
      avatarUrl: '',
      designation: 'Program Officer',
      workEmail: '',
      workMobile: '+880 17',
      status: 'Active',
      workingSchedule: 'JAAGO HQ (10:00 AM - 06:00 PM)',

      // Work
      organization: 'JAAGO Foundation Trust',
      branch: 'Head Office (Banani)',
      department: 'Program Implementation',
      project: 'General Operations',
      team: '',
      supervisor: 'Nasif Kamal',
      secondarySupervisor: 'S M Nayeem Rahman',
      workLocation: 'Banani, Dhaka',
      remark: '',

      // Personal
      personalEmail: '',
      personalPhone: '',
      bankName: 'Eastern Bank Ltd',
      bankAccountNumber: '',
      nickName: '',
      nid: '',
      bloodGroup: 'B+',
      birthday: '1996-05-15',
      gender: 'MALE',
      religion: 'Islam',
      maritalStatus: 'Single',
      emergencyContactName: '',
      emergencyPhone: '',
      nationality: 'Bangladeshi',
      passportNo: '',
      homeAddress: 'Road 11, Banani, Dhaka-1213',
      dependentChildren: 0,

      // Payroll
      joiningDate: new Date().toISOString().slice(0, 10),
      contractEndDate: '2028-12-31',
      wageType: 'Fixed',
      wage: 65000,
      salaryJulDec: 65000,
      salaryJanJun: 65000,
      monthlyTotalAllowance: 'Yes',
      sixMonthsCompletionStatus: 'Yes',
      probationaryStatus: 'Confirmed',
      contractType: 'Full Time',
      noTaxDeduction: false,
      bonusEligibility: 'Yes',
      pfApplies: 'Yes',
      pfRate: 10.0,
      regularSalary: 65000,
      extraHours: 0,
      extraPayment: 0,
      calculationValue: '1.0x',
      temporarySalary: 0,
      totalCurrentSalary: 65000,
      currency: 'BDT',
      adjustmentStartDate: new Date().toISOString().slice(0, 10),
      adjustmentEndDate: '2028-12-31',
      assignedTeacherStaff: 'General Staff',
      payrollRemark: 'Standard permanent payroll configuration',

      // Insurance
      insuranceStatus: 'Active',
      insuranceCoverageCategory: 'Standard Full-Time (Plan B)',
      insuranceMonthlyPremium: 1500,
      employeeHealthInsuranceId: '',
      spouseHealthInsuranceId: '',
      spouseName: '',
      child1HealthInsuranceId: '',
      child1Name: '',
      child2HealthInsuranceId: '',
      child2Name: '',
      child3HealthInsuranceId: '',
      child3Name: '',

      // DSP
      officeDays: 'Sunday to Thursday',
      officeHours: '09:00 AM - 05:00 PM',
      rfid: `RFID-${Math.floor(100000 + Math.random() * 900000)}`,
      leaveGroup: 'Standard Full-time',
      employeeType: 'Permanent',

      logHistory: [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          formattedDate: new Date().toLocaleString('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short',
          }),
          userName: currentUser.fullName || 'Nasif Kamal',
          userRole: currentUser.jobTitle || 'Coordinator',
          field: 'Profile Creation',
          oldValue: 'None',
          newValue: 'Draft initialized',
          actionType: 'create',
        },
      ],
      isUser: false,
      allowRegularization: true,
    };
  });

  // Keep formData synchronized when initialData updates
  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({
        ...prev,
        ...initialData,
        allowRegularization:
          (initialData as any).allowRegularization !== undefined
            ? (initialData as any).allowRegularization !== false
            : (initialData as any).allow_regularization !== undefined
            ? Boolean((initialData as any).allow_regularization)
            : (initialData as any).regularization_allowed !== undefined
            ? Boolean((initialData as any).regularization_allowed)
            : true,
      }));
    }
  }, [initialData]);

  // Track original for diff logging
  const originalStateRef = useRef<FullEmployeeProfile>(formData);

  useEffect(() => {
    const targetCode = formData.code || formData.id;
    if (targetCode) {
      fetchAttendanceLogsFromSupabase(true, targetCode).then(() => {
        setAttendanceRefresh((prev) => prev + 1);
      }).catch(() => {});
    }
  }, [formData.code, formData.id]);

  // Dynamically compute all unique departments (Supabase master + all employee departments + current profile)
  const dynamicDepartments = useMemo(() => {
    const map = new Map<string, string>();
    departments.forEach((d) => {
      if (d.name && d.name.trim()) map.set(d.name.trim().toLowerCase(), d.name.trim());
    });
    if (Array.isArray(allEmployees)) {
      allEmployees.forEach((emp) => {
        if (emp.department && emp.department.trim()) {
          const key = emp.department.trim().toLowerCase();
          if (!map.has(key)) map.set(key, emp.department.trim());
        }
      });
    }
    if (formData.department && formData.department.trim()) {
      const key = formData.department.trim().toLowerCase();
      if (!map.has(key)) map.set(key, formData.department.trim());
    }
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [departments, allEmployees, formData.department]);

  // Dynamically compute all unique designations (Supabase master + all employee designations + current profile)
  const dynamicDesignations = useMemo(() => {
    const map = new Map<string, string>();
    designations.forEach((d) => {
      if (d.name && d.name.trim()) map.set(d.name.trim().toLowerCase(), d.name.trim());
    });
    if (Array.isArray(allEmployees)) {
      allEmployees.forEach((emp) => {
        if (emp.designation && emp.designation.trim()) {
          const key = emp.designation.trim().toLowerCase();
          if (!map.has(key)) map.set(key, emp.designation.trim());
        }
      });
    }
    if (formData.designation && formData.designation.trim()) {
      const key = formData.designation.trim().toLowerCase();
      if (!map.has(key)) map.set(key, formData.designation.trim());
    }
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [designations, allEmployees, formData.designation]);

  // Dynamically compute all unique organizations
  const dynamicOrganizations = useMemo(() => {
    const map = new Map<string, string>();
    organizations.forEach((o) => {
      if (o.name && o.name.trim()) map.set(o.name.trim().toLowerCase(), o.name.trim());
    });
    if (Array.isArray(allEmployees)) {
      allEmployees.forEach((emp) => {
        if (emp.organization && emp.organization.trim()) {
          const key = emp.organization.trim().toLowerCase();
          if (!map.has(key)) map.set(key, emp.organization.trim());
        }
      });
    }
    if (formData.organization && formData.organization.trim()) {
      const key = formData.organization.trim().toLowerCase();
      if (!map.has(key)) map.set(key, formData.organization.trim());
    }
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [organizations, allEmployees, formData.organization]);

  // Dynamically compute all unique branches
  const dynamicBranches = useMemo(() => {
    const map = new Map<string, string>();
    branches.forEach((b) => {
      if (b.name && b.name.trim()) map.set(b.name.trim().toLowerCase(), b.name.trim());
    });
    if (Array.isArray(allEmployees)) {
      allEmployees.forEach((emp) => {
        if (emp.branch && emp.branch.trim()) {
          const key = emp.branch.trim().toLowerCase();
          if (!map.has(key)) map.set(key, emp.branch.trim());
        }
      });
    }
    if (formData.branch && formData.branch.trim()) {
      const key = formData.branch.trim().toLowerCase();
      if (!map.has(key)) map.set(key, formData.branch.trim());
    }
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [branches, allEmployees, formData.branch]);

  // Dynamically compute all unique projects
  const dynamicProjects = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((p) => {
      if (p.name && p.name.trim()) map.set(p.name.trim().toLowerCase(), p.name.trim());
    });
    if (Array.isArray(allEmployees)) {
      allEmployees.forEach((emp) => {
        if (emp.project && emp.project.trim()) {
          const key = emp.project.trim().toLowerCase();
          if (!map.has(key)) map.set(key, emp.project.trim());
        }
      });
    }
    if (formData.project && formData.project.trim()) {
      const key = formData.project.trim().toLowerCase();
      if (!map.has(key)) map.set(key, formData.project.trim());
    }
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [projects, allEmployees, formData.project]);

  // Dynamically compute all unique teams
  const dynamicTeams = useMemo(() => {
    const map = new Map<string, string>();
    teams.forEach((t) => {
      if (t.name && t.name.trim()) map.set(t.name.trim().toLowerCase(), t.name.trim());
    });
    if (Array.isArray(allEmployees)) {
      allEmployees.forEach((emp) => {
        if (emp.team && emp.team.trim()) {
          const key = emp.team.trim().toLowerCase();
          if (!map.has(key)) map.set(key, emp.team.trim());
        }
      });
    }
    if (formData.team && formData.team.trim()) {
      const key = formData.team.trim().toLowerCase();
      if (!map.has(key)) map.set(key, formData.team.trim());
    }
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [teams, allEmployees, formData.team]);

  // Dynamically compute all unique working schedules
  const dynamicWorkingSchedules = useMemo(() => {
    const set = new Set<string>();
    shifts.forEach((s) => {
      set.add(`${s.name} (${s.officeStart} - ${s.officeEnd})`);
    });
    if (Array.isArray(allEmployees)) {
      allEmployees.forEach((emp) => {
        if (emp.workingSchedule && emp.workingSchedule.trim()) {
          set.add(emp.workingSchedule.trim());
        }
      });
    }
    if (formData.workingSchedule && formData.workingSchedule.trim()) {
      set.add(formData.workingSchedule.trim());
    }
    return Array.from(set);
  }, [shifts, allEmployees, formData.workingSchedule]);

  // Sync state whenever initialData updates asynchronously from Supabase
  useEffect(() => {
    if (initialData && initialData.code) {
      setFormData({
        ...initialData,
        team: initialData.team || '',
        insuranceStatus: initialData.insuranceStatus || 'Active',
        insuranceCoverageCategory: initialData.insuranceCoverageCategory || 'Standard Full-Time (Plan B)',
        insuranceMonthlyPremium: initialData.insuranceMonthlyPremium ?? 1500,
        employeeHealthInsuranceId: initialData.employeeHealthInsuranceId || '',
        spouseHealthInsuranceId: initialData.spouseHealthInsuranceId || '',
        spouseName: initialData.spouseName || '',
        child1HealthInsuranceId: initialData.child1HealthInsuranceId || '',
        child1Name: initialData.child1Name || '',
        child2HealthInsuranceId: initialData.child2HealthInsuranceId || '',
        child2Name: initialData.child2Name || '',
        child3HealthInsuranceId: initialData.child3HealthInsuranceId || '',
        child3Name: initialData.child3Name || '',
      });
      originalStateRef.current = { ...initialData };
      setSupervisorQuery(initialData.supervisor || '');
      setSecSupervisorQuery(initialData.secondarySupervisor || '');
    }
  }, [initialData]);

  // Picture upload & Drag-to-Adjust Cropper state
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoSuccess, setPhotoSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropRawImageSrc, setCropRawImageSrc] = useState<string | null>(null);
  const [isDragOverPhoto, setIsDragOverPhoto] = useState(false);

  // Supervisor autocomplete states
  const [supervisorQuery, setSupervisorQuery] = useState(formData.supervisor || '');
  const [showSupervisorDropdown, setShowSupervisorDropdown] = useState(false);
  const [secSupervisorQuery, setSecSupervisorQuery] = useState(formData.secondarySupervisor || '');
  const [showSecSupervisorDropdown, setShowSecSupervisorDropdown] = useState(false);
  const supervisorRef = useRef<HTMLDivElement>(null);
  const secSupervisorRef = useRef<HTMLDivElement>(null);

  // Click outside to auto-close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (supervisorRef.current && !supervisorRef.current.contains(event.target as Node)) {
        setShowSupervisorDropdown(false);
      }
      if (secSupervisorRef.current && !secSupervisorRef.current.contains(event.target as Node)) {
        setShowSecSupervisorDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Custom Office Days state
  const [officeDaysOptions, setOfficeDaysOptions] = useState<string[]>([...DEFAULT_OFFICE_DAYS]);
  const [isCustomDays, setIsCustomDays] = useState(false);
  const [customDaysFrom, setCustomDaysFrom] = useState('Saturday');
  const [customDaysTo, setCustomDaysTo] = useState('Wednesday');

  // Notification / Save feedback
  const [saveToast, setSaveToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // ── Employment Contracts Live Integration ──
  const [isNewContractModalOpen, setIsNewContractModalOpen] = useState(false);
  const [contractToAmend, setContractToAmend] = useState<EmploymentContractVersion | null>(null);
  const [selectedContractForDoc, setSelectedContractForDoc] = useState<EmploymentContractVersion | null>(null);
  const [contractsRevision, setContractsRevision] = useState(0);

  // Compute full contracts history list for this employee
  const employeeContracts = useMemo(() => {
    const baseContract = convertEmployeeToContract(formData);
    const customStored = getStoredCustomContracts();
    const matchingCustom = customStored.filter(
      (c) => c.employeeId === formData.id || c.employeeCode === formData.code
    );

    if (matchingCustom.length === 0) {
      return [baseContract];
    }

    // Sort custom versions newest first
    const sorted = [...matchingCustom].sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
    return sorted;
  }, [formData, contractsRevision]);

  // Ensure full employee profile array is available for modal autocomplete
  const allFullEmployees = useMemo<FullEmployeeProfile[]>(() => {
    const map = new Map<string, FullEmployeeProfile>();
    map.set(formData.code, formData);
    if (Array.isArray(allEmployees)) {
      allEmployees.forEach((emp) => {
        if (!map.has(emp.code)) {
          map.set(emp.code, {
            ...formData,
            id: emp.id,
            code: emp.code,
            name: emp.name,
            designation: emp.designation,
            department: emp.department,
            avatarUrl: emp.avatarUrl,
            organization: emp.organization || formData.organization,
            branch: emp.branch || formData.branch,
            project: emp.project || formData.project,
            team: emp.team || '',
            workingSchedule: emp.workingSchedule || formData.workingSchedule,
          });
        }
      });
    }
    return Array.from(map.values());
  }, [allEmployees, formData]);

  // Handle contract save with bi-directional profile update
  const handleSaveContract = (newContract: EmploymentContractVersion) => {
    const customStored = getStoredCustomContracts();
    const filtered = customStored.filter((c) => c.id !== newContract.id);
    const updatedContracts = [newContract, ...filtered];
    saveStoredCustomContracts(updatedContracts);
    setContractsRevision((prev) => prev + 1);

    // Update current employee profile fields with bi-directional sync
    const wageNum = Number(newContract.remunerationAmount || formData.wage || 0);
    const scheduleStr =
      newContract.workingSchedule === 'Full-Time'
        ? 'JAAGO HQ (10:00 AM - 06:00 PM)'
        : newContract.workingSchedule;

    const contractTypeStr =
      newContract.contractType === 'Fixed-Term'
        ? 'Full Time'
        : (newContract.contractType as any) || formData.contractType;

    const empTypeStr =
      newContract.contractType === 'Permanent'
        ? 'Permanent'
        : newContract.contractType === 'Intern'
        ? 'Intern'
        : newContract.contractType === 'Consultant'
        ? 'Consultant'
        : 'Contractual';

    const probStatus =
      newContract.contractType === 'Probationary' ? 'On Probation' : 'Confirmed';

    const totalSalaryCalc = wageNum + Number(formData.extraPayment || 0) + Number(formData.temporarySalary || 0);

    const now = new Date();
    const newLogEntry: LogHistoryEntry = {
      id: `log-${Date.now()}`,
      timestamp: now.toISOString(),
      formattedDate: now.toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
      userName: currentUser.fullName || 'Nasif Kamal',
      userRole: currentUser.jobTitle || 'Coordinator',
      field: 'Employment Contract',
      oldValue: formData.contractEndDate ? `Ended: ${formatDisplayDate(formData.contractEndDate)}` : 'Active Base Contract',
      newValue: `Contract Ref: ${newContract.contractNo} (Wage: ৳${wageNum.toLocaleString()}, Type: ${newContract.contractType})`,
      actionType: 'update',
    };

    const updatedProfile: FullEmployeeProfile = {
      ...formData,
      wage: wageNum,
      regularSalary: wageNum,
      totalCurrentSalary: totalSalaryCalc,
      salaryJulDec: wageNum,
      salaryJanJun: wageNum,
      designation: newContract.designation || formData.designation,
      department: newContract.department || formData.department,
      organization: newContract.organization || formData.organization,
      project: newContract.project || formData.project,
      supervisor: newContract.reportingTo || formData.supervisor,
      workLocation: newContract.placeOfPosting || formData.workLocation,
      joiningDate: newContract.startDate || formData.joiningDate,
      contractEndDate: newContract.endDate || '',
      workingSchedule: scheduleStr,
      contractType: contractTypeStr,
      employeeType: empTypeStr as any,
      probationaryStatus: probStatus as any,
      logHistory: [newLogEntry, ...(formData.logHistory || [])],
    };

    setFormData(updatedProfile);
    originalStateRef.current = { ...updatedProfile };
    onSave(updatedProfile);
    setIsNewContractModalOpen(false);
    setContractToAmend(null);
    setSaveToast({
      message: `Contract ${newContract.contractNo} saved & synced with profile!`,
      type: 'success',
    });
    setTimeout(() => setSaveToast(null), 3500);
  };

  // Leave & Attendance live connection
  const [empLeaveAllocation, setEmpLeaveAllocation] = useState<LeaveAllocationItem | null>(null);
  const [empLeaveRequests, setEmpLeaveRequests] = useState<LeaveRequestItem[]>([]);
  const [showProfileLeaveModal, setShowProfileLeaveModal] = useState(false);
  const [profileLeaveForm, setProfileLeaveForm] = useState<{
    leaveType: LeaveType;
    fromDate: string;
    toDate: string;
    totalDays: number;
    halfDayType: HalfDayType;
    reason: string;
    pregnancyConfirmationDate: string;
    expectedDeliveryDate: string;
    intendedMaternityStartDate: string;
    bereavementRelationship: BereavementRelationship | '';
    attachmentName?: string;
    attachmentUrl?: string;
  }>({
    leaveType: 'Casual Leave',
    fromDate: new Date().toISOString().split('T')[0]!,
    toDate: new Date().toISOString().split('T')[0]!,
    totalDays: 1,
    halfDayType: 'Full Day',
    reason: '',
    pregnancyConfirmationDate: '',
    expectedDeliveryDate: '',
    intendedMaternityStartDate: '',
    bereavementRelationship: '',
    attachmentName: '',
    attachmentUrl: '',
  });
  const [profileLeaveError, setProfileLeaveError] = useState<string | null>(null);
  const [policyErrorModal, setPolicyErrorModal] = useState<{ isOpen: boolean; title: string; reason: string } | null>(null);
  const [holidays, setHolidays] = useState<PublicHolidayItem[]>([]);

  // Real-time Casual Leave calculation breakdown (sandwiched holidays, boundary exclusion)
  const profileCasualCalcInfo = useMemo(() => {
    if (profileLeaveForm.leaveType !== 'Casual Leave') return null;
    return calculateCasualLeaveDuration(
      profileLeaveForm.fromDate,
      profileLeaveForm.toDate,
      profileLeaveForm.halfDayType === 'Full Day' ? 'FULL' : 'HALF',
      holidays
    );
  }, [profileLeaveForm.leaveType, profileLeaveForm.fromDate, profileLeaveForm.toDate, profileLeaveForm.halfDayType, holidays]);

  // Real-time Annual Leave calculation breakdown (working days, internal weekends/holidays, boundary exclusion)
  const profileAnnualCalcInfo = useMemo(() => {
    if (profileLeaveForm.leaveType !== 'Annual Leave') return null;
    return calculateAnnualLeaveDuration(
      profileLeaveForm.fromDate,
      profileLeaveForm.toDate,
      holidays
    );
  }, [profileLeaveForm.leaveType, profileLeaveForm.fromDate, profileLeaveForm.toDate, holidays]);

  // Attendance Regularization live connection
  const [regularizations, setRegularizations] = useState<AttendanceRegularizationItem[]>(() => {
    if (typeof window !== 'undefined') {
      return getLocalRegularizations();
    }
    return [];
  });
  const [profileRegModal, setProfileRegModal] = useState<{
    isOpen: boolean;
    log: AttendanceLogItem | null;
    adjustedCheckIn: string;
    adjustedCheckOut: string;
    reason: string;
    notes: string;
    isSubmitting: boolean;
  } | null>(null);

  useEffect(() => {
    const handleRegUpdate = () => {
      setRegularizations(getLocalRegularizations());
    };
    window.addEventListener('jaago_attendance_regularization_updated', handleRegUpdate);
    window.addEventListener('storage', handleRegUpdate);
    return () => {
      window.removeEventListener('jaago_attendance_regularization_updated', handleRegUpdate);
      window.removeEventListener('storage', handleRegUpdate);
    };
  }, []);

  const handleToggleRegularization = (enabled: boolean) => {
    const updatedProfile = { ...formData, allowRegularization: enabled };
    setFormData(updatedProfile);
    if (onProfileChange) {
      onProfileChange(updatedProfile);
    }
    try {
      const fId = (formData.id || '').trim();
      const fCode = (formData.code || '').toLowerCase().trim();
      const fName = (formData.name || '').toLowerCase().trim();
      const fEmail = (formData.workEmail || '').toLowerCase().trim();

      // 1. Update jaago_pnc_employees_v2 (canonical employee list)
      const rawEmps = localStorage.getItem('jaago_pnc_employees_v2');
      if (rawEmps) {
        const list = JSON.parse(rawEmps);
        const idx = list.findIndex(
          (e: any) =>
            (fId && e.id === fId) ||
            (fCode && (e.code || '').toLowerCase().trim() === fCode) ||
            (fEmail && (e.workEmail || '').toLowerCase().trim() === fEmail) ||
            (fName && (e.name || '').toLowerCase().trim() === fName)
        );
        if (idx >= 0) {
          list[idx] = {
            ...list[idx],
            allowRegularization: enabled,
            allow_regularization: enabled,
            regularization_allowed: enabled,
          };
          localStorage.setItem('jaago_pnc_employees_v2', JSON.stringify(list));
        }
      }

      // Also update legacy jaago_employees_cache if present
      const rawOldEmps = localStorage.getItem('jaago_employees_cache');
      if (rawOldEmps) {
        const list = JSON.parse(rawOldEmps);
        const idx = list.findIndex(
          (e: any) =>
            (fId && e.id === fId) ||
            (fCode && (e.code || '').toLowerCase().trim() === fCode) ||
            (fEmail && (e.workEmail || '').toLowerCase().trim() === fEmail) ||
            (fName && (e.name || '').toLowerCase().trim() === fName)
        );
        if (idx >= 0) {
          list[idx] = {
            ...list[idx],
            allowRegularization: enabled,
            allow_regularization: enabled,
            regularization_allowed: enabled,
          };
          localStorage.setItem('jaago_employees_cache', JSON.stringify(list));
        }
      }

      // 2. Invalidate SWR data cache so components immediately refetch fresh data
      invalidateCache('pnc_employees_list');

      // 3. Update jaago_user if it matches current user
      const rawUser = localStorage.getItem('jaago_user');
      let updatedUserObj: any = null;
      if (rawUser) {
        const u = JSON.parse(rawUser);
        const uCode = (u.employeeCode || u.employeeId || '').toLowerCase().trim();
        const uEmail = (u.email || '').toLowerCase().trim();
        const uName = (u.fullName || u.name || '').toLowerCase().trim();
        const isMatch =
          (fCode && uCode && (uCode === fCode || uCode.includes(fCode) || fCode.includes(uCode))) ||
          (fId && (u.id === fId || uCode === fId.toLowerCase())) ||
          (fEmail && uEmail && uEmail === fEmail) ||
          (fName && uName && (uName === fName || uName.includes(fName) || fName.includes(uName)));

        if (isMatch) {
          u.allowRegularization = enabled;
          localStorage.setItem('jaago_user', JSON.stringify(u));
          document.cookie = `jaago_user=${encodeURIComponent(JSON.stringify(u))}; path=/; max-age=604800; SameSite=Lax`;
          updatedUserObj = u;
        }
      }

      // 4. Save to Supabase in background
      const updatedProfile = { ...formData, allowRegularization: enabled };
      saveEmployeeToSupabase(updatedProfile).catch((err) => {
        console.warn('Could not persist regularization toggle:', err);
      });

      // 5. Broadcast real-time events across application
      window.dispatchEvent(new CustomEvent('jaago_employees_updated'));
      window.dispatchEvent(new CustomEvent('jaago_pnc_employees_changed'));
      window.dispatchEvent(
        new CustomEvent('jaago_user_updated', {
          detail: {
            user: updatedUserObj,
            allowRegularization: enabled,
            employee: updatedProfile,
          },
        })
      );
    } catch (err) {
      console.error('Error syncing regularization toggle:', err);
    }
  };

  const getExistingRegularization = (log: AttendanceLogItem): AttendanceRegularizationItem | undefined => {
    if (!log) return undefined;
    const logId = (log.id || '').trim();
    const logDate = (log.date || '').trim();
    const empCode = (formData.code || log.employeeCode || '').toLowerCase().trim();
    return regularizations.find(
      (r) =>
        (logId && r.attendanceLogId === logId) ||
        (logDate && r.date === logDate && (r.employeeCode || '').toLowerCase().trim() === empCode)
    );
  };

  const isLogEligibleForReg = (log: AttendanceLogItem): boolean => {
    if (!log) return false;
    const existing = getExistingRegularization(log);
    if (existing?.status === 'Approved') return false;

    const statusLower = (log.status || '').toLowerCase().trim();
    const notesLower = (log.notes || '').toLowerCase().trim();

    if (
      statusLower === 'leave' ||
      statusLower === 'on leave' ||
      statusLower === 'holiday' ||
      statusLower === 'weekend' ||
      notesLower.includes('approved leave') ||
      notesLower.includes('on leave')
    ) {
      return false;
    }

    if (log.status === 'Late' || log.status === 'Absent' || log.status === 'Auto Check Out') return true;
    if (log.isAutoCheckout) return true;
    if (log.lateByMin !== undefined && log.lateByMin > 0) return true;
    if (log.status !== 'Present' && (!log.checkOutTime || log.checkOutTime === '--:--' || log.checkOutTime === 'N/A')) {
      return true;
    }
    return false;
  };

  const handleOpenProfileRegModal = (log: AttendanceLogItem) => {
    if (formData.allowRegularization === false) {
      setSaveToast({
        message: 'Attendance regularization requests are disabled for this employee.',
        type: 'error',
      });
      setTimeout(() => setSaveToast(null), 3500);
      return;
    }
    const standard = calculateShiftStandardTimes(formData.workingSchedule);
    setProfileRegModal({
      isOpen: true,
      log,
      adjustedCheckIn: standard.checkIn,
      adjustedCheckOut: standard.checkOut,
      reason: 'Late Entry Due to Official Field Work / Traffic',
      notes: '',
      isSubmitting: false,
    });
  };

  const handleSubmitProfileRegularization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileRegModal || !profileRegModal.log) return;
    if (formData.allowRegularization === false) {
      setSaveToast({
        message: 'Attendance regularization requests are disabled for this employee.',
        type: 'error',
      });
      setTimeout(() => setSaveToast(null), 3500);
      return;
    }

    setProfileRegModal((prev) => (prev ? { ...prev, isSubmitting: true } : null));
    try {
      const log = profileRegModal.log;
      const targetSup = formData.supervisor || 'S M Nayeem Rahman';
      await submitAttendanceRegularization({
        attendanceLogId: log.id,
        employeeId: formData.id,
        employeeCode: formData.code,
        employeeName: formData.name,
        department: formData.department,
        designation: formData.designation,
        date: log.date,
        originalCheckIn: log.checkInTime || '--:--',
        originalCheckOut: log.checkOutTime || '--:--',
        originalStatus: log.status || 'Present',
        originalLateByMin: log.lateByMin,
        adjustedCheckIn: profileRegModal.adjustedCheckIn,
        adjustedCheckOut: profileRegModal.adjustedCheckOut,
        workingSchedule: formData.workingSchedule,
        calculatedHours: '8h 00m',
        reason: profileRegModal.reason,
        notes: profileRegModal.notes,
        supervisorName: targetSup,
        supervisorEmail: 'nayeem.rahman@jaago.com.bd',
      });

      setProfileRegModal(null);
      setRegularizations(getLocalRegularizations());
      setSaveToast({
        message: `Regularization requested for ${formatDisplayDate(log.date)}! Submitted for supervisor approval.`,
        type: 'success',
      });
      setTimeout(() => setSaveToast(null), 3500);
    } catch (err: any) {
      console.error('Error submitting regularization request:', err);
      setProfileRegModal((prev) => (prev ? { ...prev, isSubmitting: false } : null));
      setSaveToast({
        message: 'Failed to submit regularization request. Please try again.',
        type: 'error',
      });
      setTimeout(() => setSaveToast(null), 3500);
    }
  };

  useEffect(() => {
    async function loadEmpLeaveData() {
      if (formData.code) {
        try {
          const [allocs, reqs, hols] = await Promise.all([
            fetchLeaveAllocations(),
            fetchLeaveRequests(),
            fetchPublicHolidays(),
          ]);
          const found = allocs.find((a) => a.employeeCode === formData.code) || null;
          setEmpLeaveAllocation(found);
          const filtered = reqs.filter((r) => r.employeeCode === formData.code);
          setEmpLeaveRequests(filtered);
          if (hols) setHolidays(hols);
        } catch {}
      }
    }
    loadEmpLeaveData();

    const handleAllocationUpdate = () => {
      loadEmpLeaveData();
    };
    window.addEventListener('jaago_leave_allocation_updated', handleAllocationUpdate);
    window.addEventListener('jaago_leave_request_updated', handleAllocationUpdate);
    window.addEventListener('jaago_public_holidays_updated', handleAllocationUpdate);
    return () => {
      window.removeEventListener('jaago_leave_allocation_updated', handleAllocationUpdate);
      window.removeEventListener('jaago_leave_request_updated', handleAllocationUpdate);
      window.removeEventListener('jaago_public_holidays_updated', handleAllocationUpdate);
    };
  }, [formData.code]);

  // Sync total calculated salary whenever regular or extra payment changes
  useEffect(() => {
    const total = Number(formData.regularSalary || 0) + Number(formData.extraPayment || 0) + Number(formData.temporarySalary || 0);
    if (total !== formData.totalCurrentSalary) {
      setFormData((prev) => ({ ...prev, totalCurrentSalary: total }));
    }
  }, [formData.regularSalary, formData.extraPayment, formData.temporarySalary, formData.totalCurrentSalary]);

  // Handle file selected from file picker or drag-and-drop for crop adjustment
  const handleFileSelectedForCrop = (file: File) => {
    setPhotoError(null);
    setPhotoSuccess(false);

    // Max 3MB Validation
    if (file.size > 3 * 1024 * 1024) {
      setPhotoError('Selected photo exceeds 3 MB. Please choose an image up to 3 MB.');
      return;
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setPhotoError('Allowed file types are *.jpeg, *.jpg, *.png, *.gif, *.webp');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setCropRawImageSrc(objectUrl);
    setShowCropModal(true);
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelectedForCrop(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePhotoDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOverPhoto(true);
  };

  const handlePhotoDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOverPhoto(false);
  };

  const handlePhotoDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOverPhoto(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelectedForCrop(file);
    }
  };

  const handleCropModalComplete = async (result: { blob: Blob; dataUrl: string }) => {
    setShowCropModal(false);
    setUploadingPhoto(true);
    setPhotoError(null);

    try {
      const croppedFile = new File([result.blob], `avatar_${formData.code || 'emp'}.jpg`, {
        type: 'image/jpeg',
      });
      const { url } = await uploadEmployeePhoto(croppedFile, formData.code || 'new');
      setFormData((prev) => ({ ...prev, avatarUrl: url }));
      setPhotoSuccess(true);
      setTimeout(() => setPhotoSuccess(false), 3500);
    } catch {
      // Fallback to high-res data URL
      setFormData((prev) => ({ ...prev, avatarUrl: result.dataUrl }));
      setPhotoSuccess(true);
      setTimeout(() => setPhotoSuccess(false), 3500);
    } finally {
      setUploadingPhoto(false);
      if (cropRawImageSrc && cropRawImageSrc.startsWith('blob:')) {
        URL.revokeObjectURL(cropRawImageSrc);
      }
      setCropRawImageSrc(null);
    }
  };

  const handleAdjustExistingPhoto = () => {
    if (formData.avatarUrl) {
      setCropRawImageSrc(formData.avatarUrl);
      setShowCropModal(true);
    }
  };

  // Supervisor suggestion filtering (at least 3 characters)
  const supervisorSuggestions = supervisorQuery.trim().length >= 3
    ? allEmployees.filter((emp) =>
        emp.name.toLowerCase().includes(supervisorQuery.toLowerCase()) ||
        emp.code.toLowerCase().includes(supervisorQuery.toLowerCase()) ||
        emp.department.toLowerCase().includes(supervisorQuery.toLowerCase())
      )
    : [];

  const secSupervisorSuggestions = secSupervisorQuery.trim().length >= 3
    ? allEmployees.filter((emp) =>
        emp.name.toLowerCase().includes(secSupervisorQuery.toLowerCase()) ||
        emp.code.toLowerCase().includes(secSupervisorQuery.toLowerCase()) ||
        emp.department.toLowerCase().includes(secSupervisorQuery.toLowerCase())
      )
    : [];

  // Add Custom Office Days
  const handleApplyCustomDays = () => {
    if (!customDaysFrom.trim() || !customDaysTo.trim()) return;
    const combined = `${customDaysFrom.trim()} to ${customDaysTo.trim()}`;
    if (!officeDaysOptions.includes(combined)) {
      setOfficeDaysOptions((prev) => [combined, ...prev]);
    }
    setFormData((prev) => ({ ...prev, officeDays: combined }));
    setIsCustomDays(false);
  };

  // Save changes & Compute Log History Diff
  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!formData.name.trim()) {
      setSaveToast({ message: 'Employee Full Name is required.', type: 'error' });
      setActiveTab('WORK');
      return;
    }

    const previous = originalStateRef.current;
    const now = new Date();
    const formattedTimestamp = now.toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const newLogs: LogHistoryEntry[] = [];

    // Diff trackable fields
    const trackableFields: { key: keyof FullEmployeeProfile; label: string }[] = [
      { key: 'name', label: 'Full Name' },
      { key: 'code', label: 'Employee ID' },
      { key: 'status', label: 'Employment Status' },
      { key: 'designation', label: 'Designation' },
      { key: 'workEmail', label: 'Work Email' },
      { key: 'workMobile', label: 'Mobile' },
      { key: 'department', label: 'Department' },
      { key: 'organization', label: 'Organization' },
      { key: 'branch', label: 'Branch' },
      { key: 'project', label: 'Project' },
      { key: 'supervisor', label: 'Supervisor' },
      { key: 'secondarySupervisor', label: 'Secondary Supervisor' },
      { key: 'workLocation', label: 'Work Location' },
      { key: 'workingSchedule', label: 'Working Schedule' },
      { key: 'personalEmail', label: 'Personal Email' },
      { key: 'bankName', label: 'Bank Name' },
      { key: 'bankAccountNumber', label: 'Bank Account Number' },
      { key: 'bloodGroup', label: 'Blood Group' },
      { key: 'birthday', label: 'Birthday' },
      { key: 'maritalStatus', label: 'Marital Status' },
      { key: 'regularSalary', label: 'Regular Salary' },
      { key: 'wage', label: 'Wage' },
      { key: 'joiningDate', label: 'Joining Date' },
      { key: 'contractEndDate', label: 'Contract End Date' },
      { key: 'contractType', label: 'Contract Type' },
      { key: 'officeDays', label: 'DSP Office Days' },
      { key: 'officeHours', label: 'DSP Office Hours' },
      { key: 'rfid', label: 'RFID' },
      { key: 'leaveGroup', label: 'Leave Group' },
      { key: 'employeeType', label: 'Employee Type' },
      { key: 'allowRegularization', label: 'Allow Regularization' },
    ];

    trackableFields.forEach(({ key, label }) => {
      const oldVal = String(previous[key] ?? '');
      const newVal = String(formData[key] ?? '');
      if (oldVal !== newVal) {
        newLogs.push({
          id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          timestamp: now.toISOString(),
          formattedDate: formattedTimestamp,
          userName: currentUser.fullName || 'Nasif Kamal',
          userRole: currentUser.jobTitle || 'Coordinator',
          field: label,
          oldValue: oldVal || '(empty)',
          newValue: newVal || '(empty)',
          actionType: key === 'status' ? 'status_change' : 'update',
        });
      }
    });

    const updatedProfile: FullEmployeeProfile = {
      ...formData,
      logHistory: [...newLogs, ...(formData.logHistory || [])],
    };

    originalStateRef.current = updatedProfile;
    setFormData(updatedProfile);

    onSave(updatedProfile);

    setSaveToast({
      message: isNew ? 'Employee profile created successfully!' : 'Employee profile updated & changes logged!',
      type: 'success',
    });

    setTimeout(() => {
      setSaveToast(null);
    }, 3500);
  };

  // Status Badge styling helper
  const getStatusColorClasses = (status: EmployeeStatus) => {
    switch (status) {
      case 'Active':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'Terminated':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
      case 'Resigned':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'Incomplete':
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30';
      default:
        return 'bg-surface text-muted-foreground border-border';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 select-none">
      {/* ── 1. TOP BREADCRUMB & ACTION BAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 rounded-2xl bg-card border border-border hover:border-primary/50 text-foreground hover:text-primary transition shadow-sm cursor-pointer flex items-center justify-center"
            title="Back to Employee List"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-muted-foreground">
              <Link href="/pnc" className="hover:text-primary hover:underline transition cursor-pointer">
                People and Culture
              </Link>
              <span>/</span>
              <button
                type="button"
                className="hover:text-primary hover:underline transition cursor-pointer font-semibold"
                onClick={onBack}
              >
                Employees
              </button>
              <span>/</span>
              <span className="text-foreground font-bold">
                {formData.name || (isNew ? 'New Profile' : 'Employee Details')}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
              {formData.name || (isNew ? 'Create New Employee' : 'Employee Profile')}
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2.5">
          {/* New Contract Button */}
          <button
            type="button"
            onClick={() => {
              setContractToAmend(null);
              setIsNewContractModalOpen(true);
            }}
            className="px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-bold tracking-wide transition flex items-center space-x-1.5 shadow-md shadow-amber-500/20 cursor-pointer active:scale-95"
            title="Create New Employment Contract for this employee"
          >
            <FilePlus className="h-3.5 w-3.5" />
            <span>New Contract</span>
          </button>

          {/* Create User Button */}
          {!formData.isUser && onCreateUser && (
            <button
              type="button"
              onClick={() => onCreateUser(formData)}
              className="px-4 py-2 rounded-2xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-xs font-bold tracking-wide transition flex items-center space-x-2 shadow-md cursor-pointer active:scale-95"
              title="Create JAAGO HUB User Account and Dispatch Credentials"
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>Create User</span>
            </button>
          )}

          {/* Delete Profile Button */}
          {!isNew && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(formData.code)}
              className="px-4 py-2 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 border border-rose-500/30"
              title="Delete this employee profile"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete</span>
            </button>
          )}

          {readOnly ? (
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-bold flex items-center space-x-1.5">
                <Shield className="h-3.5 w-3.5" />
                <span>Read-Only View</span>
              </span>
              <button
                type="button"
                onClick={onBack}
                className="px-4 py-2 rounded-2xl bg-card border border-border hover:bg-surface text-xs font-bold text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={onBack}
                className="px-4 py-2 rounded-2xl bg-card border border-border hover:bg-surface text-xs font-bold text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                Discard
              </button>

              <button
                type="button"
                onClick={() => handleSave()}
                className="px-5 py-2 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-bold tracking-wide transition flex items-center space-x-2 shadow-lg shadow-amber-500/20 cursor-pointer active:scale-95"
              >
                <Save className="h-4 w-4 stroke-[2.5]" />
                <span>Save Profile</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {saveToast && (
        <div
          className={`p-3 rounded-2xl text-xs font-bold flex items-center space-x-2 shadow-lg animate-in fade-in ${
            saveToast.type === 'success'
              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
              : 'bg-red-500/20 border border-red-500/40 text-red-400'
          }`}
        >
          {saveToast.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-400" />
          )}
          <span>{saveToast.message}</span>
        </div>
      )}

      {/* ── 2. TOP HERO / PROFILE IDENTITY CARD (LEFT PICTURE UPLOAD + RIGHT ESSENTIALS) ── */}
      <div className="rounded-3xl bg-card border border-border shadow-xl p-6 sm:p-8 backdrop-blur-md">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Left Column: Profile Picture Upload Frame (Interactive Drag to Adjust, Auto-Crop / Resize / Fit Frame, Max 3MB, Supabase Storage) */}
          <div className="md:col-span-3 flex flex-col items-center justify-center text-center space-y-3">
            <div className="relative group">
              <div
                onDragOver={handlePhotoDragOver}
                onDragLeave={handlePhotoDragLeave}
                onDrop={handlePhotoDrop}
                className={`w-36 h-36 sm:w-40 sm:h-40 rounded-full border-2 border-dashed overflow-hidden flex items-center justify-center shadow-inner relative transition-all duration-200 ${
                  isDragOverPhoto
                    ? 'border-amber-400 bg-amber-500/20 ring-4 ring-amber-400/30 scale-105'
                    : 'border-amber-500/40 bg-surface/60'
                }`}
                title="Drop image here or click to upload & adjust"
              >
                {formData.avatarUrl ? (
                  <Image
                    src={formData.avatarUrl}
                    alt={formData.name || 'Employee Avatar'}
                    fill
                    sizes="160px"
                    unoptimized
                    className="object-cover object-center w-full h-full rounded-full"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-3 text-muted-foreground">
                    <Camera className="h-10 w-10 text-amber-500/80 mb-1" />
                    <span className="text-[11px] font-bold text-foreground">
                      {isDragOverPhoto ? 'Drop photo here' : 'Upload photo'}
                    </span>
                  </div>
                )}

                {/* Upload Spinner Overlay */}
                {uploadingPhoto && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white text-xs font-bold space-y-1 rounded-full z-20">
                    <span className="animate-spin h-6 w-6 border-2 border-amber-400 border-t-transparent rounded-full" />
                    <span>Saving to Supabase...</span>
                  </div>
                )}

                {/* Hover Camera / Drag Action Overlay */}
                {!uploadingPhoto && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition duration-200 flex flex-col items-center justify-center text-white text-[11px] font-bold rounded-full z-10 space-y-1 p-2">
                    {formData.avatarUrl ? (
                      <>
                        <button
                          type="button"
                          onClick={handleAdjustExistingPhoto}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold flex items-center space-x-1 text-[10px] cursor-pointer shadow-sm active:scale-95"
                          title="Drag, Pan & Zoom existing photo"
                        >
                          <Move className="h-3 w-3" />
                          <span>Adjust / Crop</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-2 py-0.5 rounded-lg bg-white/20 hover:bg-white/30 text-white font-semibold text-[10px] cursor-pointer flex items-center space-x-1"
                        >
                          <Upload className="h-2.5 w-2.5" />
                          <span>Change</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center justify-center cursor-pointer"
                      >
                        <Camera className="h-6 w-6 text-amber-400 mb-0.5" />
                        <span>Upload Photo</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Remove Photo action if photo exists */}
              {formData.avatarUrl && !uploadingPhoto && (
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, avatarUrl: '' }))}
                  className="absolute -top-1 -right-1 p-1.5 rounded-full bg-red-500/90 text-white hover:bg-red-600 shadow-md cursor-pointer transition active:scale-90"
                  title="Remove Profile Photo"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpeg,.jpg,.png,.gif,.webp"
              onChange={handlePhotoFileChange}
              className="hidden"
            />

            {/* Action Buttons & Guidance */}
            <div className="space-y-1.5 w-full">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-bold text-amber-500 hover:text-amber-400 hover:underline cursor-pointer flex items-center justify-center space-x-1"
                >
                  <Upload className="h-3 w-3" />
                  <span>{formData.avatarUrl ? 'Change Photo' : 'Upload Profile Picture'}</span>
                </button>

                {formData.avatarUrl && (
                  <>
                    <span className="text-muted-foreground hidden sm:inline">&bull;</span>
                    <button
                      type="button"
                      onClick={handleAdjustExistingPhoto}
                      className="text-xs font-bold text-amber-500 hover:text-amber-400 hover:underline cursor-pointer flex items-center justify-center space-x-1"
                    >
                      <Move className="h-3 w-3" />
                      <span>Adjust &amp; Crop</span>
                    </button>
                  </>
                )}
              </div>

              <p className="text-[10px] text-muted-foreground leading-tight">
                Allowed *.jpeg, *.jpg, *.png, *.gif, *.webp <br />
                <strong className="text-foreground">Max size: 3 MB</strong> (Drag to reposition &amp; stored in Supabase)
              </p>
            </div>

            {photoError && (
              <div className="text-[11px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 p-2 rounded-xl">
                {photoError}
              </div>
            )}
            {photoSuccess && (
              <div className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-xl">
                Photo uploaded &amp; fitted successfully!
              </div>
            )}
          </div>

          {/* Right Column: Name, ID, Designation, Work Email, Mobile, Status & Schedule */}
          <div className="md:col-span-9 space-y-4">
            {/* Primary Name Field */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Employee&apos;s Name <span className="text-amber-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. NASIF KAMAL"
                className="w-full h-11 px-3.5 rounded-xl bg-surface/60 border border-border text-base sm:text-lg font-bold text-foreground placeholder:text-muted-foreground/40 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm transition"
              />
            </div>

            {/* Quick Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1 text-xs">
              {/* Employee ID */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Employee ID
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g. GLSP08241107940"
                  className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-mono font-bold text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                />
              </div>

              {/* Designation */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Designation <span className="text-amber-500">*</span>
                </label>
                <select
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-sm"
                >
                  {dynamicDesignations.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status (Color Selector) */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Status (Color Label)
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as EmployeeStatus })}
                  className={`w-full h-10 px-3 rounded-xl font-bold text-xs sm:text-[13px] border focus:outline-none focus:ring-1 focus:ring-amber-500 transition cursor-pointer shadow-sm ${getStatusColorClasses(
                    formData.status
                  )}`}
                >
                  <option value="Active" className="bg-card text-emerald-500 font-bold">
                    Active
                  </option>
                  <option value="Terminated" className="bg-card text-rose-500 font-bold">
                    Terminated
                  </option>
                  <option value="Resigned" className="bg-card text-amber-500 font-bold">
                    Resigned
                  </option>
                  <option value="Incomplete" className="bg-card text-indigo-500 font-bold">
                    Incomplete
                  </option>
                </select>
              </div>

              {/* Work Email */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Work Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={formData.workEmail}
                    onChange={(e) => setFormData({ ...formData, workEmail: e.target.value })}
                    placeholder="name@jaago.com.bd"
                    className="w-full h-10 pl-8 pr-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                  />
                  <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </div>

              {/* Mobile */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Mobile
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={formData.workMobile}
                    onChange={(e) => setFormData({ ...formData, workMobile: e.target.value })}
                    placeholder="+880 1711 000000"
                    className="w-full h-10 pl-8 pr-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                  />
                  <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </div>

              {/* Working Schedule (Connected with Attendance Shift Management) */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Working Schedule
                </label>
                <select
                  value={formData.workingSchedule}
                  onChange={(e) => setFormData({ ...formData, workingSchedule: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-sm"
                >
                  {dynamicWorkingSchedules.map((ws) => (
                    <option key={ws} value={ws}>
                      {ws}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. MODERN TAB NAVIGATION BAR ── */}
      <div className="flex items-center space-x-2 border-b border-border/80 text-xs font-bold tracking-wider overflow-x-auto pb-0.5">
        {[
          { key: 'WORK', label: 'Work', icon: Briefcase },
          { key: 'PERSONAL', label: 'Personal', icon: User },
          { key: 'PAYROLL', label: 'Payroll', icon: DollarSign },
          { key: 'CONTRACTS', label: 'Contracts', icon: FileText, count: employeeContracts.length },
          { key: 'INSURANCE', label: 'Insurance', icon: Shield },
          { key: 'DSP', label: 'DSP', icon: Sparkles },
          { key: 'LEAVE_ATTENDANCE', label: 'Leave & Attendance', icon: CalendarDays },
          { key: 'LOG_HISTORY', label: 'Log History', icon: History, count: formData.logHistory?.length || 0 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2.5 rounded-t-xl font-bold text-xs uppercase tracking-wider transition flex items-center space-x-2 border-b-2 cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'text-amber-500 border-amber-500 bg-amber-500/10 shadow-sm'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-surface/50'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-amber-500' : 'text-muted-foreground'}`} />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && tab.count > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-400 font-bold">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── 4. TAB CONTENTS CONTAINER ── */}
      <div className="rounded-3xl bg-card border border-border shadow-xl p-6 sm:p-8 space-y-6">
        {/* ═══════════════════════════════════════════════════════════════════
            TAB 1: WORK
            ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'WORK' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left: Work Details */}
            <div className="lg:col-span-7 space-y-5">
              <div className="border-b border-border/70 pb-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center space-x-2">
                  <div className="h-6 w-6 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <Building2 className="h-3.5 w-3.5" />
                  </div>
                  <span>Work &amp; Operational Hierarchy</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Organization */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    Organization <span className="text-amber-500">*</span>
                  </label>
                  <select
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-sm"
                  >
                    {dynamicOrganizations.map((org) => (
                      <option key={org} value={org}>
                        {org}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Branch */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    Branch
                  </label>
                  <select
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-sm"
                  >
                    {dynamicBranches.map((br) => (
                      <option key={br} value={br}>
                        {br}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Department */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    Department
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-sm"
                  >
                    {dynamicDepartments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Project */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    Project
                  </label>
                  <select
                    value={formData.project}
                    onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-sm"
                  >
                    <option value="">Select Project</option>
                    {dynamicProjects.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Team (Connected with Organization Teams) */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    Team
                  </label>
                  <select
                    value={formData.team || ''}
                    onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-sm"
                  >
                    <option value="">Select Team</option>
                    {dynamicTeams.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Supervisor (Interactive Autocomplete Search >= 3 chars) */}
                <div ref={supervisorRef} className="space-y-1 relative">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                      Supervisor <span className="text-amber-500">*</span>
                    </label>
                    <span className="text-[10px] text-muted-foreground/80">(Type 3+ letters to search)</span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={supervisorQuery}
                      onChange={(e) => {
                        setSupervisorQuery(e.target.value);
                        setFormData({ ...formData, supervisor: e.target.value });
                        setShowSupervisorDropdown(true);
                      }}
                      onFocus={() => setShowSupervisorDropdown(true)}
                      placeholder="Search supervisor..."
                      className="w-full h-10 pl-8 pr-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                    />
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  </div>

                  {/* Suggestions dropdown */}
                  {showSupervisorDropdown && supervisorSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded-2xl shadow-2xl p-2 z-30 space-y-1 max-h-52 overflow-y-auto animate-in fade-in">
                      {supervisorSuggestions.map((emp) => (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => {
                            setSupervisorQuery(emp.name);
                            setFormData((prev) => ({ ...prev, supervisor: emp.name }));
                            setShowSupervisorDropdown(false);
                          }}
                          className="w-full text-left p-2 rounded-xl hover:bg-surface transition flex items-center space-x-2.5 cursor-pointer text-xs"
                        >
                          <div className="h-7 w-7 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                            {emp.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-foreground">{emp.name}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {emp.designation} &bull; {emp.code}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Secondary Supervisor (Interactive Autocomplete Search >= 3 chars) */}
                <div ref={secSupervisorRef} className="space-y-1 relative">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                      Secondary Supervisor
                    </label>
                    <span className="text-[10px] text-muted-foreground/80">(Type 3+ letters)</span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={secSupervisorQuery}
                      onChange={(e) => {
                        setSecSupervisorQuery(e.target.value);
                        setFormData({ ...formData, secondarySupervisor: e.target.value });
                        setShowSecSupervisorDropdown(true);
                      }}
                      onFocus={() => setShowSecSupervisorDropdown(true)}
                      placeholder="Search secondary supervisor..."
                      className="w-full h-10 pl-8 pr-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                    />
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  </div>

                  {/* Secondary Suggestions dropdown */}
                  {showSecSupervisorDropdown && secSupervisorSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded-2xl shadow-2xl p-2 z-30 space-y-1 max-h-52 overflow-y-auto animate-in fade-in">
                      {secSupervisorSuggestions.map((emp) => (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => {
                            setSecSupervisorQuery(emp.name);
                            setFormData((prev) => ({ ...prev, secondarySupervisor: emp.name }));
                            setShowSecSupervisorDropdown(false);
                          }}
                          className="w-full text-left p-2 rounded-xl hover:bg-surface transition flex items-center space-x-2.5 cursor-pointer text-xs"
                        >
                          <div className="h-7 w-7 rounded-full bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                            {emp.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-foreground">{emp.name}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {emp.designation} &bull; {emp.code}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Work Location */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    Work Location
                  </label>
                  <input
                    type="text"
                    value={formData.workLocation}
                    onChange={(e) => setFormData({ ...formData, workLocation: e.target.value })}
                    placeholder="e.g. Banani, Dhaka"
                    className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                  />
                </div>

                {/* Remark */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    Remark
                  </label>
                  <textarea
                    rows={3}
                    value={formData.remark}
                    onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                    placeholder="Add operational notes or department assignment remarks..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Right: Live Dynamic Organization Chart Preview */}
            <div className="lg:col-span-5 space-y-4">
              <div className="border-b border-border/70 pb-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center space-x-2">
                  <div className="h-6 w-6 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <Layers className="h-3.5 w-3.5" />
                  </div>
                  <span>Organization Chart</span>
                </h3>
              </div>

              <div className="p-5 rounded-2xl bg-surface/50 border border-border/80 space-y-4">
                {/* Supervisor node */}
                <div className="p-3 rounded-xl bg-card border border-border shadow-sm flex items-center space-x-3">
                  <div className="h-9 w-9 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {(formData.supervisor || 'SP').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
                      Reporting Manager
                    </div>
                    <div className="text-xs font-bold text-foreground truncate">
                      {formData.supervisor || 'Not Assigned'}
                    </div>
                  </div>
                </div>

                {/* Tree Connector */}
                <div className="ml-4 pl-4 border-l-2 border-amber-500/40 py-1 space-y-3">
                  {/* Current Employee Node */}
                  <div className="p-3 rounded-xl bg-amber-500/10 border-2 border-amber-500 shadow-md flex items-center space-x-3 -ml-4">
                    <div className="h-10 w-10 rounded-full bg-amber-500 text-white flex items-center justify-center font-black text-xs flex-shrink-0">
                      {(formData.name || 'EM').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
                        {formData.designation || 'Staff'}
                      </div>
                      <div className="text-xs font-bold text-foreground truncate">
                        {formData.name || "Employee's Name"}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {formData.code}
                      </div>
                    </div>
                  </div>

                  {/* Secondary Supervisor Badge */}
                  {formData.secondarySupervisor && (
                    <div className="p-2.5 rounded-xl bg-card/60 border border-dashed border-border flex items-center space-x-2 text-[11px] text-muted-foreground">
                      <span className="h-2 w-2 rounded-full bg-purple-400" />
                      <span>Secondary Supervisor: <strong className="text-foreground">{formData.secondarySupervisor}</strong></span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 2: PERSONAL
            ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'PERSONAL' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Personal Contact & Emergency Contact */}
            <div className="space-y-6">
              {/* 1. PERSONAL CONTACT */}
              <div className="space-y-4">
                <div className="border-b border-border/70 pb-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center space-x-2">
                    <div className="h-6 w-6 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                      <Mail className="h-3.5 w-3.5" />
                    </div>
                    <span>Personal Contact</span>
                  </h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                      Personal Email
                    </label>
                    <input
                      type="email"
                      value={formData.personalEmail}
                      onChange={(e) => setFormData({ ...formData, personalEmail: e.target.value })}
                      placeholder="e.g. myprivateemail@example.com"
                      className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                      Personal Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.personalPhone}
                      onChange={(e) => setFormData({ ...formData, personalPhone: e.target.value })}
                      placeholder="+880 1811 000000"
                      className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        value={formData.bankName}
                        onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                        placeholder="e.g. Eastern Bank Ltd"
                        className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                        Bank Account Number
                      </label>
                      <input
                        type="text"
                        value={formData.bankAccountNumber}
                        onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                        placeholder="e.g. 1041234567890"
                        className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-mono font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. EMERGENCY CONTACT */}
              <div className="space-y-4 pt-2">
                <div className="border-b border-border/70 pb-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center space-x-2">
                    <div className="h-6 w-6 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
                      <Phone className="h-3.5 w-3.5" />
                    </div>
                    <span>Emergency Contact</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      value={formData.emergencyContactName}
                      onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                      placeholder="e.g. Spouse / Parent"
                      className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                      Emergency Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.emergencyPhone}
                      onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                      placeholder="+880 1700 000000"
                      className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* 3. LOCATION */}
              <div className="space-y-4 pt-2">
                <div className="border-b border-border/70 pb-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center space-x-2">
                    <div className="h-6 w-6 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                      <MapPin className="h-3.5 w-3.5" />
                    </div>
                    <span>Home Location</span>
                  </h3>
                </div>
                <div className="space-y-1 text-xs">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    Home Address
                  </label>
                  <textarea
                    rows={2}
                    value={formData.homeAddress}
                    onChange={(e) => setFormData({ ...formData, homeAddress: e.target.value })}
                    placeholder="Street Address, City, Postal Code..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Personal Information & Citizenship */}
            <div className="space-y-6">
              {/* 4. PERSONAL INFORMATION */}
              <div className="space-y-4">
                <div className="border-b border-border/70 pb-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center space-x-2">
                    <div className="h-6 w-6 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                      <User className="h-3.5 w-3.5" />
                    </div>
                    <span>Personal Information</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  {/* Nick Name */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                      Nick Name
                    </label>
                    <input
                      type="text"
                      value={formData.nickName}
                      onChange={(e) => setFormData({ ...formData, nickName: e.target.value })}
                      placeholder="e.g. Nasif"
                      className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                    />
                  </div>

                  {/* NID */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                      NID / Birth Certificate
                    </label>
                    <input
                      type="text"
                      value={formData.nid}
                      onChange={(e) => setFormData({ ...formData, nid: e.target.value })}
                      placeholder="e.g. 1996269123456789"
                      className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-mono font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                    />
                  </div>

                  {/* Blood Group */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center space-x-1">
                      <Heart className="h-3 w-3 text-rose-500" />
                      <span>Blood Group <span className="text-amber-500">*</span></span>
                    </label>
                    <select
                      value={formData.bloodGroup}
                      onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value as any })}
                      className="w-full h-10 px-3 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-sm"
                    >
                      <option value="">Select Blood Group</option>
                      {BLOOD_GROUPS.map((bg) => (
                        <option key={bg} value={bg}>
                          {bg}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Birthday with Calendar */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center space-x-1">
                      <CalendarIcon className="h-3 w-3 text-amber-500" />
                      <span>Birthday (DD/MM/YYYY)</span>
                    </label>
                    <input
                      type="date"
                      value={formData.birthday}
                      onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-sm"
                    />
                  </div>

                  {/* Gender */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                      Gender
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => {
                        const newGender = e.target.value;
                        setFormData({ ...formData, gender: newGender as any });
                        if (empLeaveAllocation) {
                          const isM = newGender === 'MALE' || newGender === 'M';
                          const isF = newGender === 'FEMALE' || newGender === 'F';
                          setEmpLeaveAllocation({
                            ...empLeaveAllocation,
                            gender: newGender,
                            paternityAllocated: isM ? (empLeaveAllocation.paternityAllocated || 0) : 0,
                            maternityAllocated: isF ? (empLeaveAllocation.maternityAllocated || 0) : 0,
                          });
                        }
                      }}
                      className="w-full h-10 px-3 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-sm"
                    >
                      <option value="MALE">MALE</option>
                      <option value="FEMALE">FEMALE</option>
                      <option value="OTHER">OTHER</option>
                    </select>
                  </div>

                  {/* Religion */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                      Religion
                    </label>
                    <select
                      value={formData.religion}
                      onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-sm"
                    >
                      {RELIGIONS.map((rel) => (
                        <option key={rel} value={rel}>
                          {rel}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Marital Status */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                      Marital Status
                    </label>
                    <select
                      value={formData.maritalStatus}
                      onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value as any })}
                      className="w-full h-10 px-3 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-sm"
                    >
                      <option value="">Select Status</option>
                      {MARITAL_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Dependent Children */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                      Dependent Children
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formData.dependentChildren}
                      onChange={(e) => setFormData({ ...formData, dependentChildren: Number(e.target.value) })}
                      className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* 5. CITIZENSHIP & PASSPORT */}
              <div className="space-y-4 pt-2">
                <div className="border-b border-border/70 pb-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center space-x-2">
                    <div className="h-6 w-6 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                      <Shield className="h-3.5 w-3.5" />
                    </div>
                    <span>Citizenship &amp; Identification</span>
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                      Nationality
                    </label>
                    <input
                      type="text"
                      value={formData.nationality}
                      onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                      placeholder="e.g. Bangladeshi"
                      className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                      Passport No
                    </label>
                    <input
                      type="text"
                      value={formData.passportNo}
                      onChange={(e) => setFormData({ ...formData, passportNo: e.target.value })}
                      placeholder="e.g. A01234567"
                      className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-mono font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 3: PAYROLL
            ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'PAYROLL' && (
          <div className="space-y-8">
            {/* 1. CONTRACT OVERVIEW */}
            <div className="space-y-4">
              <div className="border-b border-border/70 pb-2.5 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center space-x-2">
                  <div className="h-6 w-6 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <DollarSign className="h-3.5 w-3.5" />
                  </div>
                  <span>Contract Overview</span>
                </h3>
                <span className="text-[11px] font-bold text-muted-foreground">Currency: BDT (৳)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                {/* Joining Date */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center space-x-1">
                    <CalendarIcon className="h-3 w-3 text-amber-500" />
                    <span>Joining Date <span className="text-amber-500">*</span></span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.joiningDate}
                    onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-sm"
                  />
                </div>

                {/* Contract End Date */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center space-x-1">
                    <CalendarIcon className="h-3 w-3 text-amber-500" />
                    <span>Contract End Date</span>
                  </label>
                  <input
                    type="date"
                    value={formData.contractEndDate}
                    onChange={(e) => setFormData({ ...formData, contractEndDate: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-sm"
                  />
                </div>

                {/* Wage Type */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    Wage Type
                  </label>
                  <select
                    value={formData.wageType}
                    onChange={(e) => setFormData({ ...formData, wageType: e.target.value as any })}
                    className="w-full h-10 px-3 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-sm"
                  >
                    <option value="Fixed">Fixed Wage</option>
                    <option value="Hourly">Hourly</option>
                  </select>
                </div>

                {/* Wage */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    Wage (৳)
                  </label>
                  <input
                    type="number"
                    value={formData.wage}
                    onChange={(e) => setFormData({ ...formData, wage: Number(e.target.value) })}
                    className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-mono font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                  />
                </div>

                {/* Salary JUL - DEC */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    Salary JUL - DEC (৳)
                  </label>
                  <input
                    type="number"
                    value={formData.salaryJulDec}
                    onChange={(e) => setFormData({ ...formData, salaryJulDec: Number(e.target.value) })}
                    className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-mono font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                  />
                </div>

                {/* Salary JAN - JUN */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    Salary JAN - JUN (৳)
                  </label>
                  <input
                    type="number"
                    value={formData.salaryJanJun}
                    onChange={(e) => setFormData({ ...formData, salaryJanJun: Number(e.target.value) })}
                    className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-mono font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                  />
                </div>

                {/* Monthly Total Allowance */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    Monthly Total Allowance
                  </label>
                  <select
                    value={formData.monthlyTotalAllowance}
                    onChange={(e) => setFormData({ ...formData, monthlyTotalAllowance: e.target.value as any })}
                    className="w-full h-10 px-3 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-sm"
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>

                {/* 6 Months Completion Status */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    6 Months Completion Status
                  </label>
                  <select
                    value={formData.sixMonthsCompletionStatus}
                    onChange={(e) => setFormData({ ...formData, sixMonthsCompletionStatus: e.target.value as any })}
                    className="w-full h-10 px-3 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-sm"
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>

                {/* Probationary Status */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    Probationary Status
                  </label>
                  <select
                    value={formData.probationaryStatus}
                    onChange={(e) => setFormData({ ...formData, probationaryStatus: e.target.value as any })}
                    className="w-full h-10 px-3 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-sm"
                  >
                    <option value="Confirmed">Confirmed</option>
                    <option value="On Probation">On Probation</option>
                  </select>
                </div>

                {/* Contract Type */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    Contract Type
                  </label>
                  <select
                    value={formData.contractType}
                    onChange={(e) => setFormData({ ...formData, contractType: e.target.value as any })}
                    className="w-full h-10 px-3 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-sm"
                  >
                    {CONTRACT_TYPES.map((ct) => (
                      <option key={ct} value={ct}>
                        {ct}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Bonus Eligibility */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    Bonus Eligibility
                  </label>
                  <select
                    value={formData.bonusEligibility}
                    onChange={(e) => setFormData({ ...formData, bonusEligibility: e.target.value as any })}
                    className="w-full h-10 px-3 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-sm"
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>

                {/* PF Applies & PF Rate */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    PF Applies &amp; Rate
                  </label>
                  <div className="flex items-center space-x-2">
                    <select
                      value={formData.pfApplies}
                      onChange={(e) => setFormData({ ...formData, pfApplies: e.target.value as any })}
                      className="w-1/2 h-10 px-3 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-sm"
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                    <div className="w-1/2 relative">
                      <input
                        type="number"
                        step="0.1"
                        value={formData.pfRate}
                        onChange={(e) => setFormData({ ...formData, pfRate: Number(e.target.value) })}
                        placeholder="10%"
                        className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-mono font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* No TAX Deduction Checkbox */}
                <div className="sm:col-span-2 flex items-center space-x-3 pt-2">
                  <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.noTaxDeduction}
                      onChange={(e) => setFormData({ ...formData, noTaxDeduction: e.target.checked })}
                      className="h-4 w-4 rounded border-border accent-amber-500 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-foreground">No TAX Deduction</span>
                  </label>
                </div>
              </div>
            </div>

            {/* 2. PAYROLL ADJUSTMENT */}
            <div className="space-y-4 pt-4 border-t border-border/70">
              <div className="border-b border-border/70 pb-2.5 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center space-x-2">
                  <div className="h-6 w-6 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <DollarSign className="h-3.5 w-3.5" />
                  </div>
                  <span>Payroll Adjustment</span>
                </h3>
                <span className="text-xs font-bold text-emerald-500">
                  Total Current Salary: ৳ {formData.totalCurrentSalary?.toLocaleString()}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                {/* Regular Salary */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    Regular Salary (৳)
                  </label>
                  <input
                    type="number"
                    value={formData.regularSalary}
                    onChange={(e) => setFormData({ ...formData, regularSalary: Number(e.target.value) })}
                    className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-mono font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                  />
                </div>

                {/* Extra Hours */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    Extra Hours
                  </label>
                  <input
                    type="number"
                    value={formData.extraHours}
                    onChange={(e) => setFormData({ ...formData, extraHours: Number(e.target.value) })}
                    className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-mono font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                  />
                </div>

                {/* Extra Payment */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    Extra Payment (৳)
                  </label>
                  <input
                    type="number"
                    value={formData.extraPayment}
                    onChange={(e) => setFormData({ ...formData, extraPayment: Number(e.target.value) })}
                    className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-mono font-bold text-emerald-500 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                  />
                </div>

                {/* Calculation value */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    Calculation value
                  </label>
                  <input
                    type="text"
                    value={formData.calculationValue}
                    onChange={(e) => setFormData({ ...formData, calculationValue: e.target.value })}
                    placeholder="e.g. 1.0x / Overtime Formula"
                    className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                  />
                </div>

                {/* Temporary Salary */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    Temporary Salary (৳)
                  </label>
                  <input
                    type="number"
                    value={formData.temporarySalary}
                    onChange={(e) => setFormData({ ...formData, temporarySalary: Number(e.target.value) })}
                    className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-mono font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                  />
                </div>

                {/* Total Current Salary (Calculated) */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-emerald-500 block">
                    Total Current Salary
                  </label>
                  <div className="w-full h-10 px-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 font-mono font-bold text-xs sm:text-[13px] flex items-center">
                    ৳ {formData.totalCurrentSalary?.toLocaleString()}
                  </div>
                </div>

                {/* Currency */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    Currency
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value as any })}
                    className="w-full h-10 px-3 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-sm"
                  >
                    <option value="BDT">BDT (৳ - Bangladeshi Taka)</option>
                    <option value="USD">USD ($ - US Dollar)</option>
                    <option value="EUR">EUR (€ - Euro)</option>
                  </select>
                </div>

                {/* Assigned Regular Teacher/Staff */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    Assigned Teacher/Staff
                  </label>
                  <input
                    type="text"
                    value={formData.assignedTeacherStaff}
                    onChange={(e) => setFormData({ ...formData, assignedTeacherStaff: e.target.value })}
                    placeholder="e.g. Regular Instructor"
                    className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                  />
                </div>

                {/* Start Date */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center space-x-1">
                    <CalendarIcon className="h-3 w-3 text-amber-500" />
                    <span>Adjustment Start Date</span>
                  </label>
                  <input
                    type="date"
                    value={formData.adjustmentStartDate}
                    onChange={(e) => setFormData({ ...formData, adjustmentStartDate: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-sm"
                  />
                </div>

                {/* End Date */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center space-x-1">
                    <CalendarIcon className="h-3 w-3 text-amber-500" />
                    <span>Adjustment End Date</span>
                  </label>
                  <input
                    type="date"
                    value={formData.adjustmentEndDate}
                    onChange={(e) => setFormData({ ...formData, adjustmentEndDate: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-sm"
                  />
                </div>

                {/* Payroll Remark */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    Remark
                  </label>
                  <input
                    type="text"
                    value={formData.payrollRemark}
                    onChange={(e) => setFormData({ ...formData, payrollRemark: e.target.value })}
                    placeholder="Adjustment justification or remarks..."
                    className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 4: CONTRACTS (EMPLOYMENT CONTRACTS & VERSION HISTORY)
            ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'CONTRACTS' && (
          <div className="space-y-6">
            {/* Header & New Contract Action */}
            <div className="border-b border-border/70 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center space-x-2">
                  <div className="h-6 w-6 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <FileText className="h-3.5 w-3.5" />
                  </div>
                  <span>Employment Contracts &amp; Version History</span>
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Directly synchronized with employee profile payroll, designation, and governance records.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setContractToAmend(null);
                  setIsNewContractModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-bold tracking-wide transition flex items-center space-x-1.5 shadow-md shadow-amber-500/20 cursor-pointer self-start sm:self-auto active:scale-95"
              >
                <FilePlus className="h-3.5 w-3.5" />
                <span>+ New Contract</span>
              </button>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-surface/60 border border-border">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Total Versions
                </span>
                <span className="text-lg font-bold text-foreground mt-0.5 block">
                  {employeeContracts.length}
                </span>
                <span className="text-[10px] text-muted-foreground">Contract agreements</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-surface/60 border border-border">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Active Status
                </span>
                <div className="mt-1">
                  {(() => {
                    const latest = employeeContracts[0];
                    const status = latest ? deriveContractStatus(latest) : 'Active';
                    const color =
                      status === 'Active'
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                        : status === 'Expiring'
                        ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                        : 'bg-rose-500/10 text-rose-500 border-rose-500/30';
                    return (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${color}`}>
                        &bull; {status}
                      </span>
                    );
                  })()}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-surface/60 border border-border">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Contract Type
                </span>
                <span className="text-xs font-bold text-foreground mt-1 block">
                  {employeeContracts[0]?.contractType || 'Fixed-Term'}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {employeeContracts[0]?.workingSchedule || 'Full-Time'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-surface/60 border border-border">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Monthly Wage
                </span>
                <span className="text-sm font-bold text-emerald-500 font-mono mt-0.5 block">
                  ৳ {(employeeContracts[0]?.remunerationAmount || formData.wage || 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-muted-foreground">Gross monthly BDT</span>
              </div>
            </div>

            {/* Contracts List Table */}
            <div className="border border-border/80 rounded-2xl overflow-hidden shadow-sm bg-surface/30">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface/80 text-[11px] uppercase font-bold text-muted-foreground border-b border-border/70 tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Contract Ref / No</th>
                      <th className="py-3 px-4">Effective &amp; Duration</th>
                      <th className="py-3 px-4">Designation &amp; Entity</th>
                      <th className="py-3 px-4">Type &amp; Schedule</th>
                      <th className="py-3 px-4">Monthly Wage</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {employeeContracts.map((c, idx) => {
                      const status = deriveContractStatus(c);
                      const statusBadge =
                        status === 'Active'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : status === 'Expiring'
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                          : status === 'Upcoming'
                          ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                          : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30';

                      return (
                        <tr
                          key={c.id || idx}
                          onClick={() => setSelectedContractForDoc(c)}
                          className="hover:bg-surface/60 transition cursor-pointer group"
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-2">
                              <div className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                {idx === 0 ? 'v' + employeeContracts.length : 'v' + (employeeContracts.length - idx)}
                              </div>
                              <div>
                                <span className="font-mono font-bold text-foreground block group-hover:text-amber-500 transition">
                                  {c.contractNo || `CON-${c.employeeCode}`}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {c.effectiveDate ? `Effective: ${formatDisplayDate(c.effectiveDate)}` : 'Base Profile Record'}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-medium">
                            <div className="text-foreground">
                              {formatDisplayDate(c.startDate)} <span className="text-muted-foreground">&rarr;</span> {c.endDate ? formatDisplayDate(c.endDate) : 'Permanent'}
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {c.endDate ? 'Fixed-Term Contract' : 'Permanent Employment'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-foreground block">
                              {c.designation || formData.designation}
                            </span>
                            <span className="text-[10px] text-muted-foreground block">
                              {c.organization} &bull; {c.department}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-surface border border-border text-foreground">
                              {c.contractType}
                            </span>
                            <span className="text-[10px] text-muted-foreground block mt-0.5">
                              {c.workingSchedule}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-mono font-bold text-emerald-500 text-xs">
                              ৳ {(c.remunerationAmount || formData.wage || 0).toLocaleString()}
                            </span>
                            <span className="text-[10px] text-muted-foreground block">Monthly Gross</span>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusBadge}`}>
                              &bull; {status}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end space-x-1.5" onClick={(e) => e.stopPropagation()}>
                              {/* Details / Document View */}
                              <button
                                type="button"
                                onClick={() => setSelectedContractForDoc(c)}
                                className="p-1.5 rounded-xl bg-card border border-border hover:border-amber-500 hover:text-amber-500 text-muted-foreground transition shadow-sm cursor-pointer"
                                title="View Contract Document & Details"
                              >
                                <FileText className="h-3.5 w-3.5" />
                              </button>

                              {/* Print / PDF */}
                              <button
                                type="button"
                                onClick={() => setSelectedContractForDoc(c)}
                                className="p-1.5 rounded-xl bg-card border border-border hover:border-emerald-500 hover:text-emerald-500 text-muted-foreground transition shadow-sm cursor-pointer"
                                title="Print / PDF Export"
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </button>

                              {/* Edit / Amend */}
                              <button
                                type="button"
                                onClick={() => {
                                  setContractToAmend(c);
                                  setIsNewContractModalOpen(true);
                                }}
                                className="p-1.5 rounded-xl bg-card border border-border hover:border-blue-500 hover:text-blue-500 text-muted-foreground transition shadow-sm cursor-pointer"
                                title="Edit / Amend Contract"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB: INSURANCE (HEALTH & MEDICAL COVERAGE)
            ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'INSURANCE' && (
          <div className="space-y-6">
            <div className="border-b border-border/70 pb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center space-x-2">
                <div className="h-6 w-6 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Shield className="h-3.5 w-3.5" />
                </div>
                <span>Health &amp; Medical Insurance Configuration</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
              {/* Insurance Status */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Insurance Status
                </label>
                <select
                  value={formData.insuranceStatus || 'Active'}
                  onChange={(e) => setFormData({ ...formData, insuranceStatus: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-sm"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              {/* Coverage Category */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Coverage Category
                </label>
                <select
                  value={formData.insuranceCoverageCategory || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    const selectedCat = insuranceCategories.find((c) => c.name === val);
                    setFormData({
                      ...formData,
                      insuranceCoverageCategory: val,
                      insuranceMonthlyPremium: selectedCat ? selectedCat.monthlyPremium : formData.insuranceMonthlyPremium,
                    });
                  }}
                  className="w-full h-10 px-3 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-sm"
                >
                  {insuranceCategories.length > 0 ? (
                    insuranceCategories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name} (৳{cat.monthlyPremium?.toLocaleString()}/mo)
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Standard Full-Time (Plan B)">Standard Full-Time (Plan B)</option>
                      <option value="Executive Coverage (Plan A)">Executive Coverage (Plan A)</option>
                      <option value="Basic Coverage (Plan C)">Basic Coverage (Plan C)</option>
                    </>
                  )}
                </select>
              </div>

              {/* Total Monthly Premium */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Total Monthly Premium (৳)
                </label>
                <select
                  value={formData.insuranceMonthlyPremium ?? 1500}
                  onChange={(e) => setFormData({ ...formData, insuranceMonthlyPremium: Number(e.target.value) })}
                  className="w-full h-10 px-3 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-sm"
                >
                  {insuranceCategories.length > 0 ? (
                    insuranceCategories.map((cat) => (
                      <option key={cat.id} value={cat.monthlyPremium}>
                        ৳ {cat.monthlyPremium?.toLocaleString()} &bull; {cat.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value={1500}>৳ 1,500 &bull; Standard Plan</option>
                      <option value={2500}>৳ 2,500 &bull; Executive Plan</option>
                      <option value={1000}>৳ 1,000 &bull; Basic Plan</option>
                    </>
                  )}
                </select>
              </div>

              {/* Employee Health Insurance ID */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Employee Health Insurance ID
                </label>
                <input
                  type="text"
                  value={formData.employeeHealthInsuranceId || ''}
                  onChange={(e) => setFormData({ ...formData, employeeHealthInsuranceId: e.target.value })}
                  placeholder="e.g. HI-EMP-10029"
                  className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                />
              </div>

              {/* Spouse Health Insurance ID */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Spouse Health Insurance ID
                </label>
                <input
                  type="text"
                  value={formData.spouseHealthInsuranceId || ''}
                  onChange={(e) => setFormData({ ...formData, spouseHealthInsuranceId: e.target.value })}
                  placeholder="e.g. HI-SPOUSE-20038"
                  className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                />
              </div>

              {/* Spouse Name */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Spouse Name
                </label>
                <input
                  type="text"
                  value={formData.spouseName || ''}
                  onChange={(e) => setFormData({ ...formData, spouseName: e.target.value })}
                  placeholder="Spouse Legal Name"
                  className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                />
              </div>

              {/* Child 1 Health Insurance ID */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Child 1 Health Insurance ID
                </label>
                <input
                  type="text"
                  value={formData.child1HealthInsuranceId || ''}
                  onChange={(e) => setFormData({ ...formData, child1HealthInsuranceId: e.target.value })}
                  placeholder="e.g. HI-CHILD1-3001"
                  className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                />
              </div>

              {/* Child 1 Name */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Child 1 Name
                </label>
                <input
                  type="text"
                  value={formData.child1Name || ''}
                  onChange={(e) => setFormData({ ...formData, child1Name: e.target.value })}
                  placeholder="Child 1 Legal Name"
                  className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                />
              </div>

              {/* Child 2 Health Insurance ID */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Child 2 Health Insurance ID
                </label>
                <input
                  type="text"
                  value={formData.child2HealthInsuranceId || ''}
                  onChange={(e) => setFormData({ ...formData, child2HealthInsuranceId: e.target.value })}
                  placeholder="e.g. HI-CHILD2-3002"
                  className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                />
              </div>

              {/* Child 2 Name */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Child 2 Name
                </label>
                <input
                  type="text"
                  value={formData.child2Name || ''}
                  onChange={(e) => setFormData({ ...formData, child2Name: e.target.value })}
                  placeholder="Child 2 Legal Name"
                  className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                />
              </div>

              {/* Child 3 Health Insurance ID */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Child 3 Health Insurance ID
                </label>
                <input
                  type="text"
                  value={formData.child3HealthInsuranceId || ''}
                  onChange={(e) => setFormData({ ...formData, child3HealthInsuranceId: e.target.value })}
                  placeholder="e.g. HI-CHILD3-3003"
                  className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                />
              </div>

              {/* Child 3 Name */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Child 3 Name
                </label>
                <input
                  type="text"
                  value={formData.child3Name || ''}
                  onChange={(e) => setFormData({ ...formData, child3Name: e.target.value })}
                  placeholder="Child 3 Legal Name"
                  className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 5: DSP (DIGITAL SCHOOL PROGRAM)
            ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'DSP' && (
          <div className="space-y-6">
            <div className="border-b border-border/70 pb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center space-x-2">
                <div className="h-6 w-6 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <span>Office Details &amp; Digital School Program Configurations</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {/* Office Days (Dropdown + Custom _ to _ Auto-Add Input) */}
              <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    Office Days <span className="text-amber-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomDays(!isCustomDays)}
                    className="text-[10px] font-bold text-amber-500 hover:underline cursor-pointer"
                  >
                    {isCustomDays ? 'Cancel Custom' : '+ Add Custom Days'}
                  </button>
                </div>

                {!isCustomDays ? (
                  <select
                    value={formData.officeDays}
                    onChange={(e) => {
                      if (e.target.value === 'CUSTOM_ACTION') {
                        setIsCustomDays(true);
                      } else {
                        setFormData({ ...formData, officeDays: e.target.value });
                      }
                    }}
                    className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-sm"
                  >
                    {officeDaysOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                    <option value="CUSTOM_ACTION" className="text-amber-500 font-bold">
                      + Custom (Click to enter _ to _)
                    </option>
                  </select>
                ) : (
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2 animate-in fade-in">
                    <div className="text-[11px] font-bold text-amber-400">Specify Custom Days Range:</div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={customDaysFrom}
                        onChange={(e) => setCustomDaysFrom(e.target.value)}
                        placeholder="e.g. Saturday"
                        className="w-1/2 h-9 px-2.5 rounded-lg bg-surface border border-border text-foreground text-xs"
                      />
                      <span className="font-bold text-foreground text-xs">to</span>
                      <input
                        type="text"
                        value={customDaysTo}
                        onChange={(e) => setCustomDaysTo(e.target.value)}
                        placeholder="e.g. Wednesday"
                        className="w-1/2 h-9 px-2.5 rounded-lg bg-surface border border-border text-foreground text-xs"
                      />
                    </div>
                    <div className="flex items-center justify-end space-x-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsCustomDays(false)}
                        className="px-2.5 py-1 rounded-lg text-muted-foreground text-[10px] font-bold hover:bg-surface cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyCustomDays}
                        className="px-3 py-1 rounded-lg bg-amber-500 text-white font-bold text-[10px] shadow-sm cursor-pointer"
                      >
                        Add to Options
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Office Hours */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Office Hours
                </label>
                <select
                  value={formData.officeHours}
                  onChange={(e) => setFormData({ ...formData, officeHours: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-sm"
                >
                  {DEFAULT_OFFICE_HOURS.map((hr) => (
                    <option key={hr} value={hr}>
                      {hr}
                    </option>
                  ))}
                </select>
              </div>

              {/* RFID */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  RFID Number / Badge ID
                </label>
                <input
                  type="text"
                  value={formData.rfid}
                  onChange={(e) => setFormData({ ...formData, rfid: e.target.value })}
                  placeholder="e.g. RFID-884920"
                  className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-mono font-bold text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                />
              </div>

              {/* Leave Group */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Leave Group
                </label>
                <select
                  value={formData.leaveGroup}
                  onChange={(e) => setFormData({ ...formData, leaveGroup: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-sm"
                >
                  {LEAVE_GROUPS.map((lg) => (
                    <option key={lg} value={lg}>
                      {lg}
                    </option>
                  ))}
                </select>
              </div>

              {/* Employee Type */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Employee Type
                </label>
                <select
                  value={formData.employeeType}
                  onChange={(e) => setFormData({ ...formData, employeeType: e.target.value as any })}
                  className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-sm"
                >
                  {EMPLOYEE_TYPES.map((et) => (
                    <option key={et} value={et}>
                      {et}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 6: LEAVE & ATTENDANCE
            ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'LEAVE_ATTENDANCE' && (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="border-b border-border/70 pb-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center space-x-2">
                <div className="h-6 w-6 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <CalendarDays className="h-3.5 w-3.5" />
                </div>
                <span>Leave Entitlements &amp; Attendance Tracking Configuration</span>
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                {/* Regularization Quick Toggle Button */}
                <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-surface/80 border border-border/80 shadow-2xs">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-[11px] font-bold text-foreground">Regularization:</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formData.allowRegularization !== false}
                    onClick={() => handleToggleRegularization(!(formData.allowRegularization !== false))}
                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      formData.allowRegularization !== false ? 'bg-amber-500' : 'bg-muted-foreground/30'
                    }`}
                    title={
                      formData.allowRegularization !== false
                        ? 'Regularization requests are allowed. Click to turn OFF.'
                        : 'Regularization requests are disabled. Click to turn ON.'
                    }
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        formData.allowRegularization !== false ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span
                    className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                      formData.allowRegularization !== false
                        ? 'bg-emerald-500/15 text-emerald-500'
                        : 'bg-rose-500/15 text-rose-500'
                    }`}
                  >
                    {formData.allowRegularization !== false ? 'ON' : 'OFF'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setProfileLeaveForm({
                      leaveType: 'Casual Leave',
                      fromDate: new Date().toISOString().split('T')[0]!,
                      toDate: new Date().toISOString().split('T')[0]!,
                      totalDays: 1,
                      halfDayType: 'Full Day',
                      reason: '',
                      pregnancyConfirmationDate: '',
                      expectedDeliveryDate: '',
                      intendedMaternityStartDate: '',
                      bereavementRelationship: '',
                    });
                    setProfileLeaveError(null);
                    setShowProfileLeaveModal(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-black text-xs uppercase tracking-wider transition flex items-center space-x-1.5 shadow-md shadow-amber-500/20 cursor-pointer active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>APPLY FOR LEAVE</span>
                </button>
                <a
                  href="/pnc/attendance/report"
                  className="text-[11px] font-bold text-muted-foreground hover:text-foreground flex items-center space-x-1 transition"
                >
                  <span>Attendance Report</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            {/* ── 1. LEAVE BALANCES ENTITLEMENT CARDS (LIVE CONNECTED) ── */}
            {(() => {
              const hasAllocation = Boolean(empLeaveAllocation);
              const clAlloc = empLeaveAllocation ? (empLeaveAllocation.casualAllocated ?? 0) : 0;
              const clUsed = empLeaveAllocation ? (empLeaveAllocation.casualUsed ?? 0) : 0;
              const clRem = Math.max(0, clAlloc - clUsed);

              const mlAlloc = empLeaveAllocation ? (empLeaveAllocation.medicalAllocated ?? 0) : 0;
              const mlUsed = empLeaveAllocation ? (empLeaveAllocation.medicalUsed ?? 0) : 0;
              const mlRem = Math.max(0, mlAlloc - mlUsed);

              const elAlloc = empLeaveAllocation ? (empLeaveAllocation.emergencyAllocated ?? 0) : 0;
              const elUsed = empLeaveAllocation ? (empLeaveAllocation.emergencyUsed ?? 0) : 0;
              const elRem = Math.max(0, elAlloc - elUsed);

              const alAlloc = empLeaveAllocation ? (empLeaveAllocation.annualAllocated ?? 0) : 0;
              const alUsed = empLeaveAllocation ? (empLeaveAllocation.annualUsed ?? 0) : 0;
              const alRem = Math.max(0, alAlloc - alUsed);

              const coAlloc = empLeaveAllocation ? (empLeaveAllocation.compOffAllocated ?? 0) : 0;
              const coUsed = empLeaveAllocation ? (empLeaveAllocation.compOffUsed ?? 0) : 0;
              const coRem = Math.max(0, coAlloc - coUsed);

              const plAlloc = empLeaveAllocation ? (empLeaveAllocation.paternityAllocated ?? 0) : 0;
              const plUsed = empLeaveAllocation ? (empLeaveAllocation.paternityUsed ?? 0) : 0;
              const plRem = Math.max(0, plAlloc - plUsed);

              const matAlloc = empLeaveAllocation ? (empLeaveAllocation.maternityAllocated ?? 0) : 0;
              const matUsed = empLeaveAllocation ? (empLeaveAllocation.maternityUsed ?? 0) : 0;
              const matRem = Math.max(0, matAlloc - matUsed);

              const blAlloc = empLeaveAllocation ? 5 : 0;
              const blUsed = empLeaveAllocation ? (empLeaveAllocation.bereavementUsed ?? 0) : 0;
              const blRem = Math.max(0, blAlloc - blUsed);

              const empGender = (formData.gender || empLeaveAllocation?.gender || '').toUpperCase().trim();
              const isMale = empGender === 'MALE' || empGender === 'M';
              const isFemale = empGender === 'FEMALE' || empGender === 'F';

              const clPct = clAlloc > 0 ? (clRem / clAlloc) * 100 : 0;
              const mlPct = mlAlloc > 0 ? (mlRem / mlAlloc) * 100 : 0;
              const elPct = elAlloc > 0 ? (elRem / elAlloc) * 100 : 0;
              const alPct = alAlloc > 0 ? (alRem / alAlloc) * 100 : 0;
              const coPct = coAlloc > 0 ? (coRem / coAlloc) * 100 : 0;
              const plPct = plAlloc > 0 ? (plRem / plAlloc) * 100 : 0;
              const matPct = matAlloc > 0 ? (matRem / matAlloc) * 100 : 0;
              const blPct = blAlloc > 0 ? (blRem / blAlloc) * 100 : 0;

              const renderRing = (pct: number, stroke: string) => {
                const size = 56;
                const strokeWidth = 5;
                const radius = (size - strokeWidth) / 2;
                const circ = 2 * Math.PI * radius;
                const clamped = Math.min(100, Math.max(0, pct));
                const offset = circ - (clamped / 100) * circ;
                return (
                  <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
                    <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
                      <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        className="text-foreground/10 opacity-40"
                      />
                      <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke={stroke}
                        strokeWidth={strokeWidth}
                        strokeDasharray={circ}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        className="transition-all duration-500 ease-out"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center font-black text-[11px] text-foreground">
                      {Math.round(clamped)}%
                    </span>
                  </div>
                );
              };

              return (
                <div className="space-y-4">
                  {!hasAllocation && (
                    <div className="flex items-center justify-between p-3 px-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-semibold animate-in fade-in">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <span>No leave quota allocated for this employee. Balances are 0 until allocated in Time Off &gt; Allocations.</span>
                      </div>
                      <a
                        href="/pnc/time-off/allocations"
                        className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] transition shadow-sm flex-shrink-0"
                      >
                        + Allocate Quota
                      </a>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* 1. Casual Leave Card */}
                  <div className="rounded-2xl bg-card border border-border/80 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between space-y-2">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500 rounded-l-2xl" />
                    <div className="flex items-center justify-between pl-2">
                      <div className="flex items-center space-x-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="text-xs font-bold text-foreground">Casual</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase">CL</span>
                    </div>
                    <div className="flex items-center space-x-3 pl-2 pt-1">
                      {renderRing(clPct, '#10b981')}
                      <div className="space-y-0.5">
                        <div className="text-xl font-black text-foreground">
                          {clRem}
                          <span className="text-xs font-semibold text-muted-foreground">/{clAlloc}d</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground font-medium">
                          Used <strong className="text-foreground font-bold">{clUsed}</strong> &bull; {clAlloc} total
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. Medical Leave Card */}
                  <div className="rounded-2xl bg-card border border-border/80 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between space-y-2">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500 rounded-l-2xl" />
                    <div className="flex items-center justify-between pl-2">
                      <div className="flex items-center space-x-2">
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                        <span className="text-xs font-bold text-foreground">Medical</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase">ML</span>
                    </div>
                    <div className="flex items-center space-x-3 pl-2 pt-1">
                      {renderRing(mlPct, '#3b82f6')}
                      <div className="space-y-0.5">
                        <div className="text-xl font-black text-foreground">
                          {mlRem}
                          <span className="text-xs font-semibold text-muted-foreground">/{mlAlloc}d</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground font-medium">
                          Used <strong className="text-foreground font-bold">{mlUsed}</strong> &bull; {mlAlloc} total
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. Emergency Leave Card */}
                  <div className="rounded-2xl bg-card border border-border/80 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between space-y-2">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-600 rounded-l-2xl" />
                    <div className="flex items-center justify-between pl-2">
                      <div className="flex items-center space-x-2">
                        <span className="h-2 w-2 rounded-full bg-amber-600" />
                        <span className="text-xs font-bold text-foreground">Emergency</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase">EL</span>
                    </div>
                    <div className="flex items-center space-x-3 pl-2 pt-1">
                      {renderRing(elPct, '#d97706')}
                      <div className="space-y-0.5">
                        <div className="text-xl font-black text-foreground">
                          {elRem}
                          <span className="text-xs font-semibold text-muted-foreground">/{elAlloc}d</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground font-medium">
                          Used <strong className="text-foreground font-bold">{elUsed}</strong> &bull; {elAlloc} total
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4. Annual Leave Card */}
                  <div className="rounded-2xl bg-card border border-border/80 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between space-y-2">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-purple-500 rounded-l-2xl" />
                    <div className="flex items-center justify-between pl-2">
                      <div className="flex items-center space-x-2">
                        <span className="h-2 w-2 rounded-full bg-purple-500" />
                        <span className="text-xs font-bold text-foreground">Annual</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase">AL</span>
                    </div>
                    <div className="flex items-center space-x-3 pl-2 pt-1">
                      {renderRing(alPct, '#8b5cf6')}
                      <div className="space-y-0.5">
                        <div className="text-xl font-black text-foreground">
                          {alRem}
                          <span className="text-xs font-semibold text-muted-foreground">/{alAlloc}d</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground font-medium">
                          Used <strong className="text-foreground font-bold">{alUsed}</strong> &bull; {alAlloc} total
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 5. Compensatory Leave Card */}
                  <div className="rounded-2xl bg-card border border-border/80 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between space-y-2">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-cyan-500 rounded-l-2xl" />
                    <div className="flex items-center justify-between pl-2">
                      <div className="flex items-center space-x-2">
                        <span className="h-2 w-2 rounded-full bg-cyan-500" />
                        <span className="text-xs font-bold text-foreground">Compensatory</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase">CO</span>
                    </div>
                    <div className="flex items-center space-x-3 pl-2 pt-1">
                      {renderRing(coPct, '#06b6d4')}
                      <div className="space-y-0.5">
                        <div className="text-xl font-black text-foreground">
                          {coRem}
                          <span className="text-xs font-semibold text-muted-foreground">/{coAlloc}h</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground font-medium">
                          Used <strong className="text-foreground font-bold">{coUsed}h</strong> &bull; {coAlloc}h total
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 6. Paternity Leave Card (Only for Male Employees) */}
                  {(!isFemale || (!isMale && !isFemale && plAlloc > 0)) && (
                    <div className="rounded-2xl bg-card border border-border/80 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between space-y-2">
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500 rounded-l-2xl" />
                      <div className="flex items-center justify-between pl-2">
                        <div className="flex items-center space-x-2">
                          <span className="h-2 w-2 rounded-full bg-indigo-500" />
                          <span className="text-xs font-bold text-foreground">Paternity</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase">PL</span>
                      </div>
                      <div className="flex items-center space-x-3 pl-2 pt-1">
                        {renderRing(plPct, '#6366f1')}
                        <div className="space-y-0.5">
                          <div className="text-xl font-black text-foreground">
                            {plRem}
                            <span className="text-xs font-semibold text-muted-foreground">/{plAlloc}d</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground font-medium">
                            Used <strong className="text-foreground font-bold">{plUsed}</strong> &bull; {plAlloc} total
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 7. Maternity Leave Card (Only for Female Employees) */}
                  {(!isMale || (!isMale && !isFemale && matAlloc > 0)) && (
                    <div className="rounded-2xl bg-card border border-border/80 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between space-y-2">
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-500 rounded-l-2xl" />
                      <div className="flex items-center justify-between pl-2">
                        <div className="flex items-center space-x-2">
                          <span className="h-2 w-2 rounded-full bg-rose-500" />
                          <span className="text-xs font-bold text-foreground">Maternity</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase">MAT</span>
                      </div>
                      <div className="flex items-center space-x-3 pl-2 pt-1">
                        {renderRing(matPct, '#f43f5e')}
                        <div className="space-y-0.5">
                          <div className="text-xl font-black text-foreground">
                            {matRem}
                            <span className="text-xs font-semibold text-muted-foreground">/{matAlloc}d</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground font-medium">
                            Used <strong className="text-foreground font-bold">{matUsed}</strong> &bull; {matAlloc} total
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 8. Bereavement Leave Card */}
                  <div className="rounded-2xl bg-card border border-border/80 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between space-y-2">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-slate-500 rounded-l-2xl" />
                    <div className="flex items-center justify-between pl-2">
                      <div className="flex items-center space-x-2">
                        <span className="h-2 w-2 rounded-full bg-slate-500" />
                        <span className="text-xs font-bold text-foreground">Bereavement</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase">BL</span>
                    </div>
                    <div className="flex items-center space-x-3 pl-2 pt-1">
                      {renderRing(blPct, '#64748b')}
                      <div className="space-y-0.5">
                        <div className="text-xl font-black text-foreground">
                          {blRem}
                          <span className="text-xs font-semibold text-muted-foreground">/5d</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground font-medium">
                          Used <strong className="text-foreground font-bold">{blUsed}</strong> &bull; 5d / incident
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

            {/* ── 1.5 EMPLOYEE LEAVE APPLICATIONS SUB-TABLE ── */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center space-x-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-amber-500" />
                  <span>Leave Application Records ({empLeaveRequests.length} Total)</span>
                </h4>
                <span className="text-[11px] font-semibold text-muted-foreground">
                  Policy Group: <strong className="text-foreground">{formData.leaveGroup || 'Standard Full-time'}</strong>
                </span>
              </div>

              <div className="rounded-2xl border border-border/80 overflow-hidden bg-card shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface/70 border-b border-border/60 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="py-3 px-4">Leave Category</th>
                      <th className="py-3 px-3">Date Range &amp; Shift</th>
                      <th className="py-3 px-3">Total Days</th>
                      <th className="py-3 px-3">Reason</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-medium">
                    {empLeaveRequests.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-muted-foreground text-xs font-semibold">
                          No leave applications recorded for this employee yet.
                        </td>
                      </tr>
                    ) : (
                      empLeaveRequests.map((req) => {
                        const isFirstHalf = req.halfDayType === 'First Half' || (req.totalDays === 0.5 && req.halfDayType !== 'Second Half');
                        const isSecondHalf = req.halfDayType === 'Second Half';
                        const isHalfDay = isFirstHalf || isSecondHalf;

                        return (
                          <tr key={req.id} className="hover:bg-surface/40 transition">
                            <td className="py-3 px-4 font-bold text-foreground">
                              {req.leaveType}
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-foreground">
                                <span>{formatDisplayDate(req.fromDate)} &rarr; {formatDisplayDate(req.toDate)}</span>
                                {isFirstHalf ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-sans font-bold bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30">
                                    🌅 1st Half (AM)
                                  </span>
                                ) : isSecondHalf ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-sans font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30">
                                    🌇 2nd Half (PM)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-sans font-bold bg-surface border border-border text-muted-foreground">
                                    Full Day
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-bold text-foreground">
                                {req.totalDays} {req.totalDays === 1 ? 'day' : 'days'}
                              </div>
                              <span className="text-[10px] font-semibold text-muted-foreground">
                                {isHalfDay ? '(Half Day)' : '(Full Day)'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-muted-foreground truncate max-w-xs">
                              {req.bereavementRelationship ? `[${req.bereavementRelationship}] ` : ''}
                              {req.reason}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                  req.status === 'Approved'
                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                                    : req.status === 'Pending'
                                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                                    : 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                                }`}
                              >
                                {req.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── 2. POLICY & SCHEDULE SETTINGS GRID ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {/* Working Schedule Shift (Master Link) */}
              <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Assigned Working Schedule / Shift <span className="text-amber-500">*</span>
                </label>
                <select
                  value={formData.workingSchedule}
                  onChange={(e) => setFormData({ ...formData, workingSchedule: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-sm"
                >
                  {shifts.length > 0 ? (
                    shifts.map((s) => (
                      <option key={s.id} value={`${s.name} (${s.officeStart} - ${s.officeEnd})`}>
                        {s.name} ({s.officeStart} - {s.officeEnd})
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="JAAGO HQ (10:00 AM - 06:00 PM)">JAAGO HQ (10:00 AM - 06:00 PM)</option>
                      <option value="Full Time Shift 1 (09:00 AM - 05:00 PM)">Full Time Shift 1 (09:00 AM - 05:00 PM)</option>
                      <option value="Full Time Shift 2 (10:00 AM - 06:00 PM)">Full Time Shift 2 (10:00 AM - 06:00 PM)</option>
                      <option value="Full Time Shift 3 (07:30 AM - 04:30 PM)">Full Time Shift 3 (07:30 AM - 04:30 PM)</option>
                      <option value="Full Time Shift 4 (08:00 AM - 05:00 PM)">Full Time Shift 4 (08:00 AM - 05:00 PM)</option>
                    </>
                  )}
                </select>
              </div>

              {/* Leave Policy Group */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Leave Policy Group
                </label>
                <select
                  value={formData.leavePolicy || 'Standard Full-time Employee Policy'}
                  onChange={(e) => setFormData({ ...formData, leavePolicy: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-sm"
                >
                  <option value="Standard Full-time Employee Policy">Standard Full-time Employee Policy (14 CL + 10 SL + 15 EL)</option>
                  <option value="Executive & Management Policy">Executive &amp; Management Policy (16 CL + 14 SL + 18 EL)</option>
                  <option value="DSP School Faculty Policy">DSP School Faculty Policy (Academic Calendar Based)</option>
                  <option value="Contractual & Project Staff Policy">Contractual &amp; Project Staff Policy (Pro-rated)</option>
                  <option value="Probationary Staff Policy">Probationary Staff Policy (Emergency Only)</option>
                </select>
              </div>

              {/* Weekend Days */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Weekly Off / Weekend Days
                </label>
                <select
                  value={formData.weekendDays || 'Friday & Saturday'}
                  onChange={(e) => setFormData({ ...formData, weekendDays: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-sm"
                >
                  <option value="Friday & Saturday">Friday &amp; Saturday (Standard 5-Day Week)</option>
                  <option value="Friday Only">Friday Only (6-Day Field/School Week)</option>
                  <option value="Sunday to Thursday">Sunday to Thursday (Rotational 5-Day)</option>
                  <option value="Saturday Only">Saturday Only (Rotational Single Off)</option>
                </select>
              </div>

              {/* Attendance Grace Period */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Late Grace / Buffer (min)
                </label>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={formData.attendanceGracePeriodMin ?? 15}
                  onChange={(e) =>
                    setFormData({ ...formData, attendanceGracePeriodMin: Number(e.target.value) })
                  }
                  className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                />
              </div>

              {/* Late Penalty Rule */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Late Penalty &amp; Deduction Rule
                </label>
                <select
                  defaultValue="3_LATES_HALF_DAY"
                  className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-sm"
                >
                  <option value="3_LATES_HALF_DAY">3 Consecutive Lates = 0.5 Day CL Deduction</option>
                  <option value="4_LATES_FULL_DAY">4 Lates in a Month = 1.0 Day CL Deduction</option>
                  <option value="GRACE_AND_WARNING">Grace Period + Line Manager Warning</option>
                  <option value="NO_AUTOMATED_PENALTY">No Automated Penalty (Manual Review)</option>
                </select>
              </div>

              {/* Overtime Eligibility */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Overtime Eligibility
                </label>
                <select
                  value={formData.overtimeEligible || 'No'}
                  onChange={(e) => setFormData({ ...formData, overtimeEligible: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-sm"
                >
                  <option value="No">No / Not Applicable (Salaried Staff)</option>
                  <option value="Yes">Yes (Standard 1.5x Hourly Rate)</option>
                  <option value="Fixed">Yes (Fixed Overtime Allowance / Shift)</option>
                </select>
              </div>

              {/* RFID / Biometric Device ID */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  RFID / Biometric Card ID
                </label>
                <input
                  type="text"
                  value={formData.rfid || ''}
                  onChange={(e) => setFormData({ ...formData, rfid: e.target.value })}
                  placeholder="e.g. RFID-884920"
                  className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-mono font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                />
              </div>

              {/* Biometric Verification Method */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Attendance Verification Method
                </label>
                <select
                  defaultValue="HYBRID"
                  className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-sm"
                >
                  <option value="HYBRID">RFID Card + Mobile GPS + Web Check-in</option>
                  <option value="RFID_ONLY">Biometric RFID Scanner Only</option>
                  <option value="WEB_MOBILE">Web Portal &amp; Mobile App Only</option>
                  <option value="MANUAL">Manual HR Entry Only</option>
                </select>
              </div>

              {/* Leave Entitlement Adjustment (CL Allocation) */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  CL Quota (Days / Year)
                </label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={formData.casualLeaveAllocated ?? 14}
                  onChange={(e) =>
                    setFormData({ ...formData, casualLeaveAllocated: Number(e.target.value) })
                  }
                  className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                />
              </div>

              {/* Attendance Regularization Permission Toggle Card */}
              <div className="p-3.5 rounded-xl bg-surface/50 border border-border flex items-center justify-between shadow-xs sm:col-span-2 lg:col-span-1">
                <div className="space-y-0.5 pr-2">
                  <div className="flex items-center space-x-1.5">
                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                      Regularization Allowed
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {formData.allowRegularization !== false
                      ? 'Employee is allowed to request regularizations'
                      : 'Regularization requests disabled for this employee'}
                  </p>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      formData.allowRegularization !== false
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                    }`}
                  >
                    {formData.allowRegularization !== false ? 'Enabled' : 'Disabled'}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formData.allowRegularization !== false}
                    onClick={() => handleToggleRegularization(!(formData.allowRegularization !== false))}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      formData.allowRegularization !== false ? 'bg-amber-500' : 'bg-muted-foreground/30'
                    }`}
                    title={
                      formData.allowRegularization !== false
                        ? 'Click to disable regularization requests'
                        : 'Click to allow regularization requests'
                    }
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        formData.allowRegularization !== false ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* ── 3. RECENT ATTENDANCE ACTIVITY LOG TABLE ── */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center space-x-1.5">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  <span>Recent Attendance Logs ({formData.name || 'Employee'})</span>
                </h4>
                <span className="text-[11px] font-semibold text-muted-foreground">
                  Shift: <strong className="text-foreground">{formData.workingSchedule}</strong>
                </span>
              </div>

              <div className="rounded-2xl border border-border/80 overflow-hidden bg-card shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface/70 border-b border-border/60 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-3">Check In</th>
                      <th className="py-3 px-3">Check Out</th>
                      <th className="py-3 px-3">Working Hours</th>
                      <th className="py-3 px-3">Device / Method</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      {formData.allowRegularization !== false && (
                        <th className="py-3 px-3 text-center">Regularization</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-medium">
                    {(() => {
                      const empLogs = getEmployeeAttendanceLogs(formData.code || formData.id || '', formData.name || '');
                      if (empLogs.length === 0) {
                        return (
                          <tr>
                            <td
                              colSpan={formData.allowRegularization !== false ? 7 : 6}
                              className="py-6 text-center text-muted-foreground text-xs font-semibold"
                            >
                              No attendance logs recorded for this employee yet.
                            </td>
                          </tr>
                        );
                      }

                      return empLogs.slice(0, 14).map((log: any) => {
                        const isAuto = Boolean(
                          log.isAutoCheckout ||
                          log.status === 'Auto Check Out' ||
                          (log.checkOutTime && (log.checkOutTime.includes('11:30') || log.checkOutTime === '23:30')) ||
                          (log.notes && log.notes.toLowerCase().includes('auto check-out'))
                        );
                        const effectiveCheckOut = isAuto ? (log.checkOutTime && log.checkOutTime !== '--:--' ? log.checkOutTime : '11:30 PM') : log.checkOutTime;
                        const durationStr = calculateWorkingHoursString(log.checkInTime, effectiveCheckOut);
                        return (
                          <tr key={log.id} className="hover:bg-surface/40 transition">
                            <td className="py-3 px-4 font-mono text-[11px] text-foreground font-bold">
                              {formatDisplayDate(log.date)}
                            </td>
                            <td className="py-3 px-3 font-semibold text-emerald-500 font-mono">
                              {log.checkInTime || '--:--'}
                            </td>
                            <td className="py-3 px-3 font-semibold text-rose-500 font-mono">
                              {effectiveCheckOut || '--:--'}
                            </td>
                            <td className="py-3 px-3 font-mono text-[11px] text-foreground font-bold">
                              {durationStr}
                            </td>
                            <td className="py-3 px-3 text-muted-foreground text-[11px]">
                              {isAuto ? (
                                <span className="inline-flex items-center space-x-1 text-amber-500 font-semibold">
                                  <span>{log.device || 'Web Portal'} (Auto)</span>
                                </span>
                              ) : (log.device || 'Web Portal')}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {(log.status === 'Leave' || log.status === 'Half Day') ? (
                                (() => {
                                  const notes = log.notes || '';
                                  let isFirst = notes.includes('First Half') || notes.includes('1st Half');
                                  let isSecond = notes.includes('Second Half') || notes.includes('2nd Half');
                                  if (!isFirst && !isSecond && (log.status === 'Half Day' || (log.checkInTime && log.checkInTime !== 'N/A') || (log.checkOutTime && log.checkOutTime !== 'N/A'))) {
                                    if (log.checkInTime && log.checkInTime.includes('02:00')) isSecond = true;
                                    else if (log.checkOutTime && log.checkOutTime.includes('02:00')) isFirst = true;
                                    else if (log.status === 'Half Day') isFirst = true;
                                  }
                                  if (!isFirst && !isSecond && empLeaveRequests && empLeaveRequests.length > 0) {
                                    const matched = empLeaveRequests.find((req) =>
                                      req.status === 'Approved' &&
                                      log.date >= req.fromDate &&
                                      log.date <= req.toDate
                                    );
                                    if (matched) {
                                      if (matched.halfDayType === 'First Half' || (!matched.halfDayType && Number(matched.totalDays) === 0.5)) isFirst = true;
                                      else if (matched.halfDayType === 'Second Half') isSecond = true;
                                    }
                                  }
                                  const isFullDay = !isFirst && !isSecond;
                                  const isFuture = log.date > new Date().toISOString().slice(0, 10);
                                  const showWorking = !isFullDay && !isFuture;
                                  return (
                                    <div className="flex flex-col items-center gap-0.5 max-w-[85px] mx-auto">
                                      {isFullDay ? (
                                        <div className="h-3.5 w-full rounded bg-purple-500/25 border border-purple-500/40 flex items-center justify-center">
                                          <span className="text-[7.5px] font-black text-purple-400">FULL DAY</span>
                                        </div>
                                      ) : isFirst ? (
                                        <div className="flex gap-0.5 w-full">
                                          <div className="h-3.5 flex-1 rounded-l bg-purple-500/30 border border-purple-500/40 flex items-center justify-center">
                                            <span className="text-[7.5px] font-black text-purple-400">🌅AM</span>
                                          </div>
                                          <div className={`h-3.5 flex-1 rounded-r flex items-center justify-center ${showWorking ? 'bg-emerald-500/20 border border-emerald-500/40' : 'bg-surface border border-border/40'}`}>
                                            <span className={`text-[7.5px] font-black ${showWorking ? 'text-emerald-400' : 'text-muted-foreground'}`}>{showWorking ? '✓PM' : '·PM'}</span>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex gap-0.5 w-full">
                                          <div className={`h-3.5 flex-1 rounded-l flex items-center justify-center ${showWorking ? 'bg-emerald-500/20 border border-emerald-500/40' : 'bg-surface border border-border/40'}`}>
                                            <span className={`text-[7.5px] font-black ${showWorking ? 'text-emerald-400' : 'text-muted-foreground'}`}>{showWorking ? '✓AM' : '·AM'}</span>
                                          </div>
                                          <div className="h-3.5 flex-1 rounded-r bg-purple-500/30 border border-purple-500/40 flex items-center justify-center">
                                            <span className="text-[7.5px] font-black text-purple-400">🌇PM</span>
                                          </div>
                                        </div>
                                      )}
                                      <span className="text-[8px] font-semibold text-purple-400 leading-none">
                                        {isFullDay ? 'Leave' : isFirst ? '1st Half' : '2nd Half'}
                                      </span>
                                    </div>
                                  );
                                })()
                              ) : isAuto ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-amber-500/15 text-amber-500 border-amber-500/30 whitespace-nowrap">
                                  Auto Check Out
                                </span>
                              ) : (
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                    log.status === 'Present'
                                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                                      : log.status === 'Late'
                                      ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                                      : 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                                  }`}
                                >
                                  {log.status}
                                </span>
                              )}
                            </td>
                            {/* Regularization Column */}
                            {formData.allowRegularization !== false && (
                              <td className="py-3 px-3 text-center whitespace-nowrap">
                                {(() => {
                                  const existing = getExistingRegularization(log);
                                  if (existing?.status === 'Approved') {
                                    return (
                                      <span
                                        className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 text-[10px] font-black tracking-wide shadow-2xs"
                                        title={`Regularized (Approved by ${existing.approvedBy || 'Supervisor'}): ${existing.reason}`}
                                      >
                                        <CheckCircle2 className="h-3 w-3 mr-0.5 text-emerald-500" />
                                        <span>R.Approved</span>
                                      </span>
                                    );
                                  }
                                  if (existing?.status === 'Pending') {
                                    return (
                                      <span
                                        className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-500 border border-amber-500/30 text-[10px] font-black tracking-wide shadow-2xs"
                                        title="Regularization request pending review"
                                      >
                                        <Clock className="h-3 w-3 mr-0.5 animate-spin text-amber-500" />
                                        <span>Pending</span>
                                      </span>
                                    );
                                  }
                                  if (existing?.status === 'Refused' || existing?.status === 'Rejected') {
                                    return (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenProfileRegModal(log)}
                                        className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[9.5px] font-black transition shadow-2xs bg-rose-500/15 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/30 cursor-pointer active:scale-95"
                                        title={`Refused: ${existing.refusalNote || ''} - Click to re-apply`}
                                      >
                                        <XCircle className="h-3 w-3 mr-0.5" />
                                        <span>R.Refused</span>
                                      </button>
                                    );
                                  }

                                  const eligible = isLogEligibleForReg(log);
                                  if (!eligible) {
                                    return <span className="text-muted-foreground/30 font-bold text-xs">--</span>;
                                  }

                                  return (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenProfileRegModal(log)}
                                      className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500 text-amber-500 hover:text-slate-950 border border-amber-500/30 hover:border-amber-500 text-[10.5px] font-black tracking-wide shadow-2xs transition duration-150 cursor-pointer inline-flex items-center space-x-1 active:scale-95"
                                      title="Click to request attendance regularization"
                                    >
                                      <span>Regularize</span>
                                    </button>
                                  );
                                })()}
                              </td>
                            )}
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 7: LOG HISTORY (ODOO-STYLE WORKING HISTORY TRACKER)
            ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'LOG_HISTORY' && (
          <div className="space-y-6">
            <div className="border-b border-border/70 pb-2.5 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center space-x-2">
                <div className="h-6 w-6 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <History className="h-3.5 w-3.5" />
                </div>
                <span>Field Change History &amp; Audit Log</span>
              </h3>
              <span className="text-[11px] font-bold text-muted-foreground">
                Total Logs: {formData.logHistory?.length || 0}
              </span>
            </div>

            {formData.logHistory && formData.logHistory.length > 0 ? (
              <div className="space-y-3">
                {formData.logHistory.map((log, index) => (
                  <div
                    key={log.id || index}
                    className="p-4 rounded-2xl bg-surface/50 border border-border/80 flex items-start space-x-4 transition hover:border-primary/40 shadow-sm"
                  >
                    {/* User Avatar Circle */}
                    <div className="h-9 w-9 rounded-full bg-amber-500/20 text-amber-400 font-extrabold flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                      {(log.userName || 'NK').slice(0, 2).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5 text-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-foreground">{log.userName}</span>
                          <span className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-bold text-muted-foreground">
                            {log.userRole || 'User'}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{log.formattedDate || new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-400 font-bold text-[11px] border border-amber-500/20">
                          {log.field}
                        </span>

                        <div className="flex items-center space-x-2 text-[11px] font-mono bg-card px-2.5 py-1 rounded-lg border border-border">
                          <span className="text-rose-400 line-through truncate max-w-[150px]">
                            {log.oldValue || '—'}
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="text-emerald-400 font-bold truncate max-w-[150px]">
                            {log.newValue || '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 space-y-2 text-muted-foreground">
                <Activity className="h-10 w-10 mx-auto text-muted-foreground/60" />
                <div className="font-bold text-xs">No modification history recorded yet</div>
                <div className="text-[11px]">Any field updates made during your session will be tracked here.</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 5. BOTTOM FLOATING SAVE BAR (Only if NOT read-only) ── */}
      {!readOnly && (
        <div className="sticky bottom-4 z-40 p-4 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/20 shadow-2xl flex items-center justify-between gap-4">
          <div className="text-xs text-white/80 font-medium hidden sm:block">
            Profile Changes: <strong className="text-white">{formData.name || 'New Profile'}</strong> &bull; {formData.status}
          </div>
          <div className="flex items-center space-x-2 ml-auto">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSave()}
              className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-black text-xs uppercase tracking-wider transition flex items-center space-x-2 shadow-lg shadow-amber-500/30 cursor-pointer active:scale-95"
            >
              <Save className="h-4 w-4" />
              <span>Save Employee Profile</span>
            </button>
          </div>
        </div>
      )}

      {/* ── 6. INTERACTIVE AVATAR CROP / DRAG-TO-ADJUST MODAL ── */}
      {showCropModal && cropRawImageSrc && (
        <AvatarCropModal
          imageSrc={cropRawImageSrc}
          onCropComplete={handleCropModalComplete}
          onCancel={() => {
            setShowCropModal(false);
            if (cropRawImageSrc && cropRawImageSrc.startsWith('blob:')) {
              URL.revokeObjectURL(cropRawImageSrc);
            }
            setCropRawImageSrc(null);
          }}
          onSelectDifferentFile={() => {
            setShowCropModal(false);
            fileInputRef.current?.click();
          }}
        />
      )}

      {/* ── 7. APPLY FOR LEAVE MODAL (FOR THIS EMPLOYEE) ── */}
      {showProfileLeaveModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-card border border-border shadow-2xl p-6 sm:p-8 space-y-5 no-scrollbar">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div>
                <h3 className="text-lg font-serif font-black text-foreground">
                  Apply for Leave ({formData.name || 'Employee'})
                </h3>
                <p className="text-xs text-muted-foreground font-mono">
                  {formData.code} &bull; {formData.department}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowProfileLeaveModal(false)}
                className="p-1 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const empGender = (formData.gender || empLeaveAllocation?.gender || '').toUpperCase().trim();
                const eligibility = validateLeaveGenderEligibility(empGender, profileLeaveForm.leaveType);
                if (!eligibility.valid) {
                  setPolicyErrorModal({
                    isOpen: true,
                    title: eligibility.title || 'Leave Policy Ineligibility',
                    reason: eligibility.reason || 'This leave type is not allowed for this employee gender.',
                  });
                  return;
                }

                if (!profileLeaveForm.reason) {
                  setProfileLeaveError('Please enter the reason for leave');
                  return;
                }

                if (profileLeaveForm.leaveType === 'Bereavement Leave' && !profileLeaveForm.bereavementRelationship) {
                  setProfileLeaveError('Please select immediate family relationship for Bereavement Leave');
                  return;
                }

                // Check probation rules
                const isEmpProbation = Boolean(
                  (formData as any)?.probationaryStatus === 'On Probation' ||
                  (formData as any)?.probationaryStatus === 'Probationary' ||
                  (formData as any)?.probationaryStatus === 'Probation' ||
                  (formData as any)?.leaveGroup === 'Probationary Staff'
                );

                if (profileLeaveForm.leaveType === 'Casual Leave') {
                  const clValidation = validateCasualLeaveRules({
                    startDate: profileLeaveForm.fromDate,
                    endDate: profileLeaveForm.toDate,
                    mode: profileLeaveForm.halfDayType === 'Full Day' ? 'FULL' : 'HALF',
                    totalCalculatedDays: profileLeaveForm.totalDays,
                    holidays,
                    existingRequests: empLeaveRequests,
                    employeeCode: formData.code,
                    isProbation: isEmpProbation,
                    availableBalance: empLeaveAllocation ? Math.max(0, (empLeaveAllocation.casualAllocated ?? 0) - (empLeaveAllocation.casualUsed ?? 0)) : undefined,
                  });

                  if (!clValidation.valid) {
                    setProfileLeaveError(clValidation.error || 'Casual Leave request violates policy rules.');
                    return;
                  }
                }

                if (profileLeaveForm.leaveType === 'Annual Leave') {
                  const alValidation = validateAnnualLeaveRules({
                    startDate: profileLeaveForm.fromDate,
                    endDate: profileLeaveForm.toDate,
                    totalCalculatedDays: profileLeaveForm.totalDays,
                    workingDaysCount: profileAnnualCalcInfo?.workingDaysCount ?? 0,
                    holidays,
                    existingRequests: empLeaveRequests,
                    employeeCode: formData.code,
                    isProbation: isEmpProbation,
                    sixMonthsCompletionStatus: formData.sixMonthsCompletionStatus,
                    joiningDate: formData.joiningDate,
                    employeeStatus: formData.status,
                    availableBalance: empLeaveAllocation ? Math.max(0, (empLeaveAllocation.annualAllocated ?? 0) - (empLeaveAllocation.annualUsed ?? 0)) : undefined,
                  });

                  if (!alValidation.valid) {
                    setProfileLeaveError(alValidation.error || 'Annual Leave request violates policy rules.');
                    return;
                  }
                }

                if (profileLeaveForm.leaveType === 'Medical Leave' && isEmpProbation) {
                  const medicalUsed = empLeaveAllocation?.medicalUsed || 0;
                  const maxAllowed = Math.max(0, 3 - medicalUsed);
                  if (profileLeaveForm.totalDays > maxAllowed) {
                    setProfileLeaveError(
                      `Probation Policy Limit: Employees on probation cannot avail more than 3 Medical Leave days in total (Remaining eligible: ${maxAllowed} day(s)).`
                    );
                    return;
                  }
                }

                // Check available balance
                if (empLeaveAllocation) {
                  let availableQuota = 0;
                  const effectiveMedical = isEmpProbation
                    ? Math.min(3, empLeaveAllocation.medicalAllocated ?? 3)
                    : (empLeaveAllocation.medicalAllocated ?? 10);

                  switch (profileLeaveForm.leaveType) {
                    case 'Casual Leave':
                      availableQuota = Math.max(0, (empLeaveAllocation.casualAllocated ?? 0) - (empLeaveAllocation.casualUsed ?? 0));
                      break;
                    case 'Medical Leave':
                      availableQuota = Math.max(0, effectiveMedical - (empLeaveAllocation.medicalUsed ?? 0));
                      break;
                    case 'Emergency Leave':
                      availableQuota = Math.max(0, (empLeaveAllocation.emergencyAllocated ?? 0) - (empLeaveAllocation.emergencyUsed ?? 0));
                      break;
                    case 'Annual Leave':
                      availableQuota = Math.max(0, (empLeaveAllocation.annualAllocated ?? 0) - (empLeaveAllocation.annualUsed ?? 0));
                      break;
                    case 'Maternity Leave':
                      availableQuota = Math.max(0, (empLeaveAllocation.maternityAllocated ?? 0) - (empLeaveAllocation.maternityUsed ?? 0));
                      break;
                    case 'Paternity Leave':
                      availableQuota = Math.max(0, (empLeaveAllocation.paternityAllocated ?? 0) - (empLeaveAllocation.paternityUsed ?? 0));
                      break;
                    case 'Compensatory Leave':
                      availableQuota = Math.max(0, (empLeaveAllocation.compOffAllocated ?? 0) - (empLeaveAllocation.compOffUsed ?? 0));
                      break;
                    case 'Bereavement Leave':
                      availableQuota = Math.max(0, 5 - (empLeaveAllocation.bereavementUsed ?? 0));
                      break;
                    default:
                      availableQuota = 0;
                  }

                  if (profileLeaveForm.totalDays > availableQuota) {
                    setProfileLeaveError(
                      `Insufficient Balance: Requested ${profileLeaveForm.totalDays} day(s) exceeds available ${profileLeaveForm.leaveType} balance of ${availableQuota} day(s).`
                    );
                    return;
                  }
                }

                // Mandatory document for Medical Leave > 3 consecutive days
                if (profileLeaveForm.leaveType === 'Medical Leave' && profileLeaveForm.totalDays > 3) {
                  if (!profileLeaveForm.attachmentName) {
                    setProfileLeaveError(
                      'Policy Requirement: Medical certificate or prescription document upload is mandatory for Medical Leave exceeding 3 consecutive days.'
                    );
                    return;
                  }
                }

                const supervisorName = formData.supervisor || (formData as any)?.manager || "Nasif Kamal";

                const newReq: LeaveRequestItem = {
                  id: `lv-${Date.now()}`,
                  employeeCode: formData.code,
                  employeeName: formData.name,
                  department: formData.department,
                  designation: formData.designation,
                  leaveType: profileLeaveForm.leaveType,
                  fromDate: profileLeaveForm.fromDate,
                  toDate: profileLeaveForm.toDate,
                  totalDays: profileLeaveForm.totalDays,
                  halfDayType: profileLeaveForm.halfDayType,
                  reason: profileLeaveForm.reason,
                  pregnancyConfirmationDate: profileLeaveForm.pregnancyConfirmationDate,
                  expectedDeliveryDate: profileLeaveForm.expectedDeliveryDate,
                  intendedMaternityStartDate: profileLeaveForm.intendedMaternityStartDate,
                  bereavementRelationship: profileLeaveForm.bereavementRelationship as BereavementRelationship,
                  attachmentName: profileLeaveForm.attachmentName || '',
                  attachmentUrl: profileLeaveForm.attachmentUrl || '',
                  supervisorName: supervisorName,
                  status: 'Pending',
                  appliedAt: new Date().toISOString(),
                };

                const updatedReqs = [newReq, ...empLeaveRequests];
                setEmpLeaveRequests(updatedReqs);
                setShowProfileLeaveModal(false);
                await saveLeaveRequest(newReq);
                setSaveToast({ message: 'Leave application submitted successfully', type: 'success' });
                setTimeout(() => setSaveToast(null), 3500);
              }}
              className="space-y-4 text-xs"
            >
              {/* Category */}
              {(() => {
                const empGender = (formData.gender || empLeaveAllocation?.gender || '').toUpperCase().trim();
                const isMale = empGender === 'MALE' || empGender === 'M';
                const isFemale = empGender === 'FEMALE' || empGender === 'F';
                const plAlloc = empLeaveAllocation ? (empLeaveAllocation.paternityAllocated ?? 0) : 0;
                const matAlloc = empLeaveAllocation ? (empLeaveAllocation.maternityAllocated ?? 0) : 0;

                return (
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Leave Category <span className="text-amber-500">*</span>
                    </label>
                    <select
                      value={profileLeaveForm.leaveType}
                      onChange={(e) => {
                        const newType = e.target.value as LeaveType;
                        const eligibility = validateLeaveGenderEligibility(empGender, newType);
                        if (!eligibility.valid) {
                          setPolicyErrorModal({
                            isOpen: true,
                            title: eligibility.title || 'Leave Policy Ineligibility',
                            reason: eligibility.reason || 'This leave type is not allowed for this employee gender.',
                          });
                          return;
                        }

                        const d1 = new Date(profileLeaveForm.fromDate);
                        const d2 = new Date(profileLeaveForm.toDate);
                        let diffDays = 1;
                        if (newType === 'Maternity Leave') diffDays = 120;
                        else if (newType === 'Casual Leave') {
                          diffDays = calculateCasualLeaveDuration(
                            profileLeaveForm.fromDate,
                            profileLeaveForm.toDate,
                            profileLeaveForm.halfDayType === 'Full Day' ? 'FULL' : 'HALF',
                            holidays
                          ).totalDays;
                        } else if (newType === 'Annual Leave') {
                          diffDays = calculateAnnualLeaveDuration(
                            profileLeaveForm.fromDate,
                            profileLeaveForm.toDate,
                            holidays
                          ).totalDays;
                        } else if (profileLeaveForm.halfDayType !== 'Full Day') diffDays = 0.5;
                        else if (!isNaN(d1.getTime()) && !isNaN(d2.getTime()) && d2 >= d1) {
                          diffDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24)) + 1;
                        }
                        setProfileLeaveForm({
                          ...profileLeaveForm,
                          leaveType: newType,
                          totalDays: diffDays > 0 ? diffDays : 1,
                        });
                      }}
                      className="w-full h-10 px-3 rounded-xl bg-surface border border-border font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-sm"
                    >
                      <option value="Casual Leave">Casual Leave (CL)</option>
                      <option value="Medical Leave">Medical Leave (ML)</option>
                      <option value="Emergency Leave">Emergency Leave (EL)</option>
                      <option value="Annual Leave">Annual Leave (AL)</option>
                      {(!isFemale || (!isMale && !isFemale && plAlloc > 0)) && (
                        <option value="Paternity Leave">Paternity Leave (15 Days)</option>
                      )}
                      {(!isMale || (!isMale && !isFemale && matAlloc > 0)) && (
                        <option value="Maternity Leave">Maternity Leave (120 Days)</option>
                      )}
                      <option value="Bereavement Leave">Bereavement Leave</option>
                    </select>
                  </div>
                );
              })()}

              {/* Leave Duration & Period Dropdowns */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Leave Duration
                  </label>
                  {(profileLeaveForm.leaveType === 'Casual Leave' ||
                    profileLeaveForm.leaveType === 'Medical Leave' ||
                    profileLeaveForm.leaveType === 'Emergency Leave' ||
                    profileLeaveForm.leaveType === 'Compensatory Leave') ? (
                    <select
                      value={profileLeaveForm.halfDayType === 'Full Day' ? 'FULL' : 'HALF'}
                      onChange={(e) => {
                        const isHalf = e.target.value === 'HALF';
                        const nextMode = isHalf ? 'First Half' : 'Full Day';
                        let nextDays = isHalf ? 0.5 : 1;
                        if (profileLeaveForm.leaveType === 'Casual Leave') {
                          nextDays = calculateCasualLeaveDuration(
                            profileLeaveForm.fromDate,
                            profileLeaveForm.toDate,
                            isHalf ? 'HALF' : 'FULL',
                            holidays
                          ).totalDays;
                        } else if (profileLeaveForm.leaveType === 'Annual Leave') {
                          nextDays = calculateAnnualLeaveDuration(
                            profileLeaveForm.fromDate,
                            profileLeaveForm.toDate,
                            holidays
                          ).totalDays;
                        } else if (!isHalf) {
                          const d1 = new Date(profileLeaveForm.fromDate);
                          const d2 = new Date(profileLeaveForm.toDate);
                          if (!isNaN(d1.getTime()) && !isNaN(d2.getTime()) && d2 >= d1) {
                            nextDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24)) + 1;
                          }
                        }
                        setProfileLeaveForm({
                          ...profileLeaveForm,
                          halfDayType: nextMode,
                          totalDays: nextDays > 0 ? nextDays : 1,
                        });
                      }}
                      className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-sm"
                    >
                      <option value="HALF">HALF</option>
                      <option value="FULL">FULL</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      disabled
                      value="FULL"
                      className="w-full h-10 px-3 rounded-xl bg-surface/50 border border-border text-xs font-semibold text-muted-foreground cursor-not-allowed shadow-sm"
                    />
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Period (First Half / Second Half)
                  </label>
                  {(profileLeaveForm.leaveType === 'Casual Leave' ||
                    profileLeaveForm.leaveType === 'Medical Leave' ||
                    profileLeaveForm.leaveType === 'Emergency Leave' ||
                    profileLeaveForm.leaveType === 'Compensatory Leave') &&
                  profileLeaveForm.halfDayType !== 'Full Day' ? (
                    <select
                      value={profileLeaveForm.halfDayType}
                      onChange={(e) => {
                        setProfileLeaveForm({
                          ...profileLeaveForm,
                          halfDayType: e.target.value as HalfDayType,
                        });
                      }}
                      className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-sm"
                    >
                      <option value="First Half">First Half</option>
                      <option value="Second Half">Second Half</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      disabled
                      value="Full Day"
                      className="w-full h-10 px-3 rounded-xl bg-surface/50 border border-border text-xs font-semibold text-muted-foreground cursor-not-allowed shadow-sm"
                    />
                  )}
                </div>
              </div>

              {/* Date Ranges */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    From Date
                  </label>
                  <input
                    type="date"
                    required
                    value={profileLeaveForm.fromDate}
                    onChange={(e) => {
                      const fromVal = e.target.value;
                      let toVal = profileLeaveForm.toDate;
                      if (profileLeaveForm.halfDayType !== 'Full Day' || fromVal > toVal) {
                        toVal = fromVal;
                      }
                      let diffDays = 1;
                      if (profileLeaveForm.leaveType === 'Casual Leave') {
                        diffDays = calculateCasualLeaveDuration(
                          fromVal,
                          toVal,
                          profileLeaveForm.halfDayType === 'Full Day' ? 'FULL' : 'HALF',
                          holidays
                        ).totalDays;
                      } else if (profileLeaveForm.leaveType === 'Annual Leave') {
                        diffDays = calculateAnnualLeaveDuration(
                          fromVal,
                          toVal,
                          holidays
                        ).totalDays;
                      } else if (profileLeaveForm.halfDayType !== 'Full Day') {
                        diffDays = 0.5;
                      } else {
                        const d1 = new Date(fromVal);
                        const d2 = new Date(toVal);
                        if (!isNaN(d1.getTime()) && !isNaN(d2.getTime()) && d2 >= d1) {
                          diffDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24)) + 1;
                        }
                      }
                      setProfileLeaveForm({
                        ...profileLeaveForm,
                        fromDate: fromVal,
                        toDate: toVal,
                        totalDays: diffDays > 0 ? diffDays : 1,
                      });
                    }}
                    className="w-full h-10 px-3 rounded-xl bg-surface border border-border font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    To Date
                  </label>
                  <input
                    type="date"
                    required
                    disabled={profileLeaveForm.leaveType === 'Maternity Leave' || profileLeaveForm.halfDayType !== 'Full Day'}
                    value={
                      profileLeaveForm.halfDayType !== 'Full Day'
                        ? profileLeaveForm.fromDate
                        : profileLeaveForm.toDate
                    }
                    onChange={(e) => {
                      const toVal = e.target.value;
                      let diffDays = 1;
                      if (profileLeaveForm.leaveType === 'Casual Leave') {
                        diffDays = calculateCasualLeaveDuration(
                          profileLeaveForm.fromDate,
                          toVal,
                          profileLeaveForm.halfDayType === 'Full Day' ? 'FULL' : 'HALF',
                          holidays
                        ).totalDays;
                      } else if (profileLeaveForm.leaveType === 'Annual Leave') {
                        diffDays = calculateAnnualLeaveDuration(
                          profileLeaveForm.fromDate,
                          toVal,
                          holidays
                        ).totalDays;
                      } else if (profileLeaveForm.halfDayType !== 'Full Day') {
                        diffDays = 0.5;
                      } else {
                        const d1 = new Date(profileLeaveForm.fromDate);
                        const d2 = new Date(toVal);
                        if (!isNaN(d1.getTime()) && !isNaN(d2.getTime()) && d2 >= d1) {
                          diffDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24)) + 1;
                        }
                      }
                      setProfileLeaveForm({
                        ...profileLeaveForm,
                        toDate: toVal,
                        totalDays: diffDays > 0 ? diffDays : 1,
                      });
                    }}
                    className="w-full h-10 px-3 rounded-xl bg-surface border border-border font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Casual Leave Holiday Breakdown Details */}
              {profileLeaveForm.leaveType === 'Casual Leave' && profileCasualCalcInfo && (
                <div className="flex flex-wrap gap-2 text-[11px] pt-1">
                  {profileCasualCalcInfo.sandwichedHolidaysCount > 0 && (
                    <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-500 font-bold">
                      Includes {profileCasualCalcInfo.sandwichedHolidaysCount} sandwiched public holiday ({profileCasualCalcInfo.sandwichedHolidayNames.join(', ')})
                    </span>
                  )}
                  {profileCasualCalcInfo.boundaryHolidaysCount > 0 && (
                    <span className="px-2.5 py-1 rounded-xl bg-surface border border-border/70 text-muted-foreground">
                      {profileCasualCalcInfo.boundaryHolidaysCount} boundary public holiday(s) excluded
                    </span>
                  )}
                </div>
              )}

              {/* Annual Leave Calculation Breakdown Details */}
              {profileLeaveForm.leaveType === 'Annual Leave' && profileAnnualCalcInfo && (
                <div className="flex flex-wrap gap-2 text-[11px] pt-1">
                  <span
                    className={`px-2.5 py-1 rounded-xl border font-bold ${
                      profileAnnualCalcInfo.workingDaysCount >= 5
                        ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-500'
                        : 'bg-amber-500/15 border-amber-500/35 text-amber-500'
                    }`}
                  >
                    {profileAnnualCalcInfo.workingDaysCount} working day{profileAnnualCalcInfo.workingDaysCount === 1 ? '' : 's'} applied (Min. 5 required)
                  </span>
                  {profileAnnualCalcInfo.internalWeekendDaysCount > 0 && (
                    <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-500 font-bold">
                      Includes {profileAnnualCalcInfo.internalWeekendDaysCount} internal weekend day(s)
                    </span>
                  )}
                  {profileAnnualCalcInfo.internalHolidaysCount > 0 && (
                    <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-500 font-bold">
                      Includes {profileAnnualCalcInfo.internalHolidaysCount} internal public holiday ({profileAnnualCalcInfo.internalHolidayNames.join(', ')})
                    </span>
                  )}
                  {(profileAnnualCalcInfo.leadingBoundaryDaysExcluded > 0 || profileAnnualCalcInfo.trailingBoundaryDaysExcluded > 0) && (
                    <span className="px-2.5 py-1 rounded-xl bg-surface border border-border/70 text-muted-foreground">
                      {profileAnnualCalcInfo.leadingBoundaryDaysExcluded + profileAnnualCalcInfo.trailingBoundaryDaysExcluded} boundary weekend/holiday day(s) excluded
                    </span>
                  )}
                </div>
              )}

              {/* Bereavement Dropdown */}
              {profileLeaveForm.leaveType === 'Bereavement Leave' && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Immediate Family Relationship <span className="text-amber-500">*</span>
                  </label>
                  <select
                    value={profileLeaveForm.bereavementRelationship}
                    onChange={(e) =>
                      setProfileLeaveForm({
                        ...profileLeaveForm,
                        bereavementRelationship: e.target.value as BereavementRelationship,
                      })
                    }
                    className="w-full h-10 px-3 rounded-xl bg-surface border border-border font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-sm"
                  >
                    <option value="">Select Relationship</option>
                    {BEREAVEMENT_RELATIONSHIPS.map((rel) => (
                      <option key={rel} value={rel}>
                        {rel}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Reason */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Reason for Leave <span className="text-amber-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={profileLeaveForm.reason}
                  onChange={(e) => setProfileLeaveForm({ ...profileLeaveForm, reason: e.target.value })}
                  placeholder="Detail the purpose of leave and handover arrangements..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm resize-none"
                />
              </div>

              {/* Supporting Document Upload */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Supporting Document{' '}
                  {profileLeaveForm.leaveType === 'Medical Leave' && profileLeaveForm.totalDays > 3 ? (
                    <span className="text-amber-500 font-bold">(Required *)</span>
                  ) : profileLeaveForm.totalDays >= 3 ? (
                    <span className="text-muted-foreground font-semibold">(Recommended)</span>
                  ) : (
                    <span className="text-muted-foreground/80 font-normal">(Optional)</span>
                  )}
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="file"
                    id="profile-leave-doc"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 10 * 1024 * 1024) {
                          setProfileLeaveError('Document size exceeds 10 MB.');
                          return;
                        }
                        setProfileLeaveError(null);
                        let finalUrl = '';
                        try {
                          const formDataUpload = new FormData();
                          formDataUpload.append('file', file);
                          formDataUpload.append('employeeCode', formData.code || 'emp');
                          formDataUpload.append('fileName', file.name);
                          const res = await fetch('/api/v1/leaves/attachments', {
                            method: 'POST',
                            body: formDataUpload,
                          });
                          const data = await res.json();
                          if (data.success && data.url) {
                            finalUrl = data.url;
                          }
                        } catch {}
                        setProfileLeaveForm((prev) => ({
                          ...prev,
                          attachmentName: file.name,
                          attachmentUrl: finalUrl,
                        }));
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById('profile-leave-doc')?.click()}
                    className="w-full h-10 px-3.5 rounded-xl bg-surface border border-border hover:border-amber-500 text-xs font-semibold text-foreground transition shadow-sm cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <Paperclip className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                      <span className="truncate text-muted-foreground">
                        {profileLeaveForm.attachmentName || 'Attach medical certificate / prescription...'}
                      </span>
                    </div>
                    <Upload className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  </button>
                </div>
              </div>

              {/* ── QUICK LEAVE POLICY BANNER ── */}
              {(() => {
                const pol = QUICK_LEAVE_POLICIES[profileLeaveForm.leaveType] || QUICK_LEAVE_POLICIES['Casual Leave'];
                return (
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-1.5">
                    <div className="flex items-center space-x-1.5 text-amber-500 font-bold uppercase text-[10px]">
                      <div className="h-4 w-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[9px] font-bold">
                        i
                      </div>
                      <span>{pol.title}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-muted-foreground font-medium pl-1">
                      {pol.points.map((pt, i) => (
                        <div key={i} className="flex items-start space-x-1.5">
                          <span className="text-amber-500 font-bold">&bull;</span>
                          <span>{pt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {profileLeaveError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-semibold">
                  {profileLeaveError}
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-border/70">
                <button
                  type="button"
                  onClick={() => setShowProfileLeaveModal(false)}
                  className="px-4 py-2 rounded-xl bg-surface hover:bg-surface/80 text-muted-foreground text-xs font-bold transition cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black uppercase tracking-wider transition shadow-md cursor-pointer"
                >
                  SUBMIT LEAVE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ATTENDANCE REGULARIZATION MODAL ── */}
      {profileRegModal && profileRegModal.isOpen && profileRegModal.log && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card border border-amber-500/30 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 space-y-4 p-5 sm:p-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border/70">
              <div className="flex items-center space-x-2.5">
                <div className="h-9 w-9 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center shadow-xs">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-foreground">Attendance Regularization</h3>
                  <p className="text-[11px] text-muted-foreground">Shift-based auto correction &amp; supervisor approval</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProfileRegModal(null)}
                className="p-1.5 rounded-xl hover:bg-surface text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Date & Shift Info Badge */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-surface/70 border border-border text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Date</span>
                <span className="font-mono font-bold text-foreground">{formatDisplayDate(profileRegModal.log.date)}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Assigned Shift</span>
                <span className="font-bold text-amber-500">{formData.workingSchedule}</span>
              </div>
            </div>

            {/* 2-Column Comparison Table */}
            <div className="rounded-2xl border border-border/80 overflow-hidden bg-card/60">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-surface/80 border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="py-2.5 px-3">Metric</th>
                    <th className="py-2.5 px-3">Original Record</th>
                    <th className="py-2.5 px-3 text-amber-500">Adjusted (Editable)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-mono">
                  {/* Row 1: Check In */}
                  <tr>
                    <td className="py-2.5 px-3 text-muted-foreground font-sans font-bold">Check In</td>
                    <td className="py-2.5 px-3 text-rose-500 font-bold">
                      {profileRegModal.log.checkInTime || '--:--'}
                      {profileRegModal.log.lateByMin ? ` (+${profileRegModal.log.lateByMin}m)` : ''}
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={profileRegModal.adjustedCheckIn}
                        onChange={(e) =>
                          setProfileRegModal((prev) => (prev ? { ...prev, adjustedCheckIn: e.target.value } : null))
                        }
                        className="w-28 px-2.5 py-1 rounded-lg bg-surface border border-amber-500/40 text-xs font-bold text-emerald-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        placeholder="10:00 AM"
                      />
                    </td>
                  </tr>

                  {/* Row 2: Check Out */}
                  <tr>
                    <td className="py-2.5 px-3 text-muted-foreground font-sans font-bold">Check Out</td>
                    <td className="py-2.5 px-3 text-muted-foreground">
                      {profileRegModal.log.checkOutTime || (profileRegModal.log.status === 'Auto Check Out' ? 'Auto 11:30 PM' : '--:--')}
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={profileRegModal.adjustedCheckOut}
                        onChange={(e) =>
                          setProfileRegModal((prev) => (prev ? { ...prev, adjustedCheckOut: e.target.value } : null))
                        }
                        className="w-28 px-2.5 py-1 rounded-lg bg-surface border border-amber-500/40 text-xs font-bold text-emerald-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        placeholder="06:00 PM"
                      />
                    </td>
                  </tr>

                  {/* Row 3: Status */}
                  <tr>
                    <td className="py-2.5 px-3 text-muted-foreground font-sans font-bold">Status</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500">
                        {profileRegModal.log.status || 'Late'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-sans font-bold text-emerald-500">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-500">
                        Present (Target)
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <form onSubmit={handleSubmitProfileRegularization} className="space-y-3.5 pt-1">
              {/* Reason Dropdown */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Primary Reason <span className="text-amber-500">*</span>
                </label>
                <select
                  value={profileRegModal.reason}
                  onChange={(e) =>
                    setProfileRegModal((prev) => (prev ? { ...prev, reason: e.target.value } : null))
                  }
                  required
                  className="w-full h-9 px-3 rounded-xl bg-surface border border-border text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                >
                  <option value="Late Entry Due to Official Field Work / Traffic">Late Entry Due to Official Field Work / Traffic</option>
                  <option value="Biometric Device Sync / Network Failure">Biometric Device Sync / Network Failure</option>
                  <option value="Approved Outside Duty / Offsite Meeting">Approved Outside Duty / Offsite Meeting</option>
                  <option value="Forgot to Punch Out Before Leaving">Forgot to Punch Out Before Leaving</option>
                  <option value="System Glitch or RFID Reader Latency">System Glitch or RFID Reader Latency</option>
                  <option value="Emergency Personal or Health Delay">Emergency Personal or Health Delay</option>
                  <option value="Other Legitimate Reason">Other Legitimate Reason</option>
                </select>
              </div>

              {/* Justification Notes */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Detailed Justification / Explanation (Optional)
                </label>
                <textarea
                  rows={2}
                  value={profileRegModal.notes}
                  onChange={(e) =>
                    setProfileRegModal((prev) => (prev ? { ...prev, notes: e.target.value } : null))
                  }
                  placeholder="Provide context for your supervisor..."
                  className="w-full p-2.5 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                />
              </div>

              {/* Dynamic Line Manager / Supervisor Notice */}
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-foreground/80 space-y-1">
                <div className="flex items-center justify-between font-semibold">
                  <span className="text-blue-500">Approving Supervisor:</span>
                  <span className="font-bold text-foreground">{formData.supervisor || 'S M Nayeem Rahman'}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Regularization request will be routed directly to your designated supervisor for authorization.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-border/70">
                <button
                  type="button"
                  onClick={() => setProfileRegModal(null)}
                  className="px-4 py-2 rounded-xl bg-surface hover:bg-surface/80 text-muted-foreground text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={profileRegModal.isSubmitting}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-sm cursor-pointer disabled:opacity-50 inline-flex items-center space-x-1.5"
                >
                  <span>{profileRegModal.isSubmitting ? 'Submitting...' : 'Submit Request'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 5. CONTRACT MODALS INTEGRATION ── */}
      {/* Contract Document View / PDF Modal */}
      {selectedContractForDoc && (
        <ContractDocumentModal
          isOpen={Boolean(selectedContractForDoc)}
          onClose={() => setSelectedContractForDoc(null)}
          contract={selectedContractForDoc}
          employeeProfile={formData}
        />
      )}

      {/* New / Amend Contract Modal */}
      {isNewContractModalOpen && (
        <NewContractModal
          isOpen={isNewContractModalOpen}
          onClose={() => {
            setIsNewContractModalOpen(false);
            setContractToAmend(null);
          }}
          onSaveContract={handleSaveContract}
          employees={allFullEmployees}
          existingContractToAmend={contractToAmend}
          initialEmployeeId={formData.id || formData.code}
        />
      )}

      {/* ── POLICY INELIGIBILITY POPUP MODAL ── */}
      {policyErrorModal?.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-card border border-rose-500/30 shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start space-x-3.5">
              <div className="h-12 w-12 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <h3 className="text-base font-bold text-foreground tracking-tight">
                  {policyErrorModal.title}
                </h3>
                <p className="text-xs font-medium text-rose-400">
                  JAAGO HR Leave Policy Restriction
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-foreground/90 leading-relaxed font-medium">
              {policyErrorModal.reason}
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={() => setPolicyErrorModal(null)}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider transition shadow-md shadow-amber-500/25 cursor-pointer active:scale-95"
              >
                Understood &bull; Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
