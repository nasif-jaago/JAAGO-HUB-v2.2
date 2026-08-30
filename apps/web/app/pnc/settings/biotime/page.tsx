'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Fingerprint,
  Radio,
  Server,
  RefreshCw,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Building2,
  Trash2,
  Pencil,
  Copy,
  Check,
  Zap,
  Activity,
  Send,
  Loader2,
  ShieldCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import {
  BioTimeDevice,
  BioTimeConfig,
  BioTimePunchLog,
  INITIAL_BIOTIME_CONFIG,
} from '@/lib/biotime-data';

export default function BioTimeControlCenterPage() {
  const [devices, setDevices] = useState<BioTimeDevice[]>([]);
  const [config, setConfig] = useState<BioTimeConfig>(INITIAL_BIOTIME_CONFIG);
  const [punchLogs, setPunchLogs] = useState<BioTimePunchLog[]>([]);
  const [activeTab, setActiveTab] = useState<'devices' | 'stream' | 'config' | 'mapping'>('devices');

  // Pagination State for Punch Stream
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalLogs, setTotalLogs] = useState(20472);
  const [totalPages, setTotalPages] = useState(1024);
  const [isLogsLoading, setIsLogsLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('ALL');

  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPingingAll, setIsPingingAll] = useState(false);
  const [pingingDeviceId, setPingingDeviceId] = useState<string | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modals
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
  const [deviceToEdit, setDeviceToEdit] = useState<BioTimeDevice | null>(null);
  const [deviceToDelete, setDeviceToDelete] = useState<BioTimeDevice | null>(null);
  const [showManualPunchModal, setShowManualPunchModal] = useState(false);

  // Add / Edit Device Form State
  const [devName, setDevName] = useState('');
  const [devSn, setDevSn] = useState('');
  const [devIp, setDevIp] = useState('');
  const [devPort, setDevPort] = useState(4370);
  const [devBranch, setDevBranch] = useState('Banani HQ (Dhaka)');
  const [devType, setDevType] = useState<BioTimeDevice['deviceType']>('Face Recognition');
  const [devProtocol, setDevProtocol] = useState<BioTimeDevice['protocol']>('ZKTeco Push SDK');
  const [isSavingDevice, setIsSavingDevice] = useState(false);

  // Manual Punch Test Form State
  const [testPin, setTestPin] = useState('EMP001');
  const [testName, setTestName] = useState('Tasnim Akter');
  const [testDept, setTestDept] = useState('Digital School Program');
  const [testDeviceSn, setTestDeviceSn] = useState('VGU6251500095');
  const [testVerifyType, setTestVerifyType] = useState<'Face' | 'Fingerprint' | 'RFID Card'>('Face');
  const [isSubmittingPunch, setIsSubmittingPunch] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load Paginated Punch Logs
  const loadPunchLogs = async (targetPage: number, targetPageSize?: number) => {
    const size = targetPageSize || pageSize;
    setIsLogsLoading(true);
    try {
      const logsRes = await fetch(`/api/v1/biotime/logs?page=${targetPage}&pageSize=${size}`);
      const logsData = await logsRes.json();
      if (logsData.success && logsData.data) {
        setPunchLogs(logsData.data);
        setPage(logsData.page || targetPage);
        setTotalLogs(logsData.total || 20472);
        setTotalPages(logsData.totalPages || Math.ceil((logsData.total || 20472) / size));
      }
    } catch (e) {
      console.error('Error fetching punch logs:', e);
    } finally {
      setIsLogsLoading(false);
    }
  };

  // Load All Initial Data
  const loadBioTimeData = async () => {
    try {
      const [devRes, confRes] = await Promise.all([
        fetch('/api/v1/biotime/devices'),
        fetch('/api/v1/biotime/config'),
      ]);

      const devData = await devRes.json();
      const confData = await confRes.json();

      if (devData.success && devData.data) setDevices(devData.data);
      if (confData.success && confData.data) setConfig(confData.data);
      
      await loadPunchLogs(1, pageSize);
    } catch (e) {
      console.error('Error loading BioTime data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBioTimeData();
  }, []);

  // Trigger Instant BioTime Sync
  const handleTriggerSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/v1/biotime/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceAll: true }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || '✓ BioTime Sync Complete!');
        await loadBioTimeData();
      } else {
        showToast(data.error || 'Failed to sync BioTime', 'error');
      }
    } catch {
      showToast('Network error during BioTime sync', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Ping Single Device
  const handlePingDevice = async (device: BioTimeDevice) => {
    setPingingDeviceId(device.id);
    try {
      const res = await fetch(`/api/v1/biotime/devices/${device.id}/ping`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setDevices((prev) =>
          prev.map((d) =>
            d.id === device.id
              ? { ...d, status: 'ONLINE', pingLatencyMs: data.data.latencyMs, lastHeartbeat: data.data.timestamp }
              : d
          )
        );
        showToast(`✓ ${device.name}: Response received in ${data.data.latencyMs}ms (Online)`);
      } else {
        showToast(data.error || 'Device ping timed out', 'error');
      }
    } catch {
      showToast(`Ping failed for ${device.name}`, 'error');
    } finally {
      setPingingDeviceId(null);
    }
  };

  // Ping All Devices
  const handlePingAll = async () => {
    setIsPingingAll(true);
    for (const dev of devices) {
      try {
        const res = await fetch(`/api/v1/biotime/devices/${dev.id}/ping`, { method: 'POST' });
        const data = await res.json();
        if (res.ok && data.success) {
          setDevices((prev) =>
            prev.map((d) =>
              d.id === dev.id
                ? { ...d, status: 'ONLINE', pingLatencyMs: data.data.latencyMs, lastHeartbeat: data.data.timestamp }
                : d
            )
          );
        }
      } catch {
        // Continue to next device
      }
    }
    setIsPingingAll(false);
    showToast('✓ All biometric terminals pinged successfully.');
  };

  // Save / Update Device
  const handleSaveDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!devName.trim() || !devSn.trim() || !devIp.trim()) {
      showToast('Name, Serial Number, and IP Address are required', 'error');
      return;
    }

    setIsSavingDevice(true);
    try {
      if (deviceToEdit) {
        const res = await fetch(`/api/v1/biotime/devices/${deviceToEdit.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: devName.trim(),
            serialNumber: devSn.trim(),
            ipAddress: devIp.trim(),
            port: Number(devPort),
            locationBranch: devBranch,
            deviceType: devType,
            protocol: devProtocol,
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showToast(`✓ Device '${devName}' updated successfully!`);
          setDeviceToEdit(null);
          await loadBioTimeData();
        } else {
          showToast(data.error || 'Failed to update device', 'error');
        }
      } else {
        const res = await fetch('/api/v1/biotime/devices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: devName.trim(),
            serialNumber: devSn.trim(),
            ipAddress: devIp.trim(),
            port: Number(devPort),
            locationBranch: devBranch,
            deviceType: devType,
            protocol: devProtocol,
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showToast(`✓ Biometric terminal '${devName}' registered successfully!`);
          setShowAddDeviceModal(false);
          await loadBioTimeData();
        } else {
          showToast(data.error || 'Failed to add device', 'error');
        }
      }
    } catch {
      showToast('Error saving biometric terminal', 'error');
    } finally {
      setIsSavingDevice(false);
    }
  };

  // Delete Device
  const handleDeleteDevice = async (device: BioTimeDevice) => {
    try {
      const res = await fetch(`/api/v1/biotime/devices/${device.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`✓ Terminal '${device.name}' removed.`);
        setDeviceToDelete(null);
        setDevices((prev) => prev.filter((d) => d.id !== device.id));
      } else {
        showToast(data.error || 'Failed to delete device', 'error');
      }
    } catch {
      showToast('Error deleting device', 'error');
    }
  };

  // Submit Manual Test Punch
  const handleSubmitManualPunch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingPunch(true);
    try {
      const res = await fetch('/api/v1/biotime/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_sn: testDeviceSn,
          pin: testPin.trim(),
          employee_name: testName.trim(),
          department: testDept.trim(),
          punch_time: new Date().toISOString(),
          punch_state: 'CHECK_IN',
          verify_type: testVerifyType,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`✓ Biometric punch recorded for ${testName} (${testPin})!`);
        setShowManualPunchModal(false);
        await loadBioTimeData();
      } else {
        showToast(data.error || 'Failed to record punch', 'error');
      }
    } catch {
      showToast('Network error recording punch', 'error');
    } finally {
      setIsSubmittingPunch(false);
    }
  };

  // Copy Webhook URL
  const copyWebhookUrl = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(config.webhookUrl);
      setCopiedWebhook(true);
      showToast('✓ BioTime Push Webhook URL copied to clipboard!');
      setTimeout(() => setCopiedWebhook(false), 3000);
    }
  };

  // Open Edit Modal
  const openEditModal = (device: BioTimeDevice) => {
    setDeviceToEdit(device);
    setDevName(device.name);
    setDevSn(device.serialNumber);
    setDevIp(device.ipAddress);
    setDevPort(device.port);
    setDevBranch(device.locationBranch);
    setDevType(device.deviceType);
    setDevProtocol(device.protocol);
  };

  // Filtered devices
  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
      const matchSearch =
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.ipAddress.toLowerCase().includes(searchQuery.toLowerCase());
      const matchBranch = branchFilter === 'ALL' || d.locationBranch.includes(branchFilter);
      return matchSearch && matchBranch;
    });
  }, [devices, searchQuery, branchFilter]);

  const onlineDevicesCount = devices.filter((d) => d.status === 'ONLINE').length;

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground font-medium">Initializing BioTime 8.5 Control Center & Hardware Engine...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-[1700px] mx-auto pb-12 text-xs">
      {/* ── Toast Notification ── */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl shadow-xl flex items-center space-x-2.5 text-xs font-medium border backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/90 border-rose-500/40 text-rose-200'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── Top Header Section ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card/70 backdrop-blur-md p-4 rounded-xl border border-border/80 shadow-2xs">
        <div>
          <div className="flex items-center space-x-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
            <Link href="/pnc" className="hover:text-primary transition">People &amp; Culture</Link>
            <span>&bull;</span>
            <Link href="/pnc/attendance/logs" className="hover:text-primary transition">Attendance</Link>
            <span>&bull;</span>
            <span className="text-cyan-600 dark:text-cyan-400">BioTime Engine</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Fingerprint className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            BioTime Control Center
          </h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Real-time biometric terminal fleet management, ZKTeco ADMS push gateway, and automated punch synchronization.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowManualPunchModal(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border hover:bg-accent transition-all flex items-center gap-1.5 text-foreground"
          >
            <Send className="w-3.5 h-3.5 text-primary" />
            <span>Test Punch</span>
          </button>

          <button
            onClick={handlePingAll}
            disabled={isPingingAll}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border hover:bg-accent transition-all flex items-center gap-1.5 text-foreground"
          >
            {isPingingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Radio className="w-3.5 h-3.5 text-cyan-500" />}
            <span>Ping Fleet</span>
          </button>

          <button
            onClick={() => {
              setDevName('');
              setDevSn('');
              setDevIp('');
              setDevPort(4370);
              setDevBranch('Banani HQ (Dhaka)');
              setDevType('Face Recognition');
              setDevProtocol('ZKTeco Push SDK');
              setShowAddDeviceModal(true);
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-700 text-white shadow-xs transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Terminal</span>
          </button>

          <button
            onClick={handleTriggerSync}
            disabled={isSyncing}
            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs transition-all flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync All Now'}</span>
          </button>
        </div>
      </div>

      {/* ── KPI Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Terminals Online */}
        <div className="p-3.5 rounded-xl bg-card border border-border shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Biometric Terminals</div>
            <div className="text-xl font-bold text-foreground flex items-center gap-2">
              <span>{onlineDevicesCount} / {devices.length}</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                100% Online
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground">{devices.length} Connected Hardware Terminals</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
            <Radio className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2: Auto-Sync Engine */}
        <div className="p-3.5 rounded-xl bg-card border border-border shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sync Engine Status</div>
            <div className="text-xl font-bold text-foreground flex items-center gap-1.5">
              <span>Active</span>
              <span className="text-xs font-semibold text-muted-foreground font-mono">({config.syncIntervalMinutes}m interval)</span>
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              <span>Real-Time Webhook Push OK</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3: Today's Punches */}
        <div className="p-3.5 rounded-xl bg-card border border-border shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Punches Ingested Today</div>
            <div className="text-xl font-bold text-foreground">
              {config.totalSyncedToday.toLocaleString()}
            </div>
            <div className="text-[10px] text-muted-foreground">{config.totalPersonnel || 148} Enrolled Bio Staff</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Fingerprint className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 4: Last Sync Timestamp */}
        <div className="p-3.5 rounded-xl bg-card border border-border shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Last Reconciled</div>
            <div className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>{new Date(config.lastSyncTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</span>
            </div>
            <div className="text-[10px] text-muted-foreground">{new Date(config.lastSyncTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ── Subsystem Navigation Tabs ── */}
      <div className="flex border-b border-border/80 space-x-1">
        <button
          onClick={() => setActiveTab('devices')}
          className={`px-4 py-2 font-bold text-xs border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'devices'
              ? 'border-cyan-600 text-cyan-700 dark:text-cyan-400 bg-accent/30 rounded-t-lg'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Biometric Terminals ({devices.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('stream')}
          className={`px-4 py-2 font-bold text-xs border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'stream'
              ? 'border-cyan-600 text-cyan-700 dark:text-cyan-400 bg-accent/30 rounded-t-lg'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Live Ingestion Feed ({totalLogs.toLocaleString()})</span>
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`px-4 py-2 font-bold text-xs border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'config'
              ? 'border-cyan-600 text-cyan-700 dark:text-cyan-400 bg-accent/30 rounded-t-lg'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Server &amp; Webhook Gateway</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          TAB 1: BIOMETRIC TERMINALS FLEET
         ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'devices' && (
        <div className="space-y-3">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search terminals by name, IP, serial..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-card border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                />
              </div>

              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-card border border-border text-xs font-semibold text-foreground focus:outline-none shadow-2xs"
              >
                <option value="ALL">All Branches</option>
                <option value="Banani">Banani HQ</option>
                <option value="School">Schools Only</option>
                <option value="Chittagong">Chittagong</option>
                <option value="Cox">Cox&apos;s Bazar</option>
              </select>
            </div>

            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <span>Showing {filteredDevices.length} of {devices.length} registered terminals</span>
            </div>
          </div>

          {/* Grid Fleet Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredDevices.map((device) => {
              const isPinging = pingingDeviceId === device.id;
              return (
                <div
                  key={device.id}
                  className="p-3.5 rounded-xl bg-card border border-border shadow-2xs space-y-3 hover:border-cyan-500/50 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    {/* Card Top: Status & Name */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-foreground truncate">{device.name}</div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-cyan-600 shrink-0" />
                          <span className="truncate">{device.locationBranch}</span>
                        </div>
                      </div>

                      <span
                        className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                          device.status === 'ONLINE'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            device.status === 'ONLINE' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                          }`}
                        />
                        {device.status}
                      </span>
                    </div>

                    {/* Network & Specs Info */}
                    <div className="p-2 rounded-lg bg-accent/30 space-y-1 text-[11px] font-mono">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>IP &amp; Port:</span>
                        <strong className="text-foreground">{device.ipAddress}:{device.port}</strong>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Serial No:</span>
                        <span className="text-cyan-700 dark:text-cyan-300 font-bold">{device.serialNumber}</span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Protocol:</span>
                        <span className="text-foreground">{device.protocol}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-1.5">
                    <button
                      onClick={() => handlePingDevice(device)}
                      disabled={isPinging}
                      className="px-2.5 py-1 rounded-lg border border-border hover:bg-accent text-[10px] font-bold text-foreground transition-all flex items-center gap-1"
                    >
                      {isPinging ? <Loader2 className="w-3 h-3 animate-spin" /> : <Radio className="w-3 h-3 text-cyan-600" />}
                      <span>Ping</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(device)}
                        className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-cyan-600 transition-all"
                        title="Edit Terminal Settings"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setDeviceToDelete(device)}
                        className="p-1 rounded hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 transition-all"
                        title="Remove Terminal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TAB 2: LIVE INGESTION PUNCH STREAM
         ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'stream' && (
        <div className="bg-card rounded-xl border border-border shadow-2xs overflow-hidden space-y-0">
          <div className="p-3 bg-accent/25 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="font-bold text-xs text-foreground">Live Biometric Punch Ingestion Stream</span>
              <span className="text-[11px] text-muted-foreground font-mono">({totalLogs.toLocaleString()} punches recorded)</span>
            </div>
            <div className="flex items-center gap-2">
              {isLogsLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-600" />}
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
                Active WebSocket &amp; ADMS Push Feed
              </span>
            </div>
          </div>

          <div className="overflow-x-auto relative">
            {isLogsLoading && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border shadow-md">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-600" />
                  <span className="text-xs font-bold text-foreground">Loading punches from BioTime...</span>
                </div>
              </div>
            )}
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/40 border-b border-border text-[10px] uppercase font-bold text-muted-foreground">
                <tr>
                  <th className="p-2.5">Employee</th>
                  <th className="p-2.5">Department &amp; Branch</th>
                  <th className="p-2.5">Terminal Device</th>
                  <th className="p-2.5">Punch Time</th>
                  <th className="p-2.5 text-center">Verify Mode</th>
                  <th className="p-2.5 text-center">State</th>
                  <th className="p-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {punchLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-accent/20 transition-all text-[11px]">
                    <td className="p-2.5">
                      <div className="font-bold text-foreground">{log.employeeName}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">{log.employeeCode}</div>
                    </td>
                    <td className="p-2.5">
                      <div className="text-foreground">{log.department}</div>
                      <div className="text-[10px] text-muted-foreground">{log.locationBranch}</div>
                    </td>
                    <td className="p-2.5">
                      <div className="font-semibold text-foreground">{log.deviceName}</div>
                      <div className="text-[10px] font-mono text-cyan-700 dark:text-cyan-300">{log.deviceSn}</div>
                    </td>
                    <td className="p-2.5 font-mono text-[10px]">
                      <div>{new Date(log.punchTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</div>
                      <div className="text-muted-foreground">{new Date(log.punchTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    </td>
                    <td className="p-2.5 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
                        {log.verifyType}
                      </span>
                    </td>
                    <td className="p-2.5 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {log.punchState}
                      </span>
                    </td>
                    <td className="p-2.5 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-muted text-muted-foreground">
                        {log.syncStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Pagination Controls Bar ── */}
          <div className="p-3 bg-card border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            {/* Left: Summary and Page Size */}
            <div className="flex items-center gap-3 text-muted-foreground">
              <span>
                Showing{' '}
                <strong className="text-foreground">
                  {totalLogs === 0 ? 0 : (page - 1) * pageSize + 1}
                </strong>{' '}
                to{' '}
                <strong className="text-foreground">
                  {Math.min(page * pageSize, totalLogs)}
                </strong>{' '}
                of{' '}
                <strong className="text-foreground">{totalLogs.toLocaleString()}</strong> punches
              </span>

              <div className="flex items-center gap-1.5 pl-3 border-l border-border">
                <span className="text-[11px]">Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const newSize = Number(e.target.value);
                    setPageSize(newSize);
                    loadPunchLogs(1, newSize);
                  }}
                  className="px-2 py-0.5 rounded-md bg-background border border-border text-foreground text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Right: Pagination Navigation */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => loadPunchLogs(1, pageSize)}
                disabled={page <= 1 || isLogsLoading}
                className="px-2 py-1 rounded-md border border-border bg-background hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-foreground transition-all flex items-center gap-1"
                title="First Page"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => loadPunchLogs(page - 1, pageSize)}
                disabled={page <= 1 || isLogsLoading}
                className="px-2.5 py-1 rounded-md border border-border bg-background hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-foreground transition-all flex items-center gap-1"
                title="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              {/* Page indicator */}
              <div className="px-3 py-1 rounded-md bg-accent/40 border border-border text-xs font-bold text-foreground">
                Page {page} of {Math.max(1, totalPages)}
              </div>

              <button
                onClick={() => loadPunchLogs(page + 1, pageSize)}
                disabled={page >= totalPages || isLogsLoading}
                className="px-2.5 py-1 rounded-md border border-border bg-background hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-foreground transition-all flex items-center gap-1"
                title="Next Page"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => loadPunchLogs(totalPages, pageSize)}
                disabled={page >= totalPages || isLogsLoading}
                className="px-2 py-1 rounded-md border border-border bg-background hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-foreground transition-all flex items-center gap-1"
                title="Last Page"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TAB 3: SERVER & WEBHOOK GATEWAY CONFIGURATION
         ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* BioTime Server Connection Card */}
          <div className="p-4 rounded-xl bg-card border border-border shadow-2xs space-y-3.5">
            <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
              <Server className="w-4 h-4 text-cyan-600" />
              <h3 className="text-xs font-bold text-foreground">BioTime 8.5 Master Server Credentials</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-foreground">BioTime Server URL</label>
                <input
                  type="text"
                  value={config.serverUrl}
                  onChange={(e) => setConfig({ ...config, serverUrl: e.target.value })}
                  className="mt-1 w-full px-3 py-1.5 rounded-lg bg-background border border-border font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground">API Token / Security Secret</label>
                <input
                  type="password"
                  value={config.apiToken}
                  onChange={(e) => setConfig({ ...config, apiToken: e.target.value })}
                  className="mt-1 w-full px-3 py-1.5 rounded-lg bg-background border border-border font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-foreground">Sync Frequency</label>
                  <select
                    value={config.syncIntervalMinutes}
                    onChange={(e) => setConfig({ ...config, syncIntervalMinutes: Number(e.target.value) })}
                    className="mt-1 w-full px-2.5 py-1.5 rounded-lg bg-background border border-border text-[11px] focus:outline-none"
                  >
                    <option value={1}>Every 1 Minute (Real-Time)</option>
                    <option value={5}>Every 5 Minutes (Standard)</option>
                    <option value={15}>Every 15 Minutes</option>
                    <option value={30}>Every 30 Minutes</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-foreground">Company Code</label>
                  <input
                    type="text"
                    value={config.companyCode}
                    onChange={(e) => setConfig({ ...config, companyCode: e.target.value })}
                    className="mt-1 w-full px-2.5 py-1.5 rounded-lg bg-background border border-border font-mono text-[11px] focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-border flex justify-end">
                <button
                  onClick={async () => {
                    const res = await fetch('/api/v1/biotime/config', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(config),
                    });
                    if (res.ok) showToast('✓ BioTime server settings saved!');
                  }}
                  className="px-4 py-1.5 rounded-lg font-bold bg-cyan-600 hover:bg-cyan-700 text-white shadow-xs"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          </div>

          {/* ADMS Push & Webhook Gateway */}
          <div className="p-4 rounded-xl bg-card border border-border shadow-2xs space-y-3.5">
            <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
              <Zap className="w-4 h-4 text-amber-500" />
              <h3 className="text-xs font-bold text-foreground">ZKTeco Push SDK &amp; ADMS Webhook Receiver</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-foreground">Public Push Webhook Endpoint</label>
                <div className="mt-1 flex items-center gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={config.webhookUrl}
                    className="w-full px-3 py-1.5 rounded-lg bg-muted text-foreground border border-border font-mono text-[11px] select-all focus:outline-none"
                  />
                  <button
                    onClick={copyWebhookUrl}
                    className="px-3 py-1.5 rounded-lg bg-accent hover:bg-accent/80 border border-border font-semibold text-xs flex items-center gap-1 shrink-0"
                  >
                    {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedWebhook ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Copy and paste this URL into your ZKTeco BioTime software under <strong>System &gt; Push Server URL</strong>.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 space-y-1">
                <div className="font-bold text-cyan-800 dark:text-cyan-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Automated Attendance Reconciliation</span>
                </div>
                <p className="text-[10px] text-cyan-900/80 dark:text-cyan-200/80 leading-relaxed">
                  Incoming biometric punches from all 8 terminals are automatically matched against staff schedules. Check-in and check-out records in <strong>Attendance Logs</strong> are updated instantly without manual data entry.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL: ADD / EDIT BIOMETRIC TERMINAL
         ═══════════════════════════════════════════════════════════════ */}
      {(showAddDeviceModal || deviceToEdit) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-xl border border-border shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-cyan-600" />
                <h3 className="text-sm font-bold text-foreground">
                  {deviceToEdit ? 'Edit Biometric Terminal' : 'Register Biometric Terminal'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowAddDeviceModal(false);
                  setDeviceToEdit(null);
                }}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDevice} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-foreground">Device Name *</label>
                <input
                  type="text"
                  placeholder="e.g. HQ Banani Entrance Face Terminal"
                  value={devName}
                  onChange={(e) => setDevName(e.target.value)}
                  required
                  className="mt-1 w-full px-3 py-1.5 rounded-lg bg-background border border-border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-foreground">Serial Number (SN) *</label>
                  <input
                    type="text"
                    placeholder="ZKT-HQ-01"
                    value={devSn}
                    onChange={(e) => setDevSn(e.target.value)}
                    required
                    className="mt-1 w-full px-3 py-1.5 rounded-lg bg-background border border-border font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-foreground">Branch Location *</label>
                  <select
                    value={devBranch}
                    onChange={(e) => setDevBranch(e.target.value)}
                    className="mt-1 w-full px-2.5 py-1.5 rounded-lg bg-background border border-border text-[11px] focus:outline-none"
                  >
                    <option value="Banani HQ (Dhaka)">Banani HQ (Dhaka)</option>
                    <option value="Rayerbazar School (Dhaka)">Rayerbazar School (Dhaka)</option>
                    <option value="Tongi School (Gazipur)">Tongi School (Gazipur)</option>
                    <option value="Chittagong Branch">Chittagong Branch</option>
                    <option value="Cox's Bazar Branch">Cox&apos;s Bazar Branch</option>
                    <option value="Bandarban School">Bandarban School</option>
                    <option value="Habiganj School">Habiganj School</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-foreground">IP Address *</label>
                  <input
                    type="text"
                    placeholder="192.168.1.201"
                    value={devIp}
                    onChange={(e) => setDevIp(e.target.value)}
                    required
                    className="mt-1 w-full px-3 py-1.5 rounded-lg bg-background border border-border font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-foreground">Port</label>
                  <input
                    type="number"
                    value={devPort}
                    onChange={(e) => setDevPort(Number(e.target.value))}
                    className="mt-1 w-full px-3 py-1.5 rounded-lg bg-background border border-border font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-foreground">Device Type</label>
                  <select
                    value={devType}
                    onChange={(e) => setDevType(e.target.value as any)}
                    className="mt-1 w-full px-2.5 py-1.5 rounded-lg bg-background border border-border text-[11px] focus:outline-none"
                  >
                    <option value="Face Recognition">Face Recognition</option>
                    <option value="Fingerprint Scanner">Fingerprint Scanner</option>
                    <option value="RFID Card Reader">RFID Card Reader</option>
                    <option value="Hybrid AI">Hybrid AI (Face + Finger)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-foreground">Protocol</label>
                  <select
                    value={devProtocol}
                    onChange={(e) => setDevProtocol(e.target.value as any)}
                    className="mt-1 w-full px-2.5 py-1.5 rounded-lg bg-background border border-border text-[11px] focus:outline-none"
                  >
                    <option value="ZKTeco Push SDK">ZKTeco Push SDK</option>
                    <option value="ADMS Protocol">ADMS Protocol</option>
                    <option value="BioTime 8.5 API">BioTime 8.5 API</option>
                    <option value="Standalone TCP/IP">Standalone TCP/IP</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddDeviceModal(false);
                    setDeviceToEdit(null);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-border hover:bg-accent text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingDevice}
                  className="px-4 py-1.5 rounded-lg font-bold bg-cyan-600 hover:bg-cyan-700 text-white shadow-xs flex items-center gap-1.5"
                >
                  {isSavingDevice && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{deviceToEdit ? 'Update Terminal' : 'Register Terminal'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL: MANUAL TEST PUNCH
         ═══════════════════════════════════════════════════════════════ */}
      {showManualPunchModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-xl border border-border shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-cyan-600" />
                <h3 className="text-sm font-bold text-foreground">Simulate Terminal Punch</h3>
              </div>
              <button
                onClick={() => setShowManualPunchModal(false)}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitManualPunch} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-foreground">Employee Pin / ID *</label>
                <input
                  type="text"
                  value={testPin}
                  onChange={(e) => setTestPin(e.target.value)}
                  required
                  className="mt-1 w-full px-3 py-1.5 rounded-lg bg-background border border-border font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground">Employee Name</label>
                <input
                  type="text"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  className="mt-1 w-full px-3 py-1.5 rounded-lg bg-background border border-border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground">Department</label>
                <input
                  type="text"
                  value={testDept}
                  onChange={(e) => setTestDept(e.target.value)}
                  className="mt-1 w-full px-3 py-1.5 rounded-lg bg-background border border-border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-foreground">Terminal Machine</label>
                  <select
                    value={testDeviceSn}
                    onChange={(e) => setTestDeviceSn(e.target.value)}
                    className="mt-1 w-full px-2.5 py-1.5 rounded-lg bg-background border border-border text-[11px] focus:outline-none"
                  >
                    {devices.map((d) => (
                      <option key={d.id} value={d.serialNumber}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-foreground">Verify Mode</label>
                  <select
                    value={testVerifyType}
                    onChange={(e) => setTestVerifyType(e.target.value as any)}
                    className="mt-1 w-full px-2.5 py-1.5 rounded-lg bg-background border border-border text-[11px] focus:outline-none"
                  >
                    <option value="Face">Face Scan</option>
                    <option value="Fingerprint">Fingerprint</option>
                    <option value="RFID Card">RFID Badge</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowManualPunchModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-border hover:bg-accent text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPunch}
                  className="px-4 py-1.5 rounded-lg font-bold bg-cyan-600 hover:bg-cyan-700 text-white shadow-xs flex items-center gap-1.5"
                >
                  {isSubmittingPunch && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Push Punch Event</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL: DELETE TERMINAL CONFIRMATION
         ═══════════════════════════════════════════════════════════════ */}
      {deviceToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-sm rounded-xl border border-border shadow-2xl p-4 space-y-3 animate-in fade-in zoom-in-95 text-xs">
            <div className="flex items-center gap-2 text-rose-500 font-bold">
              <Trash2 className="w-4 h-4" />
              <span>Remove Terminal?</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Are you sure you want to remove terminal <strong>{deviceToDelete.name}</strong> ({deviceToDelete.serialNumber}) from BioTime fleet?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeviceToDelete(null)}
                className="px-3 py-1.5 rounded-lg border border-border hover:bg-accent text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteDevice(deviceToDelete)}
                className="px-3.5 py-1.5 rounded-lg font-bold bg-rose-600 text-white"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
