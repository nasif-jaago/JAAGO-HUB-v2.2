'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
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
} from 'lucide-react';
import { uploadEmployeePhoto } from '@/lib/supabase-storage';
import { AvatarCropModal } from './avatar-crop-modal';

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

  // ── Tab 4: DSP (Digital School Program) ──
  officeDays: string;
  customOfficeDaysFrom?: string | undefined;
  customOfficeDaysTo?: string | undefined;
  officeHours: string;
  rfid: string;
  leaveGroup: string;
  employeeType: 'Permanent' | 'Contractual' | 'Volunteer' | 'Intern' | 'Consultant';

  // ── Tab 5: Log History ──
  logHistory: LogHistoryEntry[];

  // User provisioning
  isUser?: boolean | undefined;
  userId?: string | undefined;
}

interface EmployeeProfileDetailProps {
  initialData?: FullEmployeeProfile | null | undefined;
  allEmployees: { id: string; name: string; code: string; designation: string; department: string; avatarUrl?: string | undefined }[];
  currentUser?: { fullName: string; jobTitle: string } | undefined;
  onSave: (updatedProfile: FullEmployeeProfile) => void;
  onBack: () => void;
  onCreateUser?: ((employee: FullEmployeeProfile) => void) | undefined;
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
  onSave,
  onBack,
  onCreateUser,
}: EmployeeProfileDetailProps) {
  const isNew = !initialData?.id;

  // Active Tab state: 'WORK' | 'PERSONAL' | 'PAYROLL' | 'DSP' | 'LOG_HISTORY'
  const [activeTab, setActiveTab] = useState<'WORK' | 'PERSONAL' | 'PAYROLL' | 'DSP' | 'LOG_HISTORY'>('WORK');

  // Form State
  const [formData, setFormData] = useState<FullEmployeeProfile>(() => {
    if (initialData) {
      return {
        ...initialData,
        logHistory: initialData.logHistory || [],
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
      workingSchedule: 'General Schedule (10:00 AM - 6:00 PM)',

      // Work
      organization: 'JAAGO Foundation Trust',
      branch: 'Head Office (Banani)',
      department: 'Program Implementation',
      project: 'General Operations',
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
    };
  });

  // Track original for diff logging
  const originalStateRef = useRef<FullEmployeeProfile>(formData);

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

  // Custom Office Days state
  const [officeDaysOptions, setOfficeDaysOptions] = useState<string[]>([...DEFAULT_OFFICE_DAYS]);
  const [isCustomDays, setIsCustomDays] = useState(false);
  const [customDaysFrom, setCustomDaysFrom] = useState('Saturday');
  const [customDaysTo, setCustomDaysTo] = useState('Wednesday');

  // Notification / Save feedback
  const [saveToast, setSaveToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

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
              <span>People and Culture</span>
              <span>/</span>
              <span className="hover:text-foreground cursor-pointer" onClick={onBack}>
                Employees
              </span>
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
                placeholder="e.g. Masoor Rahman"
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
                  Designation
                </label>
                <input
                  type="text"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  placeholder="e.g. Program Officer"
                  className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                />
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

              {/* Working Schedule */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Working Schedule
                </label>
                <input
                  type="text"
                  value={formData.workingSchedule}
                  onChange={(e) => setFormData({ ...formData, workingSchedule: e.target.value })}
                  placeholder="General Schedule (10:00 AM - 6:00 PM)"
                  className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                />
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
          { key: 'DSP', label: 'DSP', icon: Sparkles },
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
                    <option value="JAAGO Foundation">JAAGO Foundation</option>
                    <option value="JAAGO Foundation Trust">JAAGO Foundation Trust</option>
                    <option value="EMK Center">EMK Center</option>
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
                    <option value="Head Office (Banani)">Head Office (Banani)</option>
                    <option value="Rayer Bazar Free School">Rayer Bazar Free School</option>
                    <option value="Chittagong Campus">Chittagong Campus</option>
                    <option value="Cox's Bazar Branch">Cox&apos;s Bazar Branch</option>
                    <option value="Rajshahi Campus">Rajshahi Campus</option>
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
                    <option value="Program Implementation">Program Implementation</option>
                    <option value="Digital School Program">Digital School Program</option>
                    <option value="Communications">Communications</option>
                    <option value="Executive Office">Executive Office</option>
                    <option value="Finance & Accounts">Finance &amp; Accounts</option>
                    <option value="People and Culture">People and Culture</option>
                    <option value="EMK Center">EMK Center</option>
                  </select>
                </div>

                {/* Project */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    Project
                  </label>
                  <input
                    type="text"
                    value={formData.project}
                    onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                    placeholder="e.g. Telco Digital School"
                    className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                  />
                </div>

                {/* Supervisor (Interactive Autocomplete Search >= 3 chars) */}
                <div className="space-y-1 relative">
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
                <div className="space-y-1 relative">
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
                      placeholder="e.g. Masoor"
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
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
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
            TAB 4: DSP (DIGITAL SCHOOL PROGRAM)
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
            TAB 5: LOG HISTORY (ODOO-STYLE WORKING HISTORY TRACKER)
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

      {/* ── 5. BOTTOM FLOATING SAVE BAR ── */}
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
    </div>
  );
}
