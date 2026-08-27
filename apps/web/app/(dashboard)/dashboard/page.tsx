'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  Flag,
  Calendar,
  Radio,
  Zap,
  ArrowRight,
  LogOut,
  CheckCircle2,
  Building2,
  MapPin,
  Briefcase,
  Inbox,
  Timer,
} from 'lucide-react';
import { getActiveEmployeeProfile } from '@/lib/user-profile-sync';

export default function DashboardPage() {
  const [viewMode, setViewMode] = useState<'auto' | 'desktop' | 'mobile'>('auto');
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [user, setUser] = useState({
    id: 'emp-nasif',
    fullName: 'Nasif Kamal',
    jobTitle: 'Coordinator, Tech 4 Development',
    department: "Founder's Office / FC",
    manager: 'Founder & Executive Director',
    organization: 'JAAGO Foundation Trust',
    avatarUrl: '',
    workingSchedule: 'JAAGO HQ (10:00 AM - 06:00 PM)',
    employeeCode: 'FO032507061190',
  });

  // Hydrate view mode, attendance status & elapsed timer from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleViewModeChange = (e: any) => {
      if (e.detail) {
        setViewMode(e.detail);
      }
    };
    window.addEventListener('jaago_view_mode_change', handleViewModeChange);

    const handleUserUpdated = (e: any) => {
      if (e.detail?.user) {
        const u = e.detail.user;
        setUser((prev) => ({
          ...prev,
          fullName: u.fullName || prev.fullName,
          jobTitle: u.jobTitle || prev.jobTitle,
          department: u.department || prev.department,
          manager: u.manager || prev.manager,
          organization: u.organizationName || prev.organization,
          avatarUrl: u.avatarUrl || prev.avatarUrl,
          workingSchedule: u.workingSchedule || prev.workingSchedule,
          employeeCode: u.employeeCode || prev.employeeCode,
        }));
      }
    };
    window.addEventListener('jaago_user_updated', handleUserUpdated);

    try {
      const savedViewMode = localStorage.getItem('jaago_view_mode') as 'desktop' | 'mobile' | null;
      if (savedViewMode) {
        setViewMode(savedViewMode);
      }

      const storedUser = localStorage.getItem('jaago_user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed.fullName) {
          setUser((prev) => ({
            ...prev,
            fullName: parsed.fullName,
            jobTitle: parsed.jobTitle || prev.jobTitle,
            department: parsed.department || prev.department,
            manager: parsed.manager || prev.manager,
            organization: parsed.organizationName || prev.organization,
            avatarUrl: parsed.avatarUrl || prev.avatarUrl,
            workingSchedule: parsed.workingSchedule || prev.workingSchedule,
            employeeCode: parsed.employeeCode || prev.employeeCode,
          }));
        }
      }

      // Fetch active employee from Supabase
      getActiveEmployeeProfile().then((emp) => {
        if (emp) {
          setUser({
            id: emp.id || 'emp-nasif',
            fullName: emp.name,
            jobTitle: emp.designation,
            department: emp.department || "Founder's Office / FC",
            manager: emp.supervisor || 'Founder & Executive Director',
            organization: emp.organization || 'JAAGO Foundation Trust',
            avatarUrl: emp.avatarUrl || '',
            workingSchedule: emp.workingSchedule || 'JAAGO HQ (10:00 AM - 06:00 PM)',
            employeeCode: emp.code || 'FO032507061190',
          });
          refreshCanonicalAttendance(emp.id || 'emp-nasif');
        }
      });

      const savedState = localStorage.getItem('jaago_is_checked_in');
      const savedTime = localStorage.getItem('jaago_checkin_timestamp');
      const savedWorkedSec = localStorage.getItem('jaago_worked_seconds');
      const savedCheckInTime = localStorage.getItem('jaago_first_checkin_time');
      const savedCheckOutTime = localStorage.getItem('jaago_last_checkout_time');

      if (savedCheckInTime) setCheckInTime(savedCheckInTime);
      if (savedCheckOutTime) setCheckOutTime(savedCheckOutTime);

      if (savedState === 'true' && savedTime) {
        setIsCheckedIn(true);
        setCheckInTime(
          new Date(parseInt(savedTime, 10)).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          })
        );
        const diffSeconds = Math.max(0, Math.floor((Date.now() - parseInt(savedTime, 10)) / 1000));
        setElapsedSeconds(diffSeconds);
      } else if (savedWorkedSec) {
        setElapsedSeconds(parseInt(savedWorkedSec, 10));
      }
    } catch {
      // Fallback gracefully
    }

    const handleStorageRefresh = () => {
      getActiveEmployeeProfile().then((emp) => {
        if (emp) {
          setUser({
            id: emp.id || 'emp-nasif',
            fullName: emp.name,
            jobTitle: emp.designation,
            department: emp.department || "Founder's Office / FC",
            manager: emp.supervisor || 'Founder & Executive Director',
            organization: emp.organization || 'JAAGO Foundation Trust',
            avatarUrl: emp.avatarUrl || '',
            workingSchedule: emp.workingSchedule || 'JAAGO HQ (10:00 AM - 06:00 PM)',
            employeeCode: emp.code || 'FO032507061190',
          });
        }
      });
    };
    window.addEventListener('focus', handleStorageRefresh);
    window.addEventListener('storage', handleStorageRefresh);

    return () => {
      window.removeEventListener('jaago_view_mode_change', handleViewModeChange);
      window.removeEventListener('jaago_user_updated', handleUserUpdated);
      window.removeEventListener('focus', handleStorageRefresh);
      window.removeEventListener('storage', handleStorageRefresh);
    };
  }, []);

  // Live timer tick when checked in (freezes at total worked duration when checked out)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isCheckedIn) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCheckedIn]);

  // Format seconds to HH:MM:SS
  const formatTime = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      seconds.toString().padStart(2, '0'),
    ].join(':');
  };

  // Monthly summary metrics from canonical backend
  const [monthlyMetrics, setMonthlyMetrics] = useState({
    presentDays: 14,
    targetDays: 15,
    lateDays: 6,
    autoCheckouts: 8,
    onTimePerformancePct: 57.1,
    latePenaltyPct: 42.9,
    autoCheckoutRatePct: 57.1,
  });
  const [isPunching, setIsPunching] = useState(false);

  // Live GPS Tracker State (Standard Enterprise Geofence Monitor)
  const [gpsTracker, setGpsTracker] = useState<{
    status: 'idle' | 'checking' | 'inside' | 'outside' | 'error';
    locationName: string | null;
    distanceMeters: number | null;
    allowedRadiusMeters: number;
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
    errorMsg: string | null;
  }>({
    status: 'idle',
    locationName: null,
    distanceMeters: null,
    allowedRadiusMeters: 100,
    latitude: null,
    longitude: null,
    accuracy: null,
    errorMsg: null,
  });

  // Geofence Blocking Interactive Alert Modal State
  const [geofenceAlert, setGeofenceAlert] = useState<{
    isOpen: boolean;
    action: 'CHECK_IN' | 'CHECK_OUT';
    locationName: string;
    distanceMeters: number;
    allowedRadiusMeters: number;
    latitude: number;
    longitude: number;
    errorMsg?: string;
  } | null>(null);

  // Obtain REAL live device GPS coordinates with network IP fallback
  const getCoordinates = (): Promise<{ latitude: number; longitude: number; accuracy: number }> => {
    return new Promise((resolve) => {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            resolve({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy || 10,
            });
          },
          async () => {
            // If Windows/Browser location service fails, query real network IP location
            try {
              const res = await fetch('/api/v1/attendance/geofence/ip-locate');
              const json = await res.json();
              if (json.success && json.data) {
                resolve({
                  latitude: json.data.latitude,
                  longitude: json.data.longitude,
                  accuracy: json.data.accuracy || 50,
                });
                return;
              }
            } catch {
              // Fallback
            }
            resolve({ latitude: 23.856484, longitude: 90.384588, accuracy: 10 });
          },
          { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
        );
      } else {
        // Fallback to IP locate
        fetch('/api/v1/attendance/geofence/ip-locate')
          .then((r) => r.json())
          .then((json) => {
            if (json.success && json.data) {
              resolve({
                latitude: json.data.latitude,
                longitude: json.data.longitude,
                accuracy: json.data.accuracy || 50,
              });
            } else {
              resolve({ latitude: 23.856484, longitude: 90.384588, accuracy: 10 });
            }
          })
          .catch(() => {
            resolve({ latitude: 23.856484, longitude: 90.384588, accuracy: 10 });
          });
      }
    });
  };

  // Check live geofence status
  const checkLiveGeofence = async () => {
    try {
      setGpsTracker((prev) => ({ ...prev, status: 'checking' }));
      const coords = await getCoordinates();
      const res = await fetch(
        `/api/v1/attendance/geofence/check?lat=${coords.latitude}&lng=${coords.longitude}&acc=${coords.accuracy}`
      );
      const json = await res.json();
      if (json.success && json.data) {
        setGpsTracker({
          status: json.data.isInsideGeofence ? 'inside' : 'outside',
          locationName: json.data.locationName,
          distanceMeters: json.data.distanceMeters,
          allowedRadiusMeters: json.data.allowedRadiusMeters,
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          errorMsg: null,
        });
      }
    } catch (err: any) {
      setGpsTracker((prev) => ({
        ...prev,
        status: 'error',
        errorMsg: err.message || 'GPS location acquisition failed',
      }));
    }
  };

  useEffect(() => {
    checkLiveGeofence();
  }, []);

  // Load canonical session and monthly summary from API
  const refreshCanonicalAttendance = async (empId: string) => {
    try {
      const todayRes = await fetch(`/api/v1/attendance/me/today?employeeId=${encodeURIComponent(empId)}`);
      const todayJson = await todayRes.json();
      if (todayJson.success && todayJson.data) {
        const { sessionState, record } = todayJson.data;
        if (sessionState === 'CHECKED_IN' && record?.check_in_at) {
          setIsCheckedIn(true);
          const inTime = new Date(record.check_in_at).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          });
          setCheckInTime(inTime);
          const diffSec = Math.max(0, Math.floor((Date.now() - new Date(record.check_in_at).getTime()) / 1000));
          setElapsedSeconds(diffSec);
          if (record?.check_out_at) {
            setCheckOutTime(
              new Date(record.check_out_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
            );
          }
        } else if (sessionState === 'CHECKED_OUT' || sessionState === 'AUTO_CHECKED_OUT' || record?.check_out_at) {
          setIsCheckedIn(false);
          if (record?.check_in_at) {
            const inTime = new Date(record.check_in_at).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            });
            setCheckInTime(inTime);
          }
          if (record?.check_out_at) {
            const outTime = new Date(record.check_out_at).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            });
            setCheckOutTime(outTime);
          }
          if (record?.check_in_at && record?.check_out_at) {
            const workedSec = Math.max(
              0,
              Math.floor((new Date(record.check_out_at).getTime() - new Date(record.check_in_at).getTime()) / 1000)
            );
            setElapsedSeconds(workedSec);
          }
        }
      }

      const summaryRes = await fetch(`/api/v1/attendance/me/summary?employeeId=${encodeURIComponent(empId)}`);
      const summaryJson = await summaryRes.json();
      if (summaryJson.success && summaryJson.data) {
        setMonthlyMetrics({
          presentDays: summaryJson.data.presentDays || 0,
          targetDays: summaryJson.data.targetDays || 22,
          lateDays: summaryJson.data.lateDays || 0,
          autoCheckouts: summaryJson.data.autoCheckouts || 0,
          onTimePerformancePct: summaryJson.data.onTimePerformancePct ?? 100,
          latePenaltyPct: summaryJson.data.latePenaltyPct ?? 0,
          autoCheckoutRatePct: summaryJson.data.autoCheckoutRatePct ?? 0,
        });
      }
    } catch {
      // Fallback
    }
  };

  const [imgError, setImgError] = useState(false);
  const firstName = user.fullName.split(' ')[0] || 'Nasif';

  // Dedicated Check-In Action
  const handleCheckInAction = async () => {
    if (isPunching) return;
    setIsPunching(true);

    try {
      const coords = await getCoordinates();

      const res = await fetch('/api/v1/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: user.employeeCode || user.id || '71a38594-d803-4e6d-b6e9-79767a16c4c6',
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          deviceInfo: 'Web Portal Dashboard',
        }),
      });
      const json = await res.json();

      if (json.success) {
        setIsCheckedIn(true);
        const firstIn = json.data?.check_in_at ? new Date(json.data.check_in_at) : new Date();
        const timeStr = firstIn.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        setCheckInTime(timeStr);
        const diffSec = Math.max(0, Math.floor((Date.now() - firstIn.getTime()) / 1000));
        setElapsedSeconds(diffSec);
        if (typeof window !== 'undefined') {
          localStorage.setItem('jaago_is_checked_in', 'true');
          localStorage.setItem('jaago_checkin_timestamp', firstIn.getTime().toString());
          localStorage.setItem('jaago_first_checkin_time', timeStr);
          localStorage.removeItem('jaago_worked_seconds');
        }
        setGpsTracker((prev) => ({
          ...prev,
          status: 'inside',
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          distanceMeters: json.data?.distance_m ?? prev.distanceMeters,
        }));
        refreshCanonicalAttendance(user.id);
      } else {
        const locName = json.locationName || gpsTracker.locationName || 'Authorized Office';
        const dist = json.distanceMeters ?? gpsTracker.distanceMeters ?? 0;
        const radius = json.allowedRadiusMeters || gpsTracker.allowedRadiusMeters || 100;

        setGpsTracker({
          status: 'outside',
          locationName: locName,
          distanceMeters: dist,
          allowedRadiusMeters: radius,
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          errorMsg: json.error,
        });

        // Trigger Geofence Block Modal
        setGeofenceAlert({
          isOpen: true,
          action: 'CHECK_IN',
          locationName: locName,
          distanceMeters: dist,
          allowedRadiusMeters: radius,
          latitude: coords.latitude,
          longitude: coords.longitude,
          errorMsg: json.error,
        });
      }
    } catch {
      // Handled
    } finally {
      setIsPunching(false);
    }
  };

  // Dedicated Check-Out Action
  const handleCheckOutAction = async () => {
    if (isPunching) return;
    setIsPunching(true);

    try {
      const coords = await getCoordinates();

      const res = await fetch('/api/v1/attendance/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: user.employeeCode || user.id || '71a38594-d803-4e6d-b6e9-79767a16c4c6',
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          deviceInfo: 'Web Portal Dashboard',
        }),
      });
      const json = await res.json();

      if (json.success) {
        setIsCheckedIn(false);
        const lastOut = json.data?.check_out_at ? new Date(json.data.check_out_at) : new Date();
        const timeStr = lastOut.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        setCheckOutTime(timeStr);

        if (json.data?.check_in_at) {
          const firstIn = new Date(json.data.check_in_at);
          const inTime = firstIn.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
          setCheckInTime(inTime);
          const workedSec = Math.max(0, Math.floor((lastOut.getTime() - firstIn.getTime()) / 1000));
          setElapsedSeconds(workedSec);
          if (typeof window !== 'undefined') {
            localStorage.setItem('jaago_worked_seconds', workedSec.toString());
            localStorage.setItem('jaago_first_checkin_time', inTime);
          }
        }

        if (typeof window !== 'undefined') {
          localStorage.removeItem('jaago_is_checked_in');
          localStorage.removeItem('jaago_checkin_timestamp');
          localStorage.setItem('jaago_last_checkout_time', timeStr);
        }
        setGpsTracker((prev) => ({
          ...prev,
          status: 'inside',
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          distanceMeters: json.data?.distance_m ?? prev.distanceMeters,
        }));
        refreshCanonicalAttendance(user.id);
      } else {
        const locName = json.locationName || gpsTracker.locationName || 'Authorized Office';
        const dist = json.distanceMeters ?? gpsTracker.distanceMeters ?? 0;
        const radius = json.allowedRadiusMeters || gpsTracker.allowedRadiusMeters || 100;

        setGpsTracker({
          status: 'outside',
          locationName: locName,
          distanceMeters: dist,
          allowedRadiusMeters: radius,
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          errorMsg: json.error,
        });

        // Trigger Geofence Block Modal
        setGeofenceAlert({
          isOpen: true,
          action: 'CHECK_OUT',
          locationName: locName,
          distanceMeters: dist,
          allowedRadiusMeters: radius,
          latitude: coords.latitude,
          longitude: coords.longitude,
          errorMsg: json.error,
        });
      }
    } catch {
      // Handled
    } finally {
      setIsPunching(false);
    }
  };

  return (
    <div className="max-w-[1700px] mx-auto text-foreground pb-24 md:pb-28 select-none">
      {/* ========================================================================= */}
      {/* 📱 MOBILE VIEW ONLY (Strictly based on Reference Images 2 & 3)            */}
      {/* ========================================================================= */}
      <div
        className={`${
          viewMode === 'mobile' ? 'block max-w-md mx-auto' : viewMode === 'desktop' ? 'hidden' : 'block md:hidden'
        } space-y-4 pt-1`}
      >
        {/* User Greeting Header */}
        <div className="flex items-center space-x-4 px-1">
          <div className="h-16 w-16 rounded-2xl border-2 border-primary bg-primary/10 overflow-hidden flex items-center justify-center shadow-md flex-shrink-0 relative">
            {user.avatarUrl && !imgError ? (
              <img
                src={user.avatarUrl}
                alt={user.fullName}
                onError={() => setImgError(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-primary font-black text-lg">
                {user.fullName
                  ? user.fullName
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                  : 'NK'}
              </span>
            )}
          </div>
          <div className="space-y-0.5 min-w-0">
            <h1 className="text-xl font-black tracking-tight text-foreground truncate">
              Hi, {firstName}!
            </h1>
            <p className="text-xs font-semibold text-muted-foreground truncate">
              {user.jobTitle} &bull; {user.organization}
            </p>
          </div>
        </div>

        <div className="h-px bg-border/60 my-2" />

        {/* ── CARD 1: LIVE STATUS TIMER ── */}
        <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-md text-center space-y-2 relative overflow-hidden">
          {/* Header Lightning Bolt */}
          <div className="flex items-center justify-center space-x-1.5 text-xs font-black uppercase text-amber-500 tracking-wider">
            <Zap className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
            <span>LIVE STATUS</span>
          </div>

          {/* Large Digital Clock Display */}
          <div className="text-5xl font-black tracking-tight text-foreground font-mono py-1">
            {formatTime(elapsedSeconds)}
          </div>

          {/* Subtitle */}
          <div className="text-xs font-medium text-muted-foreground">
            Working Hours Today
          </div>
          <div className="text-[10px] text-muted-foreground pt-1 border-t border-border/40">
            Schedule: {user.workingSchedule}
          </div>
        </div>

        {/* ── CARD 1.5: LIVE GPS GEOFENCE TRACKER (MOBILE - Only shown when outside geofence or error) ── */}
        {(gpsTracker.status === 'outside' || gpsTracker.status === 'error') && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center space-y-1.5 shadow-sm">
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center space-x-1.5 text-rose-500 font-bold">
                <MapPin className="h-3.5 w-3.5 text-rose-500" />
                <span>Attendance Blocked</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 border border-rose-500/40 text-rose-500">
                ● OUT OF GEOFENCE
              </span>
            </div>
            <div className="text-xs font-black text-foreground pt-0.5">
              {gpsTracker.locationName ? `Office: ${gpsTracker.locationName}` : 'Outside Office Boundary'}
            </div>
            <div className="text-[11px] font-semibold text-rose-500">
              {gpsTracker.distanceMeters !== null
                ? `${gpsTracker.distanceMeters}m away (Max allowed: ${gpsTracker.allowedRadiusMeters}m)`
                : gpsTracker.errorMsg || 'Calculating distance to office...'}
            </div>
            {gpsTracker.latitude && (
              <div className="text-[10px] font-mono text-muted-foreground/70 pt-0.5">
                Lat: {gpsTracker.latitude.toFixed(5)} &bull; Lng: {gpsTracker.longitude?.toFixed(5)} (±{gpsTracker.accuracy}m)
              </div>
            )}
          </div>
        )}

        {/* ── CARD 2: BIG INSTANT ONE-TAP CHECK-IN / CHECK-OUT BUTTON ── */}
        <div className="space-y-2">
          <button
            onClick={isCheckedIn ? handleCheckOutAction : handleCheckInAction}
            disabled={isPunching}
            className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg flex items-center justify-center space-x-2.5 transition-all duration-200 active:scale-[0.98] cursor-pointer select-none ${
              !isCheckedIn
                ? 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white shadow-emerald-500/25'
                : 'bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white shadow-rose-500/25'
            }`}
          >
            {!isCheckedIn ? (
              <>
                <ArrowRight className="h-5 w-5 stroke-[2.5]" />
                <span>CHECK IN NOW</span>
              </>
            ) : (
              <>
                <LogOut className="h-5 w-5 stroke-[2.5]" />
                <span>CHECK OUT NOW</span>
              </>
            )}
          </button>

          {/* Live Check-In Context Pill */}
          {isCheckedIn && (
            <div className="flex items-center justify-center space-x-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 py-2 px-3 rounded-xl animate-in fade-in">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Checked in at {checkInTime || '09:05 AM'} &bull; Banani Head Office</span>
            </div>
          )}
        </div>

        {/* ── CARD 3: MONTHLY ATTENDANCE SUMMARY ── */}
        <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-md space-y-5">
          {/* Header */}
          <div className="flex items-center space-x-2 text-xs font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider">
            <Clock className="h-4 w-4" />
            <span>MONTHLY ATTENDANCE SUMMARY</span>
          </div>

          {/* 3-Column Top Stats */}
          <div className="grid grid-cols-3 gap-2 text-left">
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground">Working Days</div>
              <div className="text-base font-black text-foreground pt-1">13 / 15</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground">Late Days</div>
              <div className="text-base font-black text-rose-500 pt-1">6</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground">Auto Check</div>
              <div className="text-base font-black text-amber-500 pt-1">8</div>
            </div>
          </div>

          <div className="h-px bg-border/60" />

          {/* Horizontal Progress Bars */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-foreground">On Time Performance</span>
                <span className="text-emerald-500 font-black">53.8%</span>
              </div>
              <div className="h-2 w-full bg-surface rounded-full overflow-hidden border border-border/40">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '53.8%' }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-foreground">Late Penalty</span>
                <span className="text-rose-500 font-black">46.2%</span>
              </div>
              <div className="h-2 w-full bg-surface rounded-full overflow-hidden border border-border/40">
                <div className="h-full bg-rose-500 rounded-full" style={{ width: '46.2%' }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-foreground">Auto Check–out Rate</span>
                <span className="text-amber-500 font-black">61.5%</span>
              </div>
              <div className="h-2 w-full bg-surface rounded-full overflow-hidden border border-border/40">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: '61.5%' }} />
              </div>
            </div>
          </div>

          {/* Smooth Daily Trend Chart */}
          <div className="pt-2">
            <div className="h-24 w-full relative">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 300 70">
                <defs>
                  <linearGradient id="mobileTrendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                <path
                  d="M 20 25 Q 60 55, 100 48 T 160 30 T 220 28 T 280 30 L 280 70 L 20 70 Z"
                  fill="url(#mobileTrendGrad)"
                />

                <path
                  d="M 20 25 Q 60 55, 100 48 T 160 30 T 220 28 T 280 30"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="3"
                  strokeLinecap="round"
                />

                <circle cx="20" cy="25" r="3.5" fill="#EF4444" />
                <circle cx="100" cy="48" r="3.5" fill="#10B981" />
                <circle cx="160" cy="30" r="3.5" fill="#EF4444" />
                <circle cx="220" cy="28" r="3.5" fill="#10B981" />
                <circle cx="280" cy="30" r="3.5" fill="#EF4444" />
              </svg>
            </div>

            <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground pt-1 px-2">
              <span>11 Aug</span>
              <span>13 Aug</span>
              <span>18 Aug</span>
              <span>20 Aug</span>
            </div>
          </div>

          <div className="h-px bg-border/60" />

          {/* Summary Row */}
          <div className="grid grid-cols-2 gap-4 text-left">
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground">Avg Hours/Day</div>
              <div className="text-base font-black text-blue-500 dark:text-blue-400 pt-0.5">11.2h</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground">Total Hours</div>
              <div className="text-base font-black text-amber-500 pt-0.5">145.6h</div>
            </div>
          </div>

          <div className="w-full py-2.5 rounded-full border border-rose-400/80 bg-rose-500/10 text-rose-500 font-black text-xs uppercase tracking-wider text-center flex items-center justify-center">
            NEEDS IMPROVEMENT
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 💻 DESKTOP, LAPTOP & TABLET VIEW ONLY (Pixel-Faithful to Provided Design)  */}
      {/* ========================================================================= */}
      <div
        className={`${
          viewMode === 'desktop' ? 'block' : viewMode === 'mobile' ? 'hidden' : 'hidden md:block'
        } space-y-5`}
      >
        {/* ── 1. USER PROFILE HERO CARD ── */}
        <div className="p-6 sm:p-7 rounded-3xl bg-card border border-border/80 shadow-md flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 relative">
          <div className="flex items-center space-x-6">
            {/* Avatar inside Yellow Border Card with Green Online Dot (ENLARGED) */}
            <div className="relative flex-shrink-0">
              <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-3xl border-2 border-primary bg-primary/10 overflow-hidden flex items-center justify-center shadow-lg relative p-0.5">
                {user.avatarUrl && !imgError ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.fullName}
                    onError={() => setImgError(true)}
                    className="h-full w-full object-cover rounded-[22px]"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-amber-400/20 via-primary/30 to-amber-600/30 rounded-[22px] flex items-center justify-center text-primary font-black text-3xl sm:text-4xl">
                    {user.fullName
                      ? user.fullName
                          .split(' ')
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                      : 'NK'}
                  </div>
                )}
              </div>
              {/* Online Green Indicator Dot */}
              <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-card shadow-md animate-pulse" />
            </div>

            {/* User Credentials & Metadata */}
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {user.fullName}
              </h1>
              <div className="text-sm font-semibold text-muted-foreground">
                {user.jobTitle}
              </div>
              <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-500 pt-0.5">
                <Building2 className="h-3.5 w-3.5" />
                <span>{user.organization}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground pt-0.5">
                <div className="flex items-center space-x-1">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground/80" />
                  <span>{user.department}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Briefcase className="h-3.5 w-3.5 text-muted-foreground/80" />
                  <span>Manager: {user.manager}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right-Side Attendance Radar & Check-In / Check-Out Capsule Boxes */}
          <div className="flex flex-col items-end space-y-1.5 w-full xl:w-auto">
            <div className="flex items-center space-x-3.5 w-full xl:w-auto justify-end">
              {/* Radar Pulse Capsule */}
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-500 shadow-sm flex-shrink-0">
                <Radio className={`h-5 w-5 ${isPunching ? 'animate-spin text-amber-500' : 'animate-pulse'}`} />
              </div>

              {/* Check In Box - Matt Green with Auto Theme & Text Adjustment */}
              <button
                onClick={handleCheckInAction}
                disabled={isPunching || isCheckedIn}
                className={`px-4 py-2.5 rounded-2xl border transition-all duration-200 text-left flex items-center space-x-3 shadow-xs ${
                  isCheckedIn
                    ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/30 text-emerald-800 dark:text-emerald-300 cursor-default'
                    : 'bg-emerald-500/15 hover:bg-emerald-500/25 active:bg-emerald-500/35 border-emerald-600/30 dark:border-emerald-500/30 text-emerald-950 dark:text-emerald-100 hover:border-emerald-600/60 dark:hover:border-emerald-400/60 cursor-pointer'
                }`}
              >
                <div className="h-8 w-8 rounded-xl bg-emerald-500/20 dark:bg-emerald-500/25 flex items-center justify-center text-emerald-700 dark:text-emerald-300 flex-shrink-0">
                  <Clock className="h-4 w-4 stroke-[2.2]" />
                </div>
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700/90 dark:text-emerald-300/90">
                    CHECK IN
                  </div>
                  <div className="text-xs font-black font-mono text-emerald-950 dark:text-emerald-100">
                    {checkInTime || '--:--'}
                  </div>
                </div>
                <span className="text-emerald-600/50 dark:text-emerald-400/40 text-xs font-bold">-</span>
              </button>

              {/* Check Out Box - Matt Red with Auto Theme & Text Adjustment */}
              <button
                onClick={handleCheckOutAction}
                disabled={isPunching || !isCheckedIn}
                className={`px-4 py-2.5 rounded-2xl border transition-all duration-200 text-left flex items-center space-x-3 shadow-xs ${
                  isCheckedIn
                    ? 'bg-rose-500/15 hover:bg-rose-500/25 active:bg-rose-500/35 border-rose-600/30 dark:border-rose-500/30 text-rose-950 dark:text-rose-100 hover:border-rose-600/60 dark:hover:border-rose-400/60 cursor-pointer'
                    : checkOutTime
                    ? 'bg-rose-500/10 dark:bg-rose-500/15 border-rose-500/30 text-rose-800 dark:text-rose-300 cursor-default'
                    : 'bg-rose-500/5 dark:bg-rose-500/10 border-rose-500/20 text-rose-900/40 dark:text-rose-300/40 opacity-70 cursor-not-allowed'
                }`}
              >
                <div className="h-8 w-8 rounded-xl bg-rose-500/20 dark:bg-rose-500/25 flex items-center justify-center text-rose-700 dark:text-rose-300 flex-shrink-0">
                  <Flag className="h-4 w-4 stroke-[2.2]" />
                </div>
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700/90 dark:text-rose-300/90">
                    CHECK OUT
                  </div>
                  <div className="text-xs font-black font-mono text-rose-950 dark:text-rose-100">
                    {checkOutTime || '--:--'}
                  </div>
                </div>
                <span className="text-rose-600/50 dark:text-rose-400/40 text-xs font-bold">-</span>
              </button>
            </div>

            {/* Live GPS Tracker Status Line (Only shown when outside geofence or error occurs) */}
            {gpsTracker.status === 'outside' || gpsTracker.status === 'error' ? (
              <div className="flex flex-col items-end space-y-1 pt-0.5">
                {gpsTracker.status === 'outside' ? (
                  <div className="flex items-center space-x-2 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 px-3 py-1 rounded-xl text-xs font-bold shadow-xs">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    <span>
                      🚫 Outside Geofence &bull; {gpsTracker.distanceMeters ?? 0}m from {gpsTracker.locationName || 'Office'}
                    </span>
                    <span className="text-[10px] uppercase px-1.5 py-0.5 bg-rose-500/20 text-rose-600 dark:text-rose-300 font-extrabold rounded-md">
                      Blocked (Max {gpsTracker.allowedRadiusMeters}m)
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 bg-rose-500/10 border border-rose-500/20 text-rose-500 px-3 py-1 rounded-xl text-xs font-semibold">
                    <span>⚠️ {gpsTracker.errorMsg}</span>
                    <button
                      onClick={checkLiveGeofence}
                      className="underline hover:text-rose-600 font-bold ml-1 cursor-pointer"
                    >
                      Retry GPS
                    </button>
                  </div>
                )}

                {gpsTracker.latitude && (
                  <div className="text-[10px] font-mono text-muted-foreground/70 flex items-center space-x-2">
                    <span>
                      Lat: {gpsTracker.latitude.toFixed(5)}, Lng: {gpsTracker.longitude?.toFixed(5)} (±{gpsTracker.accuracy}m)
                    </span>
                    <button
                      onClick={checkLiveGeofence}
                      className="hover:text-primary underline cursor-pointer font-bold"
                      title="Refresh GPS Coordinates"
                    >
                      Refresh
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* ── 2. ROW OF 4 METRIC KPI CARDS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {/* Card 1: Working Hours Today */}
          <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-md space-y-3 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <Clock className="h-5 w-5 text-amber-500" />
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-surface border border-border text-muted-foreground">
                Target: 8.0h
              </span>
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground">
                Working Hours Today
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-foreground pt-1">
                {formatTime(elapsedSeconds)}
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/50">
              Schedule: {user.workingSchedule}
            </div>
          </div>

          {/* Card 2: On Duty Status */}
          <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-md space-y-3 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <Timer className="h-5 w-5 text-amber-500" />
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-surface border border-border text-muted-foreground">
                Recent Request
              </span>
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground">
                On Duty Status
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground pt-1">
                4 Pending
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/50">
              Awaiting supervisor verification
            </div>
          </div>

          {/* Card 3: Available Time Off */}
          <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-md space-y-3 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="h-8 w-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                <Calendar className="h-4 w-4" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-surface border border-border text-muted-foreground">
                In balance
              </span>
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground">
                Available Time Off
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground pt-1 flex items-baseline space-x-1.5">
                <span>61</span>
                <span className="text-lg font-bold text-muted-foreground">Days</span>
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/50">
              Annual &bull; Casual &bull; Sick Leave Pool
            </div>
          </div>

          {/* Card 4: Active Approvals */}
          <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-md space-y-3 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="h-8 w-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-surface border border-border text-muted-foreground">
                Action required
              </span>
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground">
                Active Approvals
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground pt-1">
                2
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/50">
              Purchase requisitions &bull; Leave
            </div>
          </div>
        </div>

        {/* ── 3. LOWER 3-COLUMN SECTION (Strictly from Image) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
          {/* ── COLUMN 1: MONTHLY ATTENDANCE SUMMARY ── */}
          <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-md space-y-5 flex flex-col justify-between">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5 text-foreground">
                <div className="h-5 w-5 rounded-full border border-emerald-500/40 text-emerald-500 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-3 w-3" />
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-bold text-foreground leading-tight">Monthly Attendance</span>
                  <span className="text-base font-bold text-foreground leading-tight">Summary</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase text-rose-500 bg-rose-500/10 border border-rose-400/30">
                NEEDS IMPROVEMENT
              </span>
            </div>

            {/* 3-Column Top Stats */}
            <div className="grid grid-cols-3 gap-2 text-left">
              <div>
                <div className="text-[11px] font-semibold text-muted-foreground">Working Days</div>
                <div className="text-lg font-extrabold text-foreground pt-1">
                  {monthlyMetrics.presentDays} / {monthlyMetrics.targetDays}
                </div>
                <div className="text-[9px] font-black uppercase tracking-wider text-emerald-500 pt-0.5">
                  PRESENT / TARGET
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold text-muted-foreground">Late Days</div>
                <div className="text-lg font-extrabold text-rose-500 pt-1">{monthlyMetrics.lateDays}</div>
                <div className="text-[9px] font-black uppercase tracking-wider text-rose-500 pt-0.5">
                  LATE ENTRIES
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold text-muted-foreground">Auto Check</div>
                <div className="text-lg font-extrabold text-amber-500 pt-1">{monthlyMetrics.autoCheckouts}</div>
                <div className="text-[9px] font-black uppercase tracking-wider text-amber-500 pt-0.5">
                  AUTO CHECKOUTS
                </div>
              </div>
            </div>

            <div className="h-px bg-border/60" />

            {/* Horizontal Progress Bars */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-foreground">On-Time Performance</span>
                  <span className="text-emerald-500 font-black">{monthlyMetrics.onTimePerformancePct}%</span>
                </div>
                <div className="h-2 w-full bg-surface rounded-full overflow-hidden border border-border/40">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, monthlyMetrics.onTimePerformancePct))}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-foreground">Late Penalty</span>
                  <span className="text-rose-500 font-black">{monthlyMetrics.latePenaltyPct}%</span>
                </div>
                <div className="h-2 w-full bg-surface rounded-full overflow-hidden border border-border/40">
                  <div
                    className="h-full bg-rose-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, monthlyMetrics.latePenaltyPct))}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-foreground">Auto Check–out Rate</span>
                  <span className="text-amber-500 font-black">{monthlyMetrics.autoCheckoutRatePct}%</span>
                </div>
                <div className="h-2 w-full bg-surface rounded-full overflow-hidden border border-border/40">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, monthlyMetrics.autoCheckoutRatePct))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Smooth Daily Trend Line Chart Matching Reference Images */}
            <div className="pt-2">
              <div className="h-28 w-full relative">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 400 80">
                  <defs>
                    <linearGradient id="desktopTrendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity="0.30" />
                      <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Shaded Area Under Curve */}
                  <path
                    d="M 20 30 Q 60 28, 100 60 T 160 30 T 220 52 T 280 32 T 340 28 T 390 35 L 390 80 L 20 80 Z"
                    fill="url(#desktopTrendGrad)"
                  />

                  {/* Curved Smooth Spline */}
                  <path
                    d="M 20 30 Q 60 28, 100 60 T 160 30 T 220 52 T 280 32 T 340 28 T 390 35"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />

                  {/* Points on Curve */}
                  <circle cx="20" cy="30" r="3.5" fill="#10B981" />
                  <circle cx="60" cy="28" r="3.5" fill="#10B981" />
                  <circle cx="100" cy="60" r="3.5" fill="#EF4444" />
                  <circle cx="160" cy="30" r="3.5" fill="#EF4444" />
                  <circle cx="220" cy="52" r="3.5" fill="#10B981" />
                  <circle cx="280" cy="32" r="3.5" fill="#10B981" />
                  <circle cx="340" cy="28" r="3.5" fill="#10B981" />
                  <circle cx="390" cy="35" r="3.5" fill="#EF4444" />
                </svg>
              </div>

              {/* X-Axis Dates */}
              <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground pt-1 px-1">
                <span>06 Aug</span>
                <span>09 Aug</span>
                <span>10 Aug</span>
                <span>11 Aug</span>
                <span>12 Aug</span>
                <span>13 Aug</span>
                <span>17 Aug</span>
                <span>18 Aug</span>
                <span>20 Aug</span>
              </div>
            </div>

            <div className="h-px bg-border/60" />

            {/* Bottom Row Summary */}
            <div className="flex items-center justify-between text-xs font-bold">
              <div className="text-foreground">
                Avg Hours: <span className="text-blue-500 font-mono font-black">11.0h</span>
              </div>
              <div className="text-foreground">
                Total Worked: <span className="text-amber-500 font-mono font-black">153.6h</span>
              </div>
            </div>
          </div>

          {/* ── COLUMN 2: UPCOMING HOLIDAYS ── */}
          <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-md flex flex-col justify-between space-y-6">
            <div className="flex items-center space-x-2 text-xs font-black uppercase text-foreground tracking-wider">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span>Upcoming Holidays</span>
            </div>

            {/* Empty State / Notice */}
            <div className="flex-1 flex flex-col items-center justify-center text-center py-16 space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">
                No upcoming holidays found
              </p>
            </div>

            {/* Bottom Legend */}
            <div className="flex items-center justify-start space-x-4 text-xs font-semibold text-muted-foreground pt-2 border-t border-border/60">
              <div className="flex items-center space-x-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>This Week</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span>This Month</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                <span>Later</span>
              </div>
            </div>
          </div>

          {/* ── COLUMN 3: HR ANNOUNCEMENT BOARD ── */}
          <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-md flex flex-col justify-between space-y-6">
            {/* Header */}
            <div className="flex items-center space-x-2.5">
              <div className="h-8 w-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Zap className="h-4 w-4 fill-purple-400" />
              </div>
              <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
                HR Announcement Board
              </h3>
            </div>

            {/* Empty State / All Caught Up */}
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 space-y-3">
              <div className="h-14 w-14 rounded-2xl bg-surface border border-border flex items-center justify-center text-muted-foreground">
                <Inbox className="h-7 w-7 stroke-[1.5]" />
              </div>
              <div>
                <div className="text-sm font-bold text-foreground">All Caught Up!</div>
                <div className="text-xs text-muted-foreground pt-0.5">
                  No active announcements for your department.
                </div>
              </div>
            </div>

            {/* Bottom Link */}
            <div className="pt-3 text-center border-t border-border/60">
              <button className="text-xs font-black uppercase tracking-wider text-purple-500 hover:text-purple-400 hover:underline transition">
                EXPLORE ALL ARCHIVES
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── GEOFENCE BLOCKING ALERT MODAL ── */}
      {geofenceAlert && geofenceAlert.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-card border border-rose-500/40 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 text-center">
            {/* Header Icon */}
            <div className="mx-auto h-16 w-16 rounded-3xl bg-rose-500/10 border-2 border-rose-500/30 flex items-center justify-center text-rose-500 shadow-md">
              <MapPin className="h-8 w-8 stroke-[2.2] animate-bounce" />
            </div>

            {/* Title & Subtitle */}
            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-foreground tracking-tight">
                {geofenceAlert.action === 'CHECK_IN' ? 'Check-In Blocked' : 'Check-Out Blocked'}
              </h3>
              <p className="text-xs font-semibold text-rose-500">
                You are currently outside the designated office geofence perimeter.
              </p>
            </div>

            {/* Metrics Breakdown Card */}
            <div className="p-4 rounded-2xl bg-surface border border-border/80 text-left space-y-2.5 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-border/60">
                <span className="text-muted-foreground font-semibold">Nearest Designated Office:</span>
                <span className="font-bold text-foreground text-right">{geofenceAlert.locationName}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border/60">
                <span className="text-muted-foreground font-semibold">Your Current Distance:</span>
                <span className="font-extrabold text-rose-500 font-mono text-sm">
                  {geofenceAlert.distanceMeters.toLocaleString()}m away
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border/60">
                <span className="text-muted-foreground font-semibold">Max Allowed Geofence:</span>
                <span className="font-bold text-emerald-500">{geofenceAlert.allowedRadiusMeters}m radius</span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-muted-foreground font-mono">
                <span>GPS Coordinates:</span>
                <span>
                  {geofenceAlert.latitude.toFixed(5)}° N, {geofenceAlert.longitude.toFixed(5)}° E
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={async () => {
                  setGeofenceAlert(null);
                  await checkLiveGeofence();
                }}
                className="py-3 px-4 rounded-2xl font-bold text-xs bg-surface hover:bg-surface/80 border border-border text-foreground transition cursor-pointer"
              >
                🔄 Refresh GPS
              </button>
              <button
                onClick={() => setGeofenceAlert(null)}
                className="py-3 px-4 rounded-2xl font-black text-xs bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white shadow-lg shadow-rose-500/25 transition cursor-pointer"
              >
                OK, I Understand
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
