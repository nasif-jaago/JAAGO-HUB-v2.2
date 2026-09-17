'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  X,
  UserX,
  AlertCircle,
  Pencil,
  CornerDownLeft,
  Unlink,
  Sparkles,
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
  return (firstChar + lastChar).toUpperCase() || 'EM';
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
  const [isEditing, setIsEditing] = useState<boolean>(!currentHubCode);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const [openUpward, setOpenUpward] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync editing state if currentHubCode changes externally
  useEffect(() => {
    if (currentHubCode) {
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  }, [currentHubCode]);

  // Notify parent of active dropdown for z-index management
  useEffect(() => {
    onActiveChange?.(isDropdownOpen);
  }, [isDropdownOpen, onActiveChange]);

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

  // Quick suggestion from device name
  const canQuickSearch = useMemo(() => {
    if (!biotimeName) return false;
    const clean = biotimeName.trim();
    return (
      clean.length >= 3 &&
      !clean.toLowerCase().startsWith('staff') &&
      !clean.toLowerCase().includes('device')
    );
  }, [biotimeName]);

  // Check whether to open dropdown upwards or downwards
  const updateDirection = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    setOpenUpward(spaceBelow < 280 && rect.top > 280);
  }, []);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
        if (currentHubCode) {
          setIsEditing(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [currentHubCode]);

  const handleSelect = (code: string) => {
    setIsDropdownOpen(false);
    setIsEditing(false);
    setSearchQuery('');
    onSave(biotimeEmpCode, code);
  };

  const handleUnlink = () => {
    setIsDropdownOpen(false);
    setIsEditing(false);
    setSearchQuery('');
    onSave(biotimeEmpCode, '');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isDropdownOpen) {
        setIsDropdownOpen(true);
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
      if (currentHubCode) {
        setIsEditing(false);
      }
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 1: Linked / Mapped State (Not actively searching)
  // ──────────────────────────────────────────────────────────────────────────
  if (currentHubCode && !isEditing) {
    return (
      <div className="flex items-center justify-between gap-2 p-1.5 px-2.5 rounded-xl bg-muted/40 hover:bg-muted/70 border border-border/80 transition-all max-w-md group">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-full bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 font-bold flex items-center justify-center text-[10px] shrink-0">
            {getSafeInitials(displayName)}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-foreground text-xs truncate flex items-center gap-1.5">
              <span className="truncate">{displayName}</span>
              <span className="text-[10px] font-mono text-muted-foreground shrink-0">
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
              setTimeout(() => {
                inputRef.current?.focus();
                updateDirection();
              }, 50);
            }}
            className="px-2 py-1 rounded-md text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-700 dark:hover:text-cyan-300 transition cursor-pointer flex items-center gap-1"
            title="Change mapped HUB employee"
          >
            <Pencil className="w-3 h-3" />
            <span>Change</span>
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleUnlink}
            className="p-1 rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
            title="Unlink / Quarantine mapping"
          >
            <Unlink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 2: Search-as-you-type Autocomplete (Unlinked or Editing)
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative flex items-center">
        <Search className="w-3.5 h-3.5 absolute left-2.5 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          disabled={isSaving}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsDropdownOpen(true);
            setHighlightedIndex(0);
            updateDirection();
          }}
          onFocus={() => {
            updateDirection();
            setIsDropdownOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search employee (type 3+ letters)..."
          className="w-full pl-8 pr-16 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-cyan-500 shadow-2xs transition"
        />

        {/* Clear & Cancel Controls */}
        <div className="absolute right-2 flex items-center gap-1">
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
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {currentHubCode && (
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setIsDropdownOpen(false);
                setSearchQuery('');
              }}
              className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition cursor-pointer"
              title="Cancel editing"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Quick search chip if device name exists and no query typed yet */}
      {!currentHubCode && canQuickSearch && !searchQuery && (
        <div className="mt-1 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              const clean = (biotimeName || '').trim();
              setSearchQuery(clean);
              setIsDropdownOpen(true);
              setHighlightedIndex(0);
              updateDirection();
              inputRef.current?.focus();
            }}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 text-[10px] font-medium transition cursor-pointer border border-cyan-500/20"
          >
            <Sparkles className="w-2.5 h-2.5" />
            Search &ldquo;{biotimeName}&rdquo;
          </button>
        </div>
      )}

      {/* Guidance badge when typing less than 3 alphabets */}
      {isDropdownOpen && letterCount > 0 && !hasThreeAlphabets && (
        <div className="mt-1 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5 animate-in fade-in">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>Type at least 3 letters to view suggestions ({letterCount}/3)</span>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* SUGGESTED NAMES POPUP (Appears ONLY when >= 3 alphabets are typed) */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {isDropdownOpen && hasThreeAlphabets && (
        <div
          className={`absolute left-0 z-50 w-full min-w-[340px] max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 ${
            openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          }`}
          onMouseDown={(e) => e.preventDefault()} // prevent input blur on scroll/click
        >
          {/* Header */}
          <div className="px-3 py-1.5 bg-muted/60 border-b border-border text-[10px] uppercase font-bold text-muted-foreground flex items-center justify-between">
            <span>Suggested Employees ({suggestions.length})</span>
            <span className="text-[9px] font-normal lowercase opacity-70">↑↓ to navigate &bull; ↵ to select</span>
          </div>

          {/* Suggestions List */}
          <div className="max-h-56 overflow-y-auto divide-y divide-border/40">
            {suggestions.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                <UserX className="w-5 h-5 mx-auto mb-1 opacity-40" />
                <p className="font-semibold text-foreground">No matching employees</p>
                <p className="text-[11px] text-muted-foreground">
                  No employee found matching &ldquo;{searchQuery}&rdquo;
                </p>
              </div>
            ) : (
              suggestions.slice(0, 25).map((emp, idx) => {
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
                        : 'hover:bg-accent/50 text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold flex items-center justify-center text-[10px] shrink-0">
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

                    <div className="flex items-center gap-1 text-[10px] font-semibold text-cyan-600 dark:text-cyan-400 opacity-0 group-hover:opacity-100 shrink-0 ml-2">
                      <CornerDownLeft className="w-3 h-3" />
                      <span>Select</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Optional unlinking row at bottom */}
          {currentHubCode && (
            <div className="p-2 bg-muted/40 border-t border-border flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Remove existing mapping?</span>
              <button
                type="button"
                onClick={handleUnlink}
                className="px-2 py-0.5 rounded text-[10px] font-semibold text-rose-600 hover:bg-rose-500/10 transition cursor-pointer"
              >
                Unlink / Quarantine
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
