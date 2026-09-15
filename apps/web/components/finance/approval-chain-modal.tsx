'use client';

import React from 'react';
import { X, CheckCircle2, Clock, AlertCircle, Shield, User } from 'lucide-react';
import { FinanceApprovalStep } from '@/lib/supabase-finance';

interface ApprovalChainModalProps {
  isOpen: boolean;
  onClose: () => void;
  approvalSteps: FinanceApprovalStep[];
  title?: string | undefined;
  expenseCode?: string | undefined;
}

export function ApprovalChainModal({
  isOpen,
  onClose,
  approvalSteps,
  title = 'Workflow Approval Chain',
  expenseCode,
}: ApprovalChainModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center space-x-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">{title}</h3>
              {expenseCode && (
                <p className="text-xs text-muted-foreground font-mono">Reference: {expenseCode}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Multi-tiered institutional review chain adhering to JAAGO Financial Delegation of Authority.
          </p>

          <div className="space-y-3 pt-2">
            {approvalSteps.map((step, idx) => {
              const isSigned = step.status === 'SIGNED';
              const isRejected = step.status === 'REJECTED';

              return (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isSigned
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : isRejected
                      ? 'border-rose-500/30 bg-rose-500/5'
                      : 'border-border bg-card hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start space-x-3 min-w-0">
                      <div
                        className={`h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                          isSigned
                            ? 'bg-emerald-500 text-white'
                            : isRejected
                            ? 'bg-rose-500 text-white'
                            : 'bg-muted text-muted-foreground border border-border'
                        }`}
                      >
                        {isSigned ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : isRejected ? (
                          <AlertCircle className="h-4 w-4" />
                        ) : (
                          <span>{step.stepNumber}</span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs font-bold text-foreground flex items-center space-x-2">
                          <span>{step.stepName}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground">
                            {step.approverRole}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center space-x-1.5 pt-0.5">
                          <User className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{step.approverName}</span>
                        </div>
                        {step.comments && (
                          <p className="text-[11px] text-muted-foreground/90 italic pt-1 bg-background/50 px-2 py-1 rounded border border-border/50 mt-1">
                            &ldquo;{step.comments}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end flex-shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isSigned
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : isRejected
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {step.status}
                      </span>
                      {step.signedAt && (
                        <span className="text-[10px] text-muted-foreground pt-1 flex items-center space-x-1">
                          <Clock className="h-2.5 w-2.5" />
                          <span>{new Date(step.signedAt).toLocaleDateString()}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-muted/20 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
