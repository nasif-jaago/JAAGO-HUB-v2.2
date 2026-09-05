'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Star,
  Plus,
  CheckCircle2,
  Clock,
  TrendingUp,
  Kanban,
  Send,
  X,
  Edit2,
  Trash2,
  Award,
  MessageSquare,
} from 'lucide-react';
import {
  PerformanceKPI,
  KanbanTaskLog,
  KPIStatus,
  TaskStatus,
  TaskPriority,
  getLocalKPIs,
  saveLocalKPI,
  deleteLocalKPI,
  getLocalTasks,
  saveLocalTask,
  updateTaskStatus,
  deleteLocalTask,
} from '@/lib/performance-kpi';
import { getActiveEmployeeProfile } from '@/lib/user-profile-sync';

export default function PerformanceAppraisalPage() {
  const [activeTab, setActiveTab] = useState<'KPIS' | 'KANBAN'>('KPIS');
  const [kpis, setKpis] = useState<PerformanceKPI[]>([]);
  const [tasks, setTasks] = useState<KanbanTaskLog[]>([]);
  const [currentUser, setCurrentUser] = useState({
    name: 'Nasif Kamal',
    code: 'FO032507061190',
    department: "Founder's Office / FC",
    supervisor: 'Korvi Rakshand (Founder & ED)',
  });

  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Modals
  const [showKpiModal, setShowKpiModal] = useState(false);
  const [editingKpi, setEditingKpi] = useState<PerformanceKPI | null>(null);
  const [kpiFormData, setKpiFormData] = useState<Partial<PerformanceKPI>>({
    title: '',
    category: 'Operational Excellence',
    description: '',
    targetMetric: '',
    currentProgress: 0,
    weightage: 25,
    period: 'Q3 2026',
  });

  // KPI Approval Modal
  const [approvalModalKpi, setApprovalModalKpi] = useState<PerformanceKPI | null>(null);
  const [approvalDecision, setApprovalDecision] = useState<'Approved' | 'Needs Revision'>('Approved');
  const [approvalComment, setApprovalComment] = useState('');
  const [approvalRating, setApprovalRating] = useState<number>(5);

  // Task Modal
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<KanbanTaskLog | null>(null);
  const [taskFormData, setTaskFormData] = useState<Partial<KanbanTaskLog>>({
    title: '',
    description: '',
    priority: 'Medium',
    status: 'todo',
    dueDate: new Date().toISOString().slice(0, 10),
    estimatedHours: 4,
    kpiId: '',
  });

  const loadData = () => {
    setKpis(getLocalKPIs());
    setTasks(getLocalTasks());
  };

  useEffect(() => {
    getActiveEmployeeProfile().then((emp) => {
      if (emp) {
        setCurrentUser({
          name: emp.name,
          code: emp.code,
          department: emp.department || "Founder's Office / FC",
          supervisor: emp.supervisor || 'Founder & Executive Director',
        });
      }
    });

    loadData();

    window.addEventListener('jaago_kpi_updated', loadData);
    window.addEventListener('jaago_task_updated', loadData);
    return () => {
      window.removeEventListener('jaago_kpi_updated', loadData);
      window.removeEventListener('jaago_task_updated', loadData);
    };
  }, []);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // KPI Handlers
  const handleOpenNewKpi = () => {
    setEditingKpi(null);
    setKpiFormData({
      title: '',
      category: 'Operational Excellence',
      description: '',
      targetMetric: '',
      currentProgress: 0,
      weightage: 25,
      period: 'Q3 2026',
    });
    setShowKpiModal(true);
  };

  const handleOpenEditKpi = (kpi: PerformanceKPI) => {
    setEditingKpi(kpi);
    setKpiFormData({ ...kpi });
    setShowKpiModal(true);
  };

  const handleSaveKpi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kpiFormData.title?.trim()) {
      showToast('Please enter a KPI title', 'error');
      return;
    }

    const payload: PerformanceKPI = {
      id: editingKpi?.id || `kpi-${Date.now()}`,
      employeeCode: currentUser.code,
      employeeName: currentUser.name,
      department: currentUser.department,
      period: kpiFormData.period || 'Q3 2026',
      title: kpiFormData.title.trim(),
      category: (kpiFormData.category as any) || 'Operational Excellence',
      description: kpiFormData.description?.trim() || '',
      targetMetric: kpiFormData.targetMetric?.trim() || '',
      currentProgress: Number(kpiFormData.currentProgress || 0),
      weightage: Number(kpiFormData.weightage || 25),
      status: editingKpi?.status || 'Draft',
      supervisorName: currentUser.supervisor,
      createdAt: editingKpi?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveLocalKPI(payload);
    setShowKpiModal(false);
    showToast(editingKpi ? 'KPI Objective updated successfully' : 'New KPI added to your appraisal set');
  };

  const handleSubmitKpiForReview = (kpi: PerformanceKPI) => {
    const updated: PerformanceKPI = {
      ...kpi,
      status: 'Submitted',
      updatedAt: new Date().toISOString(),
    };
    saveLocalKPI(updated);
    showToast(`KPI "${kpi.title}" submitted to ${currentUser.supervisor} for approval!`);
  };

  const handleOpenApprovalModal = (kpi: PerformanceKPI) => {
    setApprovalModalKpi(kpi);
    setApprovalDecision('Approved');
    setApprovalComment(kpi.supervisorComments || 'Approved based on target metric deliverables.');
    setApprovalRating(kpi.ratingScore || 5);
  };

  const handleExecuteApproval = () => {
    if (!approvalModalKpi) return;
    const updated: PerformanceKPI = {
      ...approvalModalKpi,
      status: approvalDecision,
      supervisorComments: approvalComment.trim(),
      ratingScore: approvalRating,
      approvedAt: approvalDecision === 'Approved' ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString(),
    };
    saveLocalKPI(updated);
    setApprovalModalKpi(null);
    showToast(
      approvalDecision === 'Approved'
        ? `KPI approved successfully with a ${approvalRating}★ rating!`
        : `Feedback returned: KPI marked as Needs Revision`,
      approvalDecision === 'Approved' ? 'success' : 'info'
    );
  };

  const handleDeleteKpi = (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete KPI "${title}"?`)) return;
    deleteLocalKPI(id);
    showToast('KPI objective deleted successfully');
  };

  // Task Handlers
  const handleOpenNewTask = (status: TaskStatus = 'todo') => {
    setEditingTask(null);
    setTaskFormData({
      title: '',
      description: '',
      priority: 'Medium',
      status,
      dueDate: new Date().toISOString().slice(0, 10),
      estimatedHours: 4,
      kpiId: kpis[0]?.id || '',
    });
    setShowTaskModal(true);
  };

  const handleOpenEditTask = (task: KanbanTaskLog) => {
    setEditingTask(task);
    setTaskFormData({ ...task });
    setShowTaskModal(true);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskFormData.title?.trim()) {
      showToast('Please enter a task title', 'error');
      return;
    }

    const linkedKpi = kpis.find((k) => k.id === taskFormData.kpiId);

    const payload: KanbanTaskLog = {
      id: editingTask?.id || `task-${Date.now()}`,
      employeeCode: currentUser.code,
      employeeName: currentUser.name,
      department: currentUser.department,
      kpiId: taskFormData.kpiId,
      kpiTitle: linkedKpi?.title,
      title: taskFormData.title.trim(),
      description: taskFormData.description?.trim(),
      priority: (taskFormData.priority as TaskPriority) || 'Medium',
      status: (taskFormData.status as TaskStatus) || 'todo',
      dueDate: taskFormData.dueDate || new Date().toISOString().slice(0, 10),
      estimatedHours: Number(taskFormData.estimatedHours || 0),
      actualHours: Number(taskFormData.actualHours || 0),
      assignedBy: editingTask?.assignedBy || currentUser.supervisor || 'Self',
      tags: editingTask?.tags || ['Task'],
      createdAt: editingTask?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveLocalTask(payload);
    setShowTaskModal(false);
    showToast(editingTask ? 'Task log updated' : 'New task log added to Kanban board');
  };

  const handleMoveTaskStatus = (taskId: string, newStatus: TaskStatus) => {
    updateTaskStatus(taskId, newStatus);
    showToast(`Task moved to ${newStatus.replace('_', ' ').toUpperCase()}`);
  };

  const handleDeleteTask = (taskId: string) => {
    deleteLocalTask(taskId);
    showToast('Task log removed');
  };

  // Aggregated Stats
  const totalWeightage = kpis.reduce((acc, k) => acc + (k.weightage || 0), 0);
  const approvedKpisCount = kpis.filter((k) => k.status === 'Approved').length;
  const avgProgress = kpis.length > 0 ? Math.round(kpis.reduce((acc, k) => acc + k.currentProgress, 0) / kpis.length) : 0;
  const completedTasksCount = tasks.filter((t) => t.status === 'done').length;

  const KANBAN_COLUMNS: { id: TaskStatus; title: string; color: string; badge: string }[] = [
    { id: 'todo', title: 'To Do / Backlog', color: 'border-slate-500/40 bg-slate-500/5', badge: 'bg-slate-500/20 text-slate-400' },
    { id: 'in_progress', title: 'In Progress', color: 'border-amber-500/40 bg-amber-500/5', badge: 'bg-amber-500/20 text-amber-500' },
    { id: 'review', title: 'Under Review', color: 'border-blue-500/40 bg-blue-500/5', badge: 'bg-blue-500/20 text-blue-400' },
    { id: 'done', title: 'Completed', color: 'border-emerald-500/40 bg-emerald-500/5', badge: 'bg-emerald-500/20 text-emerald-400' },
  ];

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'Urgent':
        return 'bg-rose-500/15 border-rose-500/30 text-rose-400';
      case 'High':
        return 'bg-amber-500/15 border-amber-500/30 text-amber-400';
      case 'Medium':
        return 'bg-blue-500/15 border-blue-500/30 text-blue-400';
      case 'Low':
      default:
        return 'bg-slate-500/15 border-slate-500/30 text-slate-400';
    }
  };

  const getKpiStatusBadge = (status: KPIStatus) => {
    switch (status) {
      case 'Approved':
        return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400';
      case 'Submitted':
        return 'bg-blue-500/15 border-blue-500/30 text-blue-400';
      case 'Needs Revision':
        return 'bg-rose-500/15 border-rose-500/30 text-rose-400';
      case 'Draft':
      default:
        return 'bg-slate-500/15 border-slate-500/30 text-slate-400';
    }
  };

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-200">
      {/* Toast */}
      {toastMsg && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl text-xs font-bold shadow-2xl flex items-center space-x-2 animate-in slide-in-from-top-2 ${
            toastMsg.type === 'error'
              ? 'bg-rose-600 text-white'
              : toastMsg.type === 'info'
              ? 'bg-blue-600 text-white'
              : 'bg-emerald-600 text-white'
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-muted-foreground">
            <Link href="/dashboard" className="hover:text-primary transition cursor-pointer">
              Organization
            </Link>
            <span>/</span>
            <span className="text-foreground font-bold">Performance &amp; Appraisal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center space-x-3 mt-1">
            <span>KPI Set &amp; Task Logs</span>
            <span className="px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 text-xs font-mono font-bold">
              Q3 2026 Appraisal Cycle
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            Goal tracking, supervisor approval review workflows, and agile Kanban task execution board.
          </p>
        </div>

        {/* Mode Switcher + Action Button */}
        <div className="flex items-center space-x-2.5">
          <div className="flex items-center bg-card border border-border/80 rounded-2xl p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setActiveTab('KPIS')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition cursor-pointer flex items-center space-x-2 ${
                activeTab === 'KPIS'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Award className="h-4 w-4" />
              <span>KPIs ({kpis.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('KANBAN')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition cursor-pointer flex items-center space-x-2 ${
                activeTab === 'KANBAN'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Kanban className="h-4 w-4" />
              <span>Kanban Tasks ({tasks.length})</span>
            </button>
          </div>

          {activeTab === 'KPIS' ? (
            <button
              type="button"
              onClick={handleOpenNewKpi}
              className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-black text-xs uppercase tracking-wider transition flex items-center space-x-2 shadow-lg shadow-amber-500/20 cursor-pointer active:scale-95 flex-shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>ADD KPI</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleOpenNewTask('todo')}
              className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-black text-xs uppercase tracking-wider transition flex items-center space-x-2 shadow-lg shadow-amber-500/20 cursor-pointer active:scale-95 flex-shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>NEW TASK</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Overview Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm flex items-center space-x-3.5">
          <div className="h-11 w-11 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center font-black flex-shrink-0">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-black text-foreground font-mono">{kpis.length} Goals</div>
            <div className="text-[11px] font-bold text-muted-foreground uppercase">{totalWeightage}% Total Weight</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm flex items-center space-x-3.5">
          <div className="h-11 w-11 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center font-black flex-shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-black text-emerald-500 font-mono">{approvedKpisCount} Approved</div>
            <div className="text-[11px] font-bold text-muted-foreground uppercase">By Supervisor</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm flex items-center space-x-3.5">
          <div className="h-11 w-11 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center font-black flex-shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-black text-blue-400 font-mono">{avgProgress}%</div>
            <div className="text-[11px] font-bold text-muted-foreground uppercase">Average Progress</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm flex items-center space-x-3.5">
          <div className="h-11 w-11 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center font-black flex-shrink-0">
            <Kanban className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-black text-purple-400 font-mono">{completedTasksCount} / {tasks.length}</div>
            <div className="text-[11px] font-bold text-muted-foreground uppercase">Tasks Completed</div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── TAB 1: KPIS & APPROVALS VIEW ────────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'KPIS' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {kpis.map((kpi) => {
              const statusBadge = getKpiStatusBadge(kpi.status);
              const isApproved = kpi.status === 'Approved';

              return (
                <div
                  key={kpi.id}
                  className="rounded-3xl bg-card border border-border/80 p-5 space-y-4 shadow-sm hover:shadow-md transition relative group"
                >
                  {/* Top Category & Status Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 font-bold text-xs">
                        {kpi.category}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-surface border border-border text-[11px] font-mono font-bold text-muted-foreground">
                        Weight: {kpi.weightage}%
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={`px-2.5 py-0.5 rounded-lg border font-bold text-xs ${statusBadge}`}>
                        {kpi.status}
                      </span>
                      {kpi.ratingScore && (
                        <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-500 font-bold text-xs flex items-center space-x-1">
                          <Star className="h-3 w-3 fill-amber-500" />
                          <span>{kpi.ratingScore}.0</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-foreground text-sm group-hover:text-amber-500 transition">
                      {kpi.title}
                    </h3>
                    <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                      {kpi.description}
                    </p>
                  </div>

                  {/* Target Metric Box */}
                  <div className="p-3 rounded-2xl bg-surface/50 border border-border/60 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase">Target Metric:</span>
                      <span className="font-bold text-foreground text-[11px]">{kpi.targetMetric}</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-muted-foreground font-medium">Achievement Progress</span>
                        <span className="font-bold text-amber-500">{kpi.currentProgress}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-surface border border-border overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-500"
                          style={{ width: `${Math.min(100, kpi.currentProgress)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Supervisor Review Comments (If Approved or Needs Revision) */}
                  {kpi.supervisorComments && (
                    <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-xs space-y-1">
                      <div className="flex items-center space-x-1.5 text-[11px] font-bold text-amber-500">
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>Supervisor Review ({kpi.supervisorName || currentUser.supervisor}):</span>
                      </div>
                      <p className="text-foreground/90 italic text-[11px]">&ldquo;{kpi.supervisorComments}&rdquo;</p>
                    </div>
                  )}

                  {/* Footer Actions: Submit / Approve / Edit / Delete */}
                  <div className="pt-2 flex items-center justify-between gap-2 border-t border-border/60">
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEditKpi(kpi)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition cursor-pointer"
                        title="Edit KPI"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteKpi(kpi.id, kpi.title)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                        title="Delete KPI"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center space-x-2">
                      {kpi.status === 'Draft' && (
                        <button
                          type="button"
                          onClick={() => handleSubmitKpiForReview(kpi)}
                          className="px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/30 text-xs font-bold uppercase tracking-wider transition flex items-center space-x-1 cursor-pointer"
                        >
                          <Send className="h-3 w-3" />
                          <span>Submit for Review</span>
                        </button>
                      )}

                      {/* Manager / Supervisor Approval Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenApprovalModal(kpi)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 text-xs font-bold uppercase tracking-wider transition flex items-center space-x-1 cursor-pointer active:scale-95"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>{isApproved ? 'Update Score' : 'Supervisor Approve'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {kpis.length === 0 && (
            <div className="p-12 text-center rounded-3xl bg-card border border-border text-muted-foreground">
              <Award className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <h3 className="font-bold text-foreground text-sm">No KPIs configured for this appraisal cycle</h3>
              <p className="text-xs mt-1">Click &quot;+ ADD KPI&quot; above to set your performance goals.</p>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── TAB 2: KANBAN TASK LOGS BOARD ────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'KANBAN' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {KANBAN_COLUMNS.map((col) => {
            const columnTasks = tasks.filter((t) => t.status === col.id);

            return (
              <div
                key={col.id}
                className={`rounded-3xl border p-4 space-y-3.5 min-h-[500px] flex flex-col justify-between ${col.color}`}
              >
                {/* Column Header */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-border/50">
                    <h3 className="font-black text-xs uppercase tracking-wider text-foreground">
                      {col.title}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full font-mono font-bold text-xs ${col.badge}`}>
                      {columnTasks.length}
                    </span>
                  </div>

                  {/* Task Cards Stack */}
                  <div className="space-y-3">
                    {columnTasks.map((task) => {
                      const priorityClass = getPriorityBadge(task.priority);

                      return (
                        <div
                          key={task.id}
                          className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs hover:shadow-md transition space-y-3 group"
                        >
                          {/* Priority + Actions */}
                          <div className="flex items-center justify-between">
                            <span className={`px-2 py-0.5 rounded-md border font-bold text-[10px] ${priorityClass}`}>
                              {task.priority} Priority
                            </span>

                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition">
                              <button
                                type="button"
                                onClick={() => handleOpenEditTask(task)}
                                className="p-1 rounded text-muted-foreground hover:text-foreground"
                                title="Edit Task"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTask(task.id)}
                                className="p-1 rounded text-muted-foreground hover:text-rose-500"
                                title="Delete Task"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>

                          {/* Title & Description */}
                          <div className="space-y-1">
                            <h4 className="font-extrabold text-foreground text-xs leading-snug group-hover:text-amber-500 transition">
                              {task.title}
                            </h4>
                            {task.description && (
                              <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                                {task.description}
                              </p>
                            )}
                          </div>

                          {/* Linked KPI Tag */}
                          {task.kpiTitle && (
                            <div className="px-2 py-1 rounded-lg bg-surface border border-border/60 text-[10px] font-medium text-amber-500 truncate" title={task.kpiTitle}>
                              KPI: {task.kpiTitle}
                            </div>
                          )}

                          {/* Footer Info & Move Dropdown */}
                          <div className="pt-2 flex items-center justify-between gap-1 border-t border-border/60 text-[11px]">
                            <div className="flex items-center space-x-1 font-mono text-muted-foreground text-[10px]">
                              <Clock className="h-3 w-3" />
                              <span>{task.dueDate}</span>
                            </div>

                            {/* Quick Move Selector */}
                            <select
                              value={task.status}
                              onChange={(e) => handleMoveTaskStatus(task.id, e.target.value as TaskStatus)}
                              className="text-[10px] font-bold py-0.5 px-1.5 rounded-lg bg-surface border border-border text-foreground cursor-pointer focus:outline-none"
                            >
                              <option value="todo">To Do</option>
                              <option value="in_progress">In Progress</option>
                              <option value="review">Review</option>
                              <option value="done">Done</option>
                            </select>
                          </div>
                        </div>
                      );
                    })}

                    {columnTasks.length === 0 && (
                      <div className="p-6 text-center text-muted-foreground/60 text-xs italic border border-dashed border-border/60 rounded-2xl">
                        No tasks in this lane
                      </div>
                    )}
                  </div>
                </div>

                {/* Add task button at bottom of lane */}
                <button
                  type="button"
                  onClick={() => handleOpenNewTask(col.id)}
                  className="w-full py-2 rounded-xl bg-surface/70 hover:bg-surface border border-dashed border-border text-muted-foreground hover:text-foreground text-xs font-bold transition flex items-center justify-center space-x-1 cursor-pointer mt-2"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Task</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── MODAL: CREATE / EDIT KPI OBJECTIVE ───────────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {showKpiModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl bg-card border border-border shadow-2xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <h3 className="text-lg font-black text-foreground">
                {editingKpi ? 'Edit KPI Objective' : 'Add KPI Objective'}
              </h3>
              <button
                type="button"
                onClick={() => setShowKpiModal(false)}
                className="p-1 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveKpi} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  KPI Title <span className="text-amber-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={kpiFormData.title || ''}
                  onChange={(e) => setKpiFormData({ ...kpiFormData, title: e.target.value })}
                  placeholder="e.g. Platform Digital Transformation & Biometric Sync"
                  className="w-full h-10 px-3.5 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Category
                  </label>
                  <select
                    value={kpiFormData.category || 'Operational Excellence'}
                    onChange={(e) => setKpiFormData({ ...kpiFormData, category: e.target.value as any })}
                    className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="Operational Excellence">Operational Excellence</option>
                    <option value="Project Delivery">Project Delivery</option>
                    <option value="Community & Stakeholder Impact">Community &amp; Stakeholder Impact</option>
                    <option value="Innovation & Growth">Innovation &amp; Growth</option>
                    <option value="Leadership & Culture">Leadership &amp; Culture</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Weightage (%)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={kpiFormData.weightage || 25}
                    onChange={(e) => setKpiFormData({ ...kpiFormData, weightage: Number(e.target.value) })}
                    className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Target Deliverable / Success Metric
                </label>
                <input
                  type="text"
                  value={kpiFormData.targetMetric || ''}
                  onChange={(e) => setKpiFormData({ ...kpiFormData, targetMetric: e.target.value })}
                  placeholder="e.g. 100% uptime and < 50ms sync latency"
                  className="w-full h-10 px-3.5 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Current Achievement Progress (%: 0 - 100)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={kpiFormData.currentProgress || 0}
                  onChange={(e) => setKpiFormData({ ...kpiFormData, currentProgress: Number(e.target.value) })}
                  className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Description &amp; Action Plan
                </label>
                <textarea
                  rows={3}
                  value={kpiFormData.description || ''}
                  onChange={(e) => setKpiFormData({ ...kpiFormData, description: e.target.value })}
                  placeholder="Key milestones, deliverables, and implementation strategies..."
                  className="w-full p-3 rounded-xl bg-surface border border-border text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-border/70">
                <button
                  type="button"
                  onClick={() => setShowKpiModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-surface text-muted-foreground text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md transition cursor-pointer"
                >
                  Save KPI
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── MODAL: SUPERVISOR APPROVAL & SCORING ─────────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {approvalModalKpi && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-card border border-border shadow-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <h3 className="text-lg font-black text-foreground">
                Supervisor Appraisal &amp; Approval
              </h3>
              <button
                type="button"
                onClick={() => setApprovalModalKpi(null)}
                className="p-1 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-surface/50 border border-border/60 space-y-1 text-xs">
              <div className="font-extrabold text-foreground">{approvalModalKpi.title}</div>
              <div className="text-[11px] text-muted-foreground">
                Weight: {approvalModalKpi.weightage}% &bull; Current Progress: {approvalModalKpi.currentProgress}%
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Approval Decision
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setApprovalDecision('Approved')}
                    className={`py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition border ${
                      approvalDecision === 'Approved'
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'bg-surface border-border text-muted-foreground'
                    }`}
                  >
                    Approve Goal
                  </button>
                  <button
                    type="button"
                    onClick={() => setApprovalDecision('Needs Revision')}
                    className={`py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition border ${
                      approvalDecision === 'Needs Revision'
                        ? 'bg-rose-500 text-white border-rose-500'
                        : 'bg-surface border-border text-muted-foreground'
                    }`}
                  >
                    Request Revision
                  </button>
                </div>
              </div>

              {approvalDecision === 'Approved' && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Rating Score (1 - 5 Stars)
                  </label>
                  <div className="flex items-center space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setApprovalRating(star)}
                        className={`p-2 rounded-xl border transition ${
                          approvalRating >= star
                            ? 'bg-amber-500/20 border-amber-500 text-amber-500'
                            : 'bg-surface border-border text-muted-foreground'
                        }`}
                      >
                        <Star className={`h-4 w-4 ${approvalRating >= star ? 'fill-amber-500' : ''}`} />
                      </button>
                    ))}
                    <span className="font-bold text-foreground text-xs ml-2">{approvalRating}.0 Stars</span>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Supervisor Feedback &amp; Review Remarks
                </label>
                <textarea
                  rows={3}
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  placeholder="Enter detailed evaluation remarks..."
                  className="w-full p-3 rounded-xl bg-surface border border-border text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-border/70">
              <button
                type="button"
                onClick={() => setApprovalModalKpi(null)}
                className="px-4 py-2.5 rounded-xl bg-surface text-muted-foreground text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteApproval}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-md transition"
              >
                Submit Decision
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── MODAL: CREATE / EDIT KANBAN TASK ─────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-card border border-border shadow-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <h3 className="text-lg font-black text-foreground">
                {editingTask ? 'Edit Task Log' : 'Add Kanban Task Log'}
              </h3>
              <button
                type="button"
                onClick={() => setShowTaskModal(false)}
                className="p-1 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Task Title <span className="text-amber-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={taskFormData.title || ''}
                  onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                  placeholder="e.g. BioTime TCP Heartbeat Keepalive Monitor"
                  className="w-full h-10 px-3.5 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Aligned KPI (Optional)
                </label>
                <select
                  value={taskFormData.kpiId || ''}
                  onChange={(e) => setTaskFormData({ ...taskFormData, kpiId: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                >
                  <option value="">-- General Operational Task (No KPI) --</option>
                  {kpis.map((k) => (
                    <option key={k.id} value={k.id}>
                      [{k.category}] {k.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Priority
                  </label>
                  <select
                    value={taskFormData.priority || 'Medium'}
                    onChange={(e) => setTaskFormData({ ...taskFormData, priority: e.target.value as any })}
                    className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="Low">Low Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="High">High Priority</option>
                    <option value="Urgent">Urgent Priority</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={taskFormData.dueDate || ''}
                    onChange={(e) => setTaskFormData({ ...taskFormData, dueDate: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={taskFormData.description || ''}
                  onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                  placeholder="Specific tasks, actions, and milestones..."
                  className="w-full p-3 rounded-xl bg-surface border border-border text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-border/70">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-surface text-muted-foreground text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md transition"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
