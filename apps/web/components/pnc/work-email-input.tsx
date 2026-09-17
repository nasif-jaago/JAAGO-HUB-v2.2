'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Mail, ChevronDown, Sparkles, Hash, AtSign, Check } from 'lucide-react';

export interface WorkEmailInputProps {
  value: string;
  onChange: (email: string) => void;
  employeeName?: string | undefined;
  employeeCode?: string | undefined;
  organization?: string | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
}

interface EmailSuggestion {
  username: string;
  domain: string;
  fullEmail: string;
  label: string;
  badge: string;
  type: 'name' | 'code' | 'custom';
}

function parseEmailParts(emailStr: string | null | undefined, defaultDomain: string) {
  if (!emailStr || typeof emailStr !== 'string') {
    return { username: '', domain: defaultDomain, isCustom: false };
  }
  const clean = emailStr.trim();
  const atIdx = clean.indexOf('@');
  if (atIdx === -1) {
    return { username: clean, domain: defaultDomain, isCustom: false };
  }
  const username = clean.slice(0, atIdx).trim();
  const domain = clean.slice(atIdx).trim().toLowerCase();

  const isStandard = domain === '@jaago.com.bd' || domain === '@emkcenter.org';
  return {
    username,
    domain: domain || defaultDomain,
    isCustom: Boolean(domain && !isStandard),
  };
}

function generateCleanUsernames(name?: string | null, code?: string | null): { nameCandidates: string[]; codeCandidate: string | null } {
  const nameCandidates: string[] = [];

  if (name && typeof name === 'string') {
    const clean = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, '');
    const parts = clean.split(/\s+/).filter(Boolean);

    // Omit common honorific prefixes
    const filtered = parts.filter(
      (p) => !['md', 'most', 'mst', 'dr', 'mr', 'mrs', 'miss', 'adv', 'prof'].includes(p)
    );
    const effective = filtered.length > 0 ? filtered : parts;

    if (effective.length >= 2) {
      // firstname.lastname (e.g. abdul.aziz)
      const firstLast = `${effective[0]}.${effective[effective.length - 1]}`;
      nameCandidates.push(firstLast);

      // full dotted if 3+ names (e.g. mohammad.iqbal.hossain)
      if (effective.length > 2) {
        const fullDotted = effective.join('.');
        if (fullDotted !== firstLast) {
          nameCandidates.push(fullDotted);
        }
      }
    }

    // single first name (e.g. abdul)
    if (effective.length >= 1 && effective[0]) {
      if (!nameCandidates.includes(effective[0])) {
        nameCandidates.push(effective[0]);
      }
    }
  }

  let codeCandidate: string | null = null;
  if (code && typeof code === 'string') {
    const cleanCode = code.trim().toLowerCase();
    if (cleanCode) {
      codeCandidate = cleanCode;
    }
  }

  return { nameCandidates, codeCandidate };
}

export function WorkEmailInput({
  value,
  onChange,
  employeeName,
  employeeCode,
  organization,
  disabled = false,
  className = '',
}: WorkEmailInputProps) {
  // Determine standard default domain based on organization
  const defaultDomain = useMemo(() => {
    const org = (organization || '').toLowerCase();
    return org.includes('emk') ? '@emkcenter.org' : '@jaago.com.bd';
  }, [organization]);

  const { username: parsedUsername, domain: parsedDomain, isCustom } = useMemo(
    () => parseEmailParts(value, defaultDomain),
    [value, defaultDomain]
  );

  const [selectedDomain, setSelectedDomain] = useState<string>(parsedDomain);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync domain when parsedDomain changes externally
  useEffect(() => {
    if (parsedDomain) {
      setSelectedDomain(parsedDomain);
    }
  }, [parsedDomain]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Generate suggestions
  const suggestions = useMemo<EmailSuggestion[]>(() => {
    const list: EmailSuggestion[] = [];
    const domains = ['@jaago.com.bd', '@emkcenter.org'];

    // If user has typed a custom username or part
    const currentTyped = parsedUsername.trim().toLowerCase();

    const { nameCandidates, codeCandidate } = generateCleanUsernames(employeeName, employeeCode);

    // If typed, add typed username suggestions first
    if (currentTyped && !nameCandidates.includes(currentTyped) && currentTyped !== codeCandidate) {
      for (const dom of domains) {
        list.push({
          username: currentTyped,
          domain: dom,
          fullEmail: `${currentTyped}${dom}`,
          label: `${currentTyped}${dom}`,
          badge: 'Typed',
          type: 'custom',
        });
      }
    }

    // Add name candidates
    for (const u of nameCandidates) {
      for (const dom of domains) {
        list.push({
          username: u,
          domain: dom,
          fullEmail: `${u}${dom}`,
          label: `${u}${dom}`,
          badge: dom === '@jaago.com.bd' ? 'JAAGO Name' : 'EMK Center',
          type: 'name',
        });
      }
    }

    // Add code candidate
    if (codeCandidate) {
      for (const dom of domains) {
        list.push({
          username: codeCandidate,
          domain: dom,
          fullEmail: `${codeCandidate}${dom}`,
          label: `${codeCandidate}${dom}`,
          badge: 'Employee ID',
          type: 'code',
        });
      }
    }

    return list;
  }, [parsedUsername, employeeName, employeeCode]);

  const handleSelectSuggestion = useCallback(
    (s: EmailSuggestion) => {
      setSelectedDomain(s.domain);
      onChange(s.fullEmail);
      setShowDropdown(false);
    },
    [onChange]
  );

  const handleUsernameChange = (newVal: string) => {
    // If user typed or pasted an email containing '@'
    if (newVal.includes('@')) {
      const atIdx = newVal.indexOf('@');
      const u = newVal.slice(0, atIdx).trim();
      const d = newVal.slice(atIdx).trim().toLowerCase();

      let targetDomain = selectedDomain;
      if (d === '@jaago.com.bd' || d === '@emkcenter.org') {
        targetDomain = d;
        setSelectedDomain(d);
      }
      onChange(u ? `${u}${targetDomain}` : '');
      return;
    }

    const clean = newVal.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
    onChange(clean ? `${clean}${selectedDomain}` : '');
  };

  const handleDomainChange = (newDomain: string) => {
    setSelectedDomain(newDomain);
    if (parsedUsername) {
      onChange(`${parsedUsername}${newDomain}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!showDropdown) {
        setShowDropdown(true);
      } else if (suggestions.length > 0) {
        setHighlightedIndex((prev) => (prev + 1) % suggestions.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setHighlightedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      }
    } else if (e.key === 'Enter') {
      if (showDropdown && suggestions.length > 0) {
        e.preventDefault();
        const pick = suggestions[highlightedIndex] || suggestions[0];
        if (pick) {
          handleSelectSuggestion(pick);
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowDropdown(false);
    }
  };

  return (
    <div ref={containerRef} className={`space-y-1 relative ${className}`}>
      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
        Work Email
      </label>

      {/* Input Group: Username/ID input + Domain Dropdown */}
      <div className="flex items-center group relative">
        {/* Left: Username / User ID input */}
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            disabled={disabled}
            value={parsedUsername}
            onChange={(e) => handleUsernameChange(e.target.value)}
            onFocus={() => {
              setShowDropdown(true);
              setHighlightedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="username or user ID"
            className="w-full h-10 pl-8 pr-3 rounded-l-xl bg-surface/50 border border-r-0 border-border text-xs sm:text-[13px] font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 focus:z-10 shadow-sm transition"
          />
          <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        </div>

        {/* Right: Selected Domain Dropdown */}
        <div className="relative shrink-0">
          <select
            value={selectedDomain}
            disabled={disabled}
            onChange={(e) => handleDomainChange(e.target.value)}
            className="h-10 pl-2.5 pr-8 rounded-r-xl bg-muted/60 hover:bg-muted/90 border border-border text-xs sm:text-[12px] font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-sm appearance-none transition"
          >
            <option value="@jaago.com.bd">@jaago.com.bd</option>
            <option value="@emkcenter.org">@emkcenter.org</option>
            {isCustom && <option value={selectedDomain}>{selectedDomain}</option>}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Fast Dropdown Suggestions on focus/click */}
      {showDropdown && suggestions.length > 0 && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-card border border-border rounded-2xl shadow-2xl p-2 z-40 space-y-1 max-h-64 overflow-y-auto animate-in fade-in zoom-in-95">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between border-b border-border/50 pb-1.5 select-none">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Suggested Work Emails
            </span>
            <span className="text-[9px] font-normal lowercase opacity-70">
              Click to fast-fill
            </span>
          </div>

          <div className="divide-y divide-border/30 pt-0.5">
            {suggestions.map((s, idx) => {
              const isSelected =
                parsedUsername === s.username && selectedDomain === s.domain;
              const isHighlighted = idx === highlightedIndex;

              return (
                <button
                  key={`${s.username}-${s.domain}`}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault(); // prevent input blur before click fires
                    handleSelectSuggestion(s);
                  }}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`w-full text-left p-2 rounded-xl transition flex items-center justify-between cursor-pointer text-xs ${
                    isHighlighted || isSelected
                      ? 'bg-amber-500/15 text-foreground font-semibold'
                      : 'hover:bg-surface text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center text-[10px] shrink-0">
                      {s.type === 'code' ? (
                        <Hash className="w-3 h-3" />
                      ) : (
                        <AtSign className="w-3 h-3" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold text-foreground">
                        <span>{s.username}</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">
                          {s.domain}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-muted text-muted-foreground">
                      {s.badge}
                    </span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
