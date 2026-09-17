'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Phone, ChevronDown, X, Check } from 'lucide-react';

export interface CountryCodeItem {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
  maxDigits: number;
}

export const COUNTRY_LIST: CountryCodeItem[] = [
  { code: 'BD', name: 'Bangladesh', dialCode: '+880', flag: '🇧🇩', maxDigits: 11 },
  { code: 'GB', name: 'UK', dialCode: '+44', flag: '🇬🇧', maxDigits: 11 },
  { code: 'US', name: 'USA', dialCode: '+1', flag: '🇺🇸', maxDigits: 10 },
  { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦', maxDigits: 10 },
  { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺', maxDigits: 10 },
  { code: 'MY', name: 'Malaysia', dialCode: '+60', flag: '🇲🇾', maxDigits: 10 },
  { code: 'SG', name: 'Singapore', dialCode: '+65', flag: '🇸🇬', maxDigits: 9 },
  { code: 'AE', name: 'UAE', dialCode: '+971', flag: '🇦🇪', maxDigits: 10 },
  { code: 'SA', name: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦', maxDigits: 10 },
  { code: 'QA', name: 'Qatar', dialCode: '+974', flag: '🇶🇦', maxDigits: 8 },
  { code: 'KW', name: 'Kuwait', dialCode: '+965', flag: '🇰🇼', maxDigits: 8 },
  { code: 'OM', name: 'Oman', dialCode: '+968', flag: '🇴🇲', maxDigits: 8 },
  { code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳', maxDigits: 10 },
  { code: 'PK', name: 'Pakistan', dialCode: '+92', flag: '🇵🇰', maxDigits: 11 },
  { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪', maxDigits: 12 },
  { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷', maxDigits: 10 },
  { code: 'IT', name: 'Italy', dialCode: '+39', flag: '🇮🇹', maxDigits: 11 },
  { code: 'JP', name: 'Japan', dialCode: '+81', flag: '🇯🇵', maxDigits: 11 },
  { code: 'CN', name: 'China', dialCode: '+86', flag: '🇨🇳', maxDigits: 11 },
  { code: 'TR', name: 'Turkey', dialCode: '+90', flag: '🇹🇷', maxDigits: 10 },
  { code: 'OTHER', name: 'Other', dialCode: '+', flag: '🌐', maxDigits: 15 },
];

function normalizeBDLocal(digits: string): string {
  // If 10 digits starting with 1 (e.g. 1750710193), normalize to standard 11 digits with leading 0 (01750710193)
  if (digits.length === 10 && digits.startsWith('1')) {
    return `0${digits}`;
  }
  // Max 11 digits for Bangladesh
  return digits.slice(0, 11);
}

function parsePhoneNumber(phoneStr: string | null | undefined): {
  countryCode: string;
  dialCode: string;
  localDigits: string;
} {
  if (!phoneStr || typeof phoneStr !== 'string') {
    return { countryCode: 'BD', dialCode: '+880', localDigits: '' };
  }

  let cleanStr = phoneStr.trim();
  if (!cleanStr) {
    return { countryCode: 'BD', dialCode: '+880', localDigits: '' };
  }

  // Handle scientific notation from spreadsheets (e.g. 8.80E+12)
  if (/^[0-9]\.[0-9]+[eE]\+[0-9]+$/.test(cleanStr)) {
    try {
      cleanStr = BigInt(Math.round(Number(cleanStr))).toString();
    } catch {
      // ignore conversion failure
    }
  }

  // Sort dial codes by length descending so +880 matches before +88 or +1
  const sorted = [...COUNTRY_LIST].sort((a, b) => b.dialCode.length - a.dialCode.length);

  for (const c of sorted) {
    if (c.code === 'OTHER') continue;
    const bareDial = c.dialCode.replace('+', '');

    if (cleanStr.startsWith(c.dialCode)) {
      const rest = cleanStr.slice(c.dialCode.length).replace(/[^0-9]/g, '');
      const localDigits = c.code === 'BD' ? normalizeBDLocal(rest) : rest.slice(0, c.maxDigits);
      return { countryCode: c.code, dialCode: c.dialCode, localDigits };
    }

    if (cleanStr.startsWith(bareDial) && cleanStr.length > bareDial.length + 5) {
      const rest = cleanStr.slice(bareDial.length).replace(/[^0-9]/g, '');
      const localDigits = c.code === 'BD' ? normalizeBDLocal(rest) : rest.slice(0, c.maxDigits);
      return { countryCode: c.code, dialCode: c.dialCode, localDigits };
    }
  }

  // Fallback: If only digits and looks like a BD number
  const onlyDigits = cleanStr.replace(/[^0-9]/g, '');
  if (onlyDigits.startsWith('01') || onlyDigits.length === 11 || onlyDigits.length === 10) {
    return {
      countryCode: 'BD',
      dialCode: '+880',
      localDigits: normalizeBDLocal(onlyDigits),
    };
  }

  return { countryCode: 'BD', dialCode: '+880', localDigits: onlyDigits.slice(0, 11) };
}

export interface PhoneNumberInputProps {
  label?: string | undefined;
  value: string;
  onChange: (fullPhoneNumber: string) => void;
  placeholder?: string | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
}

export function PhoneNumberInput({
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
  className = '',
}: PhoneNumberInputProps) {
  const parsed = useMemo(() => parsePhoneNumber(value), [value]);

  const [selectedCountryCode, setSelectedCountryCode] = useState<string>(parsed.countryCode);
  const [localDigits, setLocalDigits] = useState<string>(parsed.localDigits);

  // Sync internal state when external value changes
  useEffect(() => {
    setSelectedCountryCode(parsed.countryCode);
    setLocalDigits(parsed.localDigits);
  }, [parsed.countryCode, parsed.localDigits]);

  const currentCountry = useMemo(() => {
    return (
      COUNTRY_LIST.find((c) => c.code === selectedCountryCode) ||
      COUNTRY_LIST[0]!
    );
  }, [selectedCountryCode]);

  const maxDigits = currentCountry.maxDigits; // 11 for Bangladesh

  const emitValue = (dialCode: string, digits: string, countryCode: string) => {
    if (!digits) {
      onChange('');
      return;
    }

    // For Bangladesh:
    // Format to standard E.164 (+8801XXXXXXXXX) while allowing the user to view/type 01XXXXXXXXX
    if (countryCode === 'BD') {
      const standard = digits.startsWith('0') ? digits.slice(1) : digits;
      onChange(`${dialCode}${standard}`);
    } else {
      onChange(`${dialCode}${digits}`);
    }
  };

  const handleCountryChange = (newCode: string) => {
    setSelectedCountryCode(newCode);
    const country = COUNTRY_LIST.find((c) => c.code === newCode) || COUNTRY_LIST[0]!;
    const clamped = country.code === 'BD' ? normalizeBDLocal(localDigits) : localDigits.slice(0, country.maxDigits);
    setLocalDigits(clamped);
    emitValue(country.dialCode, clamped, newCode);
  };

  const handleDigitsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // If user pasted a full number with country code
    if (raw.startsWith('+') || raw.includes(' ')) {
      const p = parsePhoneNumber(raw);
      setSelectedCountryCode(p.countryCode);
      setLocalDigits(p.localDigits);
      emitValue(p.dialCode, p.localDigits, p.countryCode);
      return;
    }

    // Only allow numeric digits
    const digitsOnly = raw.replace(/[^0-9]/g, '');

    // Strict length enforcement: max 11 digits for Bangladesh (12 or more blocked!)
    const clamped = digitsOnly.slice(0, maxDigits);

    setLocalDigits(clamped);
    emitValue(currentCountry.dialCode, clamped, selectedCountryCode);
  };

  const handleClear = () => {
    setLocalDigits('');
    onChange('');
  };

  const isBD = selectedCountryCode === 'BD';
  const isCompleteBD = isBD && localDigits.length === 11;

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label
            className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate"
            title={label}
          >
            {label}
          </label>
          <span className="text-[10px] text-muted-foreground/80">
            {isBD ? '(11-digit Mobile Number)' : `(Max ${maxDigits} digits)`}
          </span>
        </div>
      )}

      {/* Input Group: Fast Country Dropdown + Phone Input */}
      <div className="flex items-center group relative">
        {/* Left: Country Code Dropdown */}
        <div className="relative shrink-0 w-[115px] sm:w-[130px]">
          <select
            value={selectedCountryCode}
            disabled={disabled}
            onChange={(e) => handleCountryChange(e.target.value)}
            className="w-full h-10 pl-2.5 pr-7 rounded-l-xl bg-muted/60 hover:bg-muted/90 border border-r-0 border-border text-xs sm:text-[12px] font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-sm appearance-none transition"
            title="Select Country Code"
          >
            {COUNTRY_LIST.map((c) => (
              <option key={c.code} value={c.code} className="bg-card text-foreground font-medium">
                {c.flag} {c.code} ({c.dialCode})
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        </div>

        {/* Right: Phone Number Input */}
        <div className="relative flex-1">
          <input
            type="tel"
            inputMode="numeric"
            disabled={disabled}
            value={localDigits}
            onChange={handleDigitsChange}
            maxLength={maxDigits}
            placeholder={
              placeholder || (isBD ? '01711000000' : 'Phone number')
            }
            className="w-full h-10 pl-8 pr-16 rounded-r-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 focus:z-10 shadow-sm transition"
          />
          <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />

          {/* Right Controls: Digit Counter & Clear Button */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 z-20">
            {isBD && localDigits.length > 0 && (
              <span
                className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border transition-colors flex items-center gap-0.5 ${
                  isCompleteBD
                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                    : 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20'
                }`}
                title={
                  isCompleteBD
                    ? 'Complete 11-digit mobile number'
                    : `Must be 11 digits (currently ${localDigits.length}/11)`
                }
              >
                {isCompleteBD && <Check className="w-2.5 h-2.5" />}
                {localDigits.length}/11
              </span>
            )}

            {!isBD && localDigits.length > 0 && (
              <span className="text-[10px] font-mono font-semibold text-muted-foreground/80 bg-muted px-1.5 py-0.5 rounded">
                {localDigits.length}/{maxDigits}
              </span>
            )}

            {localDigits && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="p-0.5 rounded text-muted-foreground hover:text-foreground transition cursor-pointer"
                title="Clear phone number"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
