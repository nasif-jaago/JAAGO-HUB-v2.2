'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  X,
  UserX,
  Pencil,
  CornerDownLeft,
  Unlink,
} from 'lucide-react';
import type { FullEmployeeProfile } from '@/lib/supabase-employees';

function getSafeInitials(name?: string | null): string {
  if (!name || typeof name !== 'string') return 'EM';
  const trimmed = name.trim();
  if (!trimmed) return 'EM';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'EM';
  if (parts.length === 1) {
    const firstWord = parts[0] || '';
    return firstWord.slice(0, 2).toUpperCase() || 'EM';
  }
  const firstChar = parts[0]?.[0] || '';
  const lastChar = parts[parts.length - 1]?.[0] || '';
  return ((firstChar + lastChar).toUpperCase()) || 'EM';
}

function countAlphabets(text?: string | null): number {
  if (!text || typeof text !== 'string') return 0;
  return text.replace(/[^a-zA-Z0-9]/g, '').length;
}

export interface BioTimeEmployeeComboboxProps {
  biotimeEmpCode: string;
  biotimeName?: string | undefined;
  currentHubCode?: string | null | undefined;
  currentHubName?: string | undefined;
  currentHubDesignation?: string | undefined;
  currentHubDepartment?: string | undefined;
  employees: FullEmployeeProfile[];
  isSaving: boolean;
  onSave: (biotimeEmpCode: string, hubEmployeeCode: string) => void;
  onActiveChange?: ((isActive: boolean) => void) | undefined;
}

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

export function BioTimeEmployeeCombobox({
  biotimeEmpCode,
  biotimeName,
  currentHubCode,
  currentHubName,
  currentHubDesignation,
  currentHubDepartment,
  employees,
  isSaving,
  onSave,
  onActiveChange,
}: BioTimeEmployeeComboboxProps) {
  const [mounted, setMounted] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(!currentHubCode);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const [dropdownPos, setDropdownPos] = useState<DropdownPosition>({
    top: 0,
    left: 0,
    width: 320,
    maxHeight: 260,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync editing state if currentHubCode changes externally
  useEffect(() => {
    if (currentHubCode) {
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  }, [currentHubCode]);

  // Find linked profile
  const matchedEmp = useMemo(() => {
    if (!currentHubCode) return null;
    return employees.find((e) => e.code === currentHubCode) || null;
  }, [employees, currentHubCode]);

  const displayName = matchedEmp?.name || currentHubName || currentHubCode || '';
  const displayCode = matchedEmp?.code || currentHubCode || '';
  const displayDesignation = matchedEmp?.designation || currentHubDesignation || '';
  const displayDepartment = matchedEmp?.department || currentHubDepartment || '';

  // 3-alphabet requirement calculations
  const letterCount = countAlphabets(searchQuery);
  const hasThreeAlphabets = letterCount >= 3;

  // Filter employees only when >= 3 alphabets are typed
  const suggestions = useMemo(() => {
    if (!hasThreeAlphabets) return [];
    const q = searchQuery.toLowerCase().trim();
    return employees.filter((emp) => {
      const name = (emp.name || '').toLowerCase();
      const code = (emp.code || '').toLowerCase();
      const dept = (emp.department || '').toLowerCase();
      const desig = (emp.designation || '').toLowerCase();
      return name.includes(q) || code.includes(q) || dept.includes(q) || desig.includes(q);
    });
  }, [employees, searchQuery, hasThreeAlphabets]);

  // Calculate precise fixed position for portal dropdown
  const updateDropdownPos = useCallback(() => {
    if (typeof window === 'undefined' || !inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const desiredHeight = 260;
    const shouldOpenUpward = spaceBelow < desiredHeight && rect.top > desiredHeight;

    const top = shouldOpenUpward
      ? Math.max(10, rect.top - desiredHeight - 6)
      : rect.bottom + 6;

    const maxHeight = shouldOpenUpward
      ? Math.min(260, rect.top - 16)
      : Math.min(260, spaceBelow - 16);

    setDropdownPos({
      top,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 360)),
      width: Math.max(rect.width, 340),
      maxHeight: Math.max(120, maxHeight),
    });
  }, []);

  // Update position on scroll or resize
  useEffect(() => {
    if (!isDropdownOpen) return;
    updateDropdownPos();

    const handleScrollOrResize = () => {
      updateDropdownPos();
    };

    window.addEventListener('resize', handleScrollOrResize, { passive: true });
    window.addEventListener('scroll', handleScrollOrResize, { passive: true, capture: true });

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, { capture: true });
    };
  }, [isDropdownOpen, updateDropdownPos]);

  // Click outside to close dropdown
  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsDropdownOpen(false);
        onActiveChange?.(false);
        if (currentHubCode) {
          setIsEditing(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen, currentHubCode, onActiveChange]);

  const handleSelect = (code: string) => {
    setIsDropdownOpen(false);
    setIsEditing(false);
    setSearchQuery('');
    onActiveChange?.(false);
    onSave(biotimeEmpCode, code);
  };

  const handleUnlink = () => {
    setIsDropdownOpen(false);
    setIsEditing(false);
    setSearchQuery('');
    onActiveChange?.(false);
    onSave(biotimeEmpCode, '');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isDropdownOpen) {
        setIsDropdownOpen(true);
        updateDropdownPos();
      } else if (suggestions.length > 0) {
        setHighlightedIndex((prev) => (prev + 1) % Math.min(suggestions.length, 25));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setHighlightedIndex(
          (prev) => (prev - 1 + Math.min(suggestions.length, 25)) % Math.min(suggestions.length, 25)
        );
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (hasThreeAlphabets && suggestions.length > 0) {
        const picked = suggestions[highlightedIndex] || suggestions[0];
        if (picked?.code) {
          handleSelect(picked.code);
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsDropdownOpen(false);
      onActiveChange?.(false);
      if (currentHubCode) {
        setIsEditing(false);
      }
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 1: Linked / Mapped State (Compact Employee Pill)
  // ──────────────────────────────────────────────────────────────────────────
  if (currentHubCode && !isEditing) {
    return (
      <div className="flex items-center justify-between gap-2 py-1 px-2.5 rounded-lg bg-muted/40 hover:bg-muted/70 border border-border/70 transition-all w-full max-w-sm group">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center text-[9px] shrink-0">
            {getSafeInitials(displayName)}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-foreground text-xs truncate flex items-center gap-1.5">
              <span className="truncate">{displayName}</span>
              <span className="text-[10px] font-mono text-muted-foreground/80 shrink-0">
                ({displayCode})
              </span>
            </div>
            {(displayDesignation || displayDepartment) && (
              <div className="text-[10px] text-muted-foreground truncate">
                {[displayDesignation, displayDepartment].filter(Boolean).join(' • ')}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => {
              setIsEditing(true);
              setSearchQuery('');
              setIsDropdownOpen(true);
              onActiveChange?.(true);
              setTimeout(() => {
                inputRef.current?.focus();
                updateDropdownPos();
              }, 50);
            }}
            className="px-2 py-0.5 rounded text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 transition cursor-pointer flex items-center gap-1"
            title="Change mapped HUB employee"
          >
            <Pencil className="w-2.5 h-2.5" />
            <span>Change</span>
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleUnlink}
            className="p-1 rounded text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
            title="Unlink / Quarantine mapping"
          >
            <Unlink className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 2: Search-as-you-type Autocomplete (Clean, Compact Input)
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <div className="relative flex items-center">
        <Search className="w-3.5 h-3.5 absolute left-2.5 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          disabled={isSaving}
          value={searchQuery}
          onChange={(e) => {
            const val = e.target.value;
            setSearchQuery(val);
            setIsDropdownOpen(true);
            setHighlightedIndex(0);
            onActiveChange?.(true);
            updateDropdownPos();
          }}
          onFocus={() => {
            updateDropdownPos();
            setIsDropdownOpen(true);
            onActiveChange?.(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            biotimeName && !biotimeName.toLowerCase().startsWith('staff')
              ? `Search "${biotimeName.trim().split(/\s+/)[0]}" or employee...`
              : 'Type 3+ letters to search employee...'
          }
          className="w-full h-8 pl-8 pr-16 rounded-lg bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-cyan-500 shadow-2xs transition"
        />

        {/* Counter indicator (<3 letters) or Clear/Cancel buttons */}
        <div className="absolute right-2 flex items-center gap-1">
          {letterCount > 0 && !hasThreeAlphabets && (
            <span
              className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20"
              title="Type at least 3 letters to see suggestions"
            >
              {letterCount}/3
            </span>
          )}

          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setHighlightedIndex(0);
                inputRef.current?.focus();
              }}
              className="p-0.5 rounded text-muted-foreground hover:text-foreground transition cursor-pointer"
              title="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          )}

          {currentHubCode && (
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setIsDropdownOpen(false);
                setSearchQuery('');
                onActiveChange?.(false);
              }}
              className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition cursor-pointer"
              title="Cancel editing"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* PORTAL DROPDOWN: Rendered into document.body with fixed z-[9999]   */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {mounted &&
        isDropdownOpen &&
        hasThreeAlphabets &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: `${dropdownPos.top}px`,
              left: `${dropdownPos.left}px`,
              width: `${dropdownPos.width}px`,
              maxHeight: `${dropdownPos.maxHeight}px`,
            }}
            className="z-[9999] bg-card text-foreground border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-75"
            onMouseDown={(e) => e.preventDefault()} // prevent input blur on click/scroll
          >
            {/* Header */}
            <div className="px-3 py-1.5 bg-muted border-b border-border text-[10px] uppercase font-bold text-muted-foreground flex items-center justify-between shrink-0 select-none">
              <span>Suggested Employees ({suggestions.length})</span>
              <span className="text-[9px] font-normal lowercase opacity-70">↑↓ to navigate &bull; ↵ to select</span>
            </div>

            {/* Suggestions List */}
            <div className="overflow-y-auto divide-y divide-border/40 flex-1">
              {suggestions.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  <UserX className="w-5 h-5 mx-auto mb-1 opacity-40" />
                  <p className="font-semibold text-foreground">No matching employees</p>
                  <p className="text-[11px] text-muted-foreground">
                    No employee found matching &ldquo;{searchQuery}&rdquo;
                  </p>
                </div>
              ) : (
                suggestions.slice(0, 30).map((emp, idx) => {
                  const isHighlighted = idx === highlightedIndex;
                  const empInitials = getSafeInitials(emp.name);
                  return (
                    <button
                      key={emp.id || emp.code}
                      type="button"
                      onClick={() => handleSelect(emp.code)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={`w-full text-left p-2.5 px-3 flex items-center justify-between transition-colors cursor-pointer ${
                        isHighlighted
                          ? 'bg-cyan-500/15 dark:bg-cyan-500/20 text-foreground border-l-2 border-cyan-500'
                          : 'hover:bg-accent/60 text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 font-bold flex items-center justify-center text-[10px] shrink-0">
                          {empInitials}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-foreground text-xs truncate">
                            {emp.name}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            <span className="font-mono font-semibold text-cyan-600 dark:text-cyan-400">
                              {emp.code}
                            </span>
                            {emp.designation && ` • ${emp.designation}`}
                            {emp.department && ` • ${emp.department}`}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-[10px] font-semibold text-cyan-600 dark:text-cyan-400 shrink-0 ml-2">
                        <CornerDownLeft className="w-3 h-3" />
                        <span>Select</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Unlink row if already mapped */}
            {currentHubCode && (
              <div className="p-2 bg-muted/60 border-t border-border flex items-center justify-between text-[11px] shrink-0">
                <span className="text-muted-foreground">Remove current mapping?</span>
                <button
                  type="button"
                  onClick={handleUnlink}
                  className="px-2 py-0.5 rounded text-[10px] font-semibold text-rose-600 hover:bg-rose-500/10 transition cursor-pointer"
                >
                  Unlink / Quarantine
                </button>
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
