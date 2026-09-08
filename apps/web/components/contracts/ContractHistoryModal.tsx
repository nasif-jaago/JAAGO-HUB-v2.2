'use client';

import React from 'react';
import {
  X,
  History,
  FileText,
  ArrowRight,
} from 'lucide-react';
import {
  EmploymentContractVersion,
  deriveContractStatus,
} from '@/lib/contracts-engine';

interface ContractHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeName: string;
  employeeCode: string;
  versions: EmploymentContractVersion[];
  onSelectVersionForDoc: (version: EmploymentContractVersion) => void;
  onAmendVersion: (version: EmploymentContractVersion) => void;
  asOfDate: string;
}

export function ContractHistoryModal({
  isOpen,
  onClose,
  employeeName,
  employeeCode,
  versions,
  onSelectVersionForDoc,
  onAmendVersion,
  asOfDate,
}: ContractHistoryModalProps) {
  if (!isOpen) return null;

  // Sort versions by effective date descending
  const sorted = [...versions].sort((a, b) =>
    b.effectiveDate.localeCompare(a.effectiveDate)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-card border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-md border-b border-border p-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 font-black">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-foreground">
                Contract Version History
              </h2>
              <p className="text-xs text-muted-foreground">
                {employeeName} • <span className="font-mono">{employeeCode}</span> ({versions.length} version{versions.length !== 1 ? 's' : ''})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Timeline Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 no-scrollbar">
          <div className="relative border-l-2 border-border ml-4 space-y-6 pl-6">
            {sorted.map((version, index) => {
              const status = deriveContractStatus(version, asOfDate);
              const isLatest = index === 0;

              return (
                <div key={version.id} className="relative group">
                  {/* Timeline Dot Indicator */}
                  <div
                    className={`absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 bg-card ${
                      isLatest
                        ? 'border-amber-500 ring-4 ring-amber-500/20'
                        : 'border-muted-foreground/50'
                    }`}
                  />

                  {/* Card */}
                  <div className="p-4 rounded-xl bg-muted/40 border border-border hover:border-amber-500/40 transition space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-foreground">
                          {version.contractNo}
                        </span>
                        {isLatest && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                            Current Active Version
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            status === 'Active'
                              ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                              : status === 'Expiring'
                              ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                              : status === 'Upcoming'
                              ? 'bg-sky-500/15 text-sky-500 border border-sky-500/30'
                              : 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                          }`}
                        >
                          {status}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                          Contract Type
                        </span>
                        <span className="font-bold text-foreground">
                          {version.contractType}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                          Schedule
                        </span>
                        <span className="font-bold text-foreground">
                          {version.workingSchedule}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                          Effective Date
                        </span>
                        <span className="font-bold text-amber-500 font-mono">
                          {version.effectiveDate}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                          Contract Window
                        </span>
                        <span className="font-bold text-foreground font-mono">
                          {version.startDate} → {version.endDate || 'Permanent'}
                        </span>
                      </div>
                    </div>

                    {version.notes && (
                      <p className="text-[11px] text-muted-foreground bg-muted/30 p-2 rounded-lg italic">
                        &ldquo;{version.notes}&rdquo;
                      </p>
                    )}

                    <div className="pt-2 border-t border-border flex items-center justify-end space-x-2">
                      <button
                        onClick={() => {
                          onSelectVersionForDoc(version);
                          onClose();
                        }}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-muted hover:bg-muted/80 text-foreground transition"
                      >
                        <FileText className="h-3.5 w-3.5 text-amber-500" />
                        <span>View Document</span>
                      </button>

                      {isLatest && (
                        <button
                          onClick={() => {
                            onAmendVersion(version);
                            onClose();
                          }}
                          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-black bg-amber-500/15 hover:bg-amber-500/25 text-amber-500 border border-amber-500/30 transition"
                        >
                          <ArrowRight className="h-3.5 w-3.5" />
                          <span>Amend New Version</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
