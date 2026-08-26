'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Lock,
  Camera,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import { DashboardSubNav } from '@/components/dashboard-sub-nav';
import {
  getActiveEmployeeProfile,
  updateEmployeeProfileDetails,
} from '@/lib/user-profile-sync';
import type { FullEmployeeProfile } from '@/lib/supabase-employees';
import { uploadEmployeePhoto } from '@/lib/supabase-storage';
import { getSupabase } from '@/lib/supabase-auth';

const INITIAL_FALLBACK_PROFILE: FullEmployeeProfile = {
  id: 'emp-default',
  name: 'Nasif Kamal',
  code: 'FO032507061190',
  avatarUrl: '',
  designation: 'Coordinator, Tech 4 Development',
  workEmail: 'nasif.kamal@jaago.com.bd',
  workMobile: '+880 1711 000001',
  status: 'Active',
  workingSchedule: 'General Schedule (10:00 AM - 6:00 PM)',
  organization: 'JAAGO Foundation Trust',
  branch: 'Head Office (Banani)',
  department: "Founder's Office / FC",
  project: 'Tech 4 Development',
  supervisor: 'Founder & Executive Director',
  secondarySupervisor: 'Habibur Rahman',
  workLocation: 'Banani, Dhaka',
  remark: 'Lead Developer & System Administrator',

  // Personal Info
  personalEmail: 'nasif.personal@gmail.com',
  personalPhone: '+880 1811 000001',
  bankName: 'Eastern Bank Ltd',
  bankAccountNumber: '1041234567800',
  nickName: 'Sumit',
  nid: '1996269123456789',
  bloodGroup: 'B+',
  birthday: '1996-05-15',
  gender: 'MALE',
  religion: 'Islam',
  maritalStatus: 'Single',
  emergencyContactName: 'Kamal Hossain (Father)',
  emergencyPhone: '+880 1811 999000',
  nationality: 'Bangladeshi',
  passportNo: 'A09876543',
  homeAddress: 'Road 11, Banani, Dhaka-1213',
  dependentChildren: 0,

  // Payroll
  joiningDate: '2026-08-24',
  contractEndDate: '2028-12-31',
  wageType: 'Fixed',
  wage: 150000,
  salaryJulDec: 150000,
  salaryJanJun: 150000,
  monthlyTotalAllowance: 'Yes',
  sixMonthsCompletionStatus: 'Yes',
  probationaryStatus: 'Confirmed',
  contractType: 'Full Time',
  noTaxDeduction: false,
  bonusEligibility: 'Yes',
  pfApplies: 'Yes',
  pfRate: 10,
  regularSalary: 150000,
  extraHours: 0,
  extraPayment: 0,
  calculationValue: '1.0x',
  temporarySalary: 0,
  totalCurrentSalary: 150000,
  currency: 'BDT',
  adjustmentStartDate: '',
  adjustmentEndDate: '',
  assignedTeacherStaff: '',
  payrollRemark: '',

  // DSP
  officeDays: 'Sunday to Thursday',
  officeHours: '10:00 AM - 06:00 PM',
  rfid: 'RFID-100290',
  leaveGroup: 'Standard Full-time',
  employeeType: 'Permanent',
  isUser: true,
  logHistory: [],
};

export default function MyProfilePage() {
  const [activeTab, setActiveTab] = useState<'personal' | 'password'>('personal');
  const [profile, setProfile] = useState<FullEmployeeProfile>(INITIAL_FALLBACK_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load employee profile from Supabase
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const activeEmp = await getActiveEmployeeProfile();
      if (activeEmp) {
        setProfile(activeEmp);
      }
      setLoading(false);
    }
    loadData();

    const handleUserUpdated = (e: any) => {
      if (e.detail?.employee) {
        setProfile(e.detail.employee);
      }
    };
    window.addEventListener('jaago_user_updated', handleUserUpdated);

    return () => {
      window.removeEventListener('jaago_user_updated', handleUserUpdated);
    };
  }, []);

  const handleFieldChange = (field: keyof FullEmployeeProfile, value: any) => {
    setProfile((prev: FullEmployeeProfile) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle Photo Upload
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await uploadEmployeePhoto(file, profile.code || 'user');
      if (res?.url) {
        const updated = { ...profile, avatarUrl: res.url };
        setProfile(updated);
        await updateEmployeeProfileDetails(updated);
        setSuccessMessage('Profile photo updated and synchronized successfully!');
      } else {
        throw new Error('Failed to upload profile photo');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error updating photo');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Personal Details Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await updateEmployeeProfileDetails(profile);
      if (res.success) {
        setSuccessMessage('Your profile information has been updated and synchronized with Employee Directory!');
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        setErrorMessage(res.error || 'Failed to update profile.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Unexpected error while saving.');
    } finally {
      setSaving(false);
    }
  };

  // Handle Password Update
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('New password and confirmation password do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      const supabase = getSupabase();
      
      // Update password via Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      setSuccessMessage('Password successfully updated! You can use your new password for your next login.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccessMessage(null), 6000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update password. Please check your credentials.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const initials = profile.name
    ? profile.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
    : 'NK';

  return (
    <div className="max-w-[1700px] mx-auto text-foreground pb-24 md:pb-28 select-none">
      {/* ── Sub Navigation Strip ── */}
      <DashboardSubNav activeTab="my-profile" />

      {/* Alert Notifications */}
      {loading ? (
        <div className="flex items-center justify-center p-12 text-muted-foreground space-x-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-sm font-semibold">Loading your employee profile...</span>
        </div>
      ) : (
        <>
          {successMessage && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center space-x-3 text-xs sm:text-sm font-bold shadow-sm animate-in fade-in">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-500" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="mb-6 p-4 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive flex items-center space-x-3 text-xs sm:text-sm font-bold shadow-sm animate-in fade-in">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ── Main Two-Column Layout (Matching Screenshots 3 & 4) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ═══════════════════════════════════════════════════════════ */}
        {/* ── LEFT COLUMN: TAB NAVIGATION & PROFILE CARD ──           */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-4">
          {/* Action Tabs Card */}
          <div className="bg-card border border-border/80 rounded-3xl p-4 shadow-md space-y-2">
            {/* Tab 1: PERSONAL INFO */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('personal');
                setSuccessMessage(null);
                setErrorMessage(null);
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                activeTab === 'personal'
                  ? 'bg-primary text-primary-foreground shadow-md ring-1 ring-primary/50'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface'
              }`}
            >
              <User className="h-4 w-4 flex-shrink-0" />
              <span>PERSONAL INFO</span>
            </button>

            {/* Tab 2: UPDATE PASSWORD */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('password');
                setSuccessMessage(null);
                setErrorMessage(null);
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                activeTab === 'password'
                  ? 'bg-primary text-primary-foreground shadow-md ring-1 ring-primary/50'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface'
              }`}
            >
              <Lock className="h-4 w-4 flex-shrink-0" />
              <span>UPDATE PASSWORD</span>
            </button>
          </div>

          {/* User Profile Mini Summary Card */}
          <div className="bg-card border border-border/80 rounded-3xl p-6 shadow-md flex flex-col items-center text-center space-y-4">
            {/* Avatar with Gold Border and Camera Badge Overlay */}
            <div className="relative group">
              <div className="h-32 w-32 rounded-3xl border-2 border-primary bg-primary/10 overflow-hidden flex items-center justify-center shadow-lg relative p-1">
                {uploadingPhoto ? (
                  <div className="h-full w-full flex flex-col items-center justify-center bg-black/40 text-white space-y-1">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="text-[10px] font-bold">Uploading...</span>
                  </div>
                ) : profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.name}
                    className="h-full w-full object-cover rounded-2xl"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-amber-400/20 via-primary/30 to-amber-600/30 rounded-2xl flex items-center justify-center text-primary font-black text-3xl">
                    {initials}
                  </div>
                )}
              </div>

              {/* Camera Upload Badge Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Change Profile Picture"
                disabled={uploadingPhoto}
                className="absolute -bottom-2 -right-2 h-9 w-9 rounded-2xl bg-primary text-primary-foreground shadow-xl border-2 border-card flex items-center justify-center hover:scale-110 active:scale-95 transition cursor-pointer"
              >
                <Camera className="h-4 w-4 stroke-[2.5]" />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handlePhotoSelect}
                className="hidden"
              />
            </div>

            {/* Profile Info Text */}
            <div className="space-y-1">
              <h2 className="text-lg font-black text-foreground tracking-tight">
                {profile.name}
              </h2>
              <p className="text-xs font-semibold text-muted-foreground">
                {profile.designation}
              </p>
              <div className="text-[11px] font-bold text-amber-500 pt-1">
                {profile.organization}
              </div>
              <div className="text-[10px] font-mono text-muted-foreground">
                ID: {profile.code}
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* ── RIGHT COLUMN: FORM PANELS ──                            */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-8 xl:col-span-9">
          {/* TAB 1: PERSONAL INFORMATION */}
          {activeTab === 'personal' && (
            <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-md space-y-8 animate-in fade-in duration-200">
              {/* Header Title */}
              <div className="flex items-center space-x-2.5 text-primary text-base sm:text-lg font-black uppercase tracking-wider border-b border-border/60 pb-4">
                <User className="h-5 w-5 flex-shrink-0" />
                <span>PERSONAL INFORMATION</span>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-6">
                {/* ── SECTION 1: PERSONAL DETAILS (MATCHING SCREENSHOT 3) ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Nickname */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Nickname</label>
                    <input
                      type="text"
                      value={profile.nickName || ''}
                      onChange={(e) => handleFieldChange('nickName', e.target.value)}
                      placeholder="e.g. Sumit / Nasif"
                      className="w-full px-4 py-3 rounded-2xl bg-surface border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                    />
                  </div>

                  {/* Gender */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Gender</label>
                    <select
                      value={profile.gender || 'MALE'}
                      onChange={(e) => handleFieldChange('gender', e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-surface border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm cursor-pointer"
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  {/* Marital Status */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Marital Status</label>
                    <select
                      value={profile.maritalStatus || 'Single'}
                      onChange={(e) => handleFieldChange('maritalStatus', e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-surface border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm cursor-pointer"
                    >
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Divorced">Divorced</option>
                      <option value="Widowed">Widowed</option>
                    </select>
                  </div>

                  {/* Date of Birth */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Date of Birth</label>
                    <div className="relative">
                      <input
                        type="date"
                        value={profile.birthday || ''}
                        onChange={(e) => handleFieldChange('birthday', e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl bg-surface border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Blood Group */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Blood Group</label>
                    <select
                      value={profile.bloodGroup || 'B+'}
                      onChange={(e) => handleFieldChange('bloodGroup', e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-surface border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm cursor-pointer"
                    >
                      <option value="A+">A Positive (A+)</option>
                      <option value="A-">A Negative (A-)</option>
                      <option value="B+">B Positive (B+)</option>
                      <option value="B-">B Negative (B-)</option>
                      <option value="O+">O Positive (O+)</option>
                      <option value="O-">O Negative (O-)</option>
                      <option value="AB+">AB Positive (AB+)</option>
                      <option value="AB-">AB Negative (AB-)</option>
                    </select>
                  </div>

                  {/* National ID */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">National ID</label>
                    <input
                      type="text"
                      value={profile.nid || ''}
                      onChange={(e) => handleFieldChange('nid', e.target.value)}
                      placeholder="e.g. 5067229434"
                      className="w-full px-4 py-3 rounded-2xl bg-surface border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                    />
                  </div>

                  {/* Passport ID */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Passport ID</label>
                    <input
                      type="text"
                      value={profile.passportNo || ''}
                      onChange={(e) => handleFieldChange('passportNo', e.target.value)}
                      placeholder="e.g. AG4105549"
                      className="w-full px-4 py-3 rounded-2xl bg-surface border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                    />
                  </div>

                  {/* Nationality */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Nationality</label>
                    <input
                      type="text"
                      value={profile.nationality || ''}
                      onChange={(e) => handleFieldChange('nationality', e.target.value)}
                      placeholder="e.g. Bangladeshi"
                      className="w-full px-4 py-3 rounded-2xl bg-surface border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                    />
                  </div>

                  {/* Religion */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Religion</label>
                    <input
                      type="text"
                      value={profile.religion || ''}
                      onChange={(e) => handleFieldChange('religion', e.target.value)}
                      placeholder="e.g. Islam / Hinduism / Christianity"
                      className="w-full px-4 py-3 rounded-2xl bg-surface border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                    />
                  </div>
                </div>

                {/* ── SECTION 2: CONTACT INFORMATION ── */}
                <div className="pt-6 border-t border-border/60 space-y-4">
                  <div className="text-xs font-black uppercase tracking-wider text-amber-500">
                    CONTACT INFORMATION
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Personal Email */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">Personal Email</label>
                      <input
                        type="email"
                        value={profile.personalEmail || ''}
                        onChange={(e) => handleFieldChange('personalEmail', e.target.value)}
                        placeholder="personal@gmail.com"
                        className="w-full px-4 py-3 rounded-2xl bg-surface border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                      />
                    </div>

                    {/* Personal Phone */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">Personal Phone</label>
                      <input
                        type="tel"
                        value={profile.personalPhone || ''}
                        onChange={(e) => handleFieldChange('personalPhone', e.target.value)}
                        placeholder="+880 1811 000000"
                        className="w-full px-4 py-3 rounded-2xl bg-surface border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                      />
                    </div>

                    {/* Work Mobile */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">Work Mobile</label>
                      <input
                        type="tel"
                        value={profile.workMobile || ''}
                        onChange={(e) => handleFieldChange('workMobile', e.target.value)}
                        placeholder="+880 1711 000000"
                        className="w-full px-4 py-3 rounded-2xl bg-surface border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                      />
                    </div>

                    {/* Work Location */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">Work Location</label>
                      <input
                        type="text"
                        value={profile.workLocation || ''}
                        onChange={(e) => handleFieldChange('workLocation', e.target.value)}
                        placeholder="e.g. Banani, Dhaka"
                        className="w-full px-4 py-3 rounded-2xl bg-surface border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                      />
                    </div>

                    {/* Home Address */}
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-xs font-bold text-foreground">Home Address</label>
                      <textarea
                        rows={2}
                        value={profile.homeAddress || ''}
                        onChange={(e) => handleFieldChange('homeAddress', e.target.value)}
                        placeholder="Complete permanent / present residential address"
                        className="w-full px-4 py-3 rounded-2xl bg-surface border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* ── SECTION 3: EMERGENCY CONTACT ── */}
                <div className="pt-6 border-t border-border/60 space-y-4">
                  <div className="text-xs font-black uppercase tracking-wider text-amber-500">
                    EMERGENCY CONTACT
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Emergency Contact Name & Relation */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">
                        Emergency Contact Name (with relation)
                      </label>
                      <input
                        type="text"
                        value={profile.emergencyContactName || ''}
                        onChange={(e) => handleFieldChange('emergencyContactName', e.target.value)}
                        placeholder="e.g. Kamal Hossain (Father)"
                        className="w-full px-4 py-3 rounded-2xl bg-surface border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                      />
                    </div>

                    {/* Emergency Phone */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">Emergency Phone</label>
                      <input
                        type="tel"
                        value={profile.emergencyPhone || ''}
                        onChange={(e) => handleFieldChange('emergencyPhone', e.target.value)}
                        placeholder="+880 1811 999000"
                        className="w-full px-4 py-3 rounded-2xl bg-surface border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Save Profile Button */}
                <div className="pt-6 flex justify-start">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-8 py-3.5 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-wider shadow-lg flex items-center space-x-2 transition transform active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>SAVING CHANGES...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 stroke-[2.5]" />
                        <span>SAVE PROFILE CHANGES</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: UPDATE PASSWORD (MATCHING SCREENSHOT 4) */}
          {activeTab === 'password' && (
            <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-md space-y-8 animate-in fade-in duration-200">
              {/* Header Title */}
              <div className="flex items-center space-x-2.5 text-primary text-base sm:text-lg font-black uppercase tracking-wider border-b border-border/60 pb-4">
                <Lock className="h-5 w-5 flex-shrink-0" />
                <span>UPDATE PASSWORD</span>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-6 max-w-xl">
                {/* Current Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPass ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter your current password"
                      className="w-full pl-4 pr-11 py-3 rounded-2xl bg-surface border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {showCurrentPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new strong password"
                      className="w-full pl-4 pr-11 py-3 rounded-2xl bg-surface border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPass ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your new password"
                      className="w-full pl-4 pr-11 py-3 rounded-2xl bg-surface border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {showConfirmPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Update Password Button (Screenshot 4) */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="w-full py-4 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center space-x-2 transition transform active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {passwordLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>UPDATING PASSWORD...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 stroke-[2.5]" />
                        <span>UPDATE PASSWORD</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
}
