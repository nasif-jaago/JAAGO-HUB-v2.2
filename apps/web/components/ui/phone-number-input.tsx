'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Phone, ChevronDown } from 'lucide-react';

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
  { code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳', maxDigits: 10 },
  { code: 'PK', name: 'Pakistan', dialCode: '+92', flag: '🇵🇰', maxDigits: 10 },
  { code: 'NP', name: 'Nepal', dialCode: '+977', flag: '🇳🇵', maxDigits: 10 },
  { code: 'OTHER', name: 'Other', dialCode: '+', flag: '🌐', maxDigits: 15 },
];

/**
 * Normalizes a Bangladesh local number to standard 11-digit format starting with 01
 */
export function normalizeBDLocal(rawDigits: string): string {
  if (!rawDigits) return '';
  const digits = rawDigits.replace(/[^0-9]/g, '');

  if (digits.startsWith('880')) {
    const after = digits.slice(3);
    return after.startsWith('0') ? after.slice(0, 11) : ('0' + after).slice(0, 11);
  }

  if (digits.startsWith('0')) {
    return digits.slice(0, 11);
  }

  if (digits.startsWith('1')) {
    return ('0' + digits).slice(0, 11);
  }

  return digits.slice(0, 11);
}

/**
 * Parses an incoming phone number into { countryCode, dialCode, localDigits }
 */
export function parsePhoneNumber(rawStr: string | null | undefined): {
  countryCode: string;
  dialCode: string;
  localDigits: string;
} {
  if (!rawStr || typeof rawStr !== 'string') {
    return { countryCode: 'BD', dialCode: '+880', localDigits: '' };
  }

  const cleanStr = rawStr.trim();
  if (!cleanStr) {
    return { countryCode: 'BD', dialCode: '+880', localDigits: '' };
  }

  // Handle scientific notation or corrupt numbers from spreadsheets (e.g. 8.80E+12)
  if (/[eE]\+?/.test(cleanStr)) {
    return { countryCode: 'BD', dialCode: '+880', localDigits: '' };
  }

  // Sort dial codes by length descending so +880 matches before +88 or +1
  const sorted = [...COUNTRY_LIST].sort((a, b) => b.dialCode.length - a.dialCode.length);

  for (const c of sorted) {
    if (c.code === 'OTHER') continue;
    const bareDial = c.dialCode.replace('+', '');

    if (cleanStr.startsWith(c.dialCode)) {
      const rest = cleanStr.slice(c.dialCode.length).replace(/[^0-9]/g, '');
      const localDigits = c.code === 'BD' ? normalizeBDLocal(rest) : rest.slice(0, c.maxDigits);
      if (/^0+$/.test(localDigits)) {
        return { countryCode: c.code, dialCode: c.dialCode, localDigits: '' };
      }
      return { countryCode: c.code, dialCode: c.dialCode, localDigits };
    }

    if (cleanStr.startsWith(bareDial) && cleanStr.length > bareDial.length + 5) {
      const rest = cleanStr.slice(bareDial.length).replace(/[^0-9]/g, '');
      const localDigits = c.code === 'BD' ? normalizeBDLocal(rest) : rest.slice(0, c.maxDigits);
      if (/^0+$/.test(localDigits)) {
        return { countryCode: c.code, dialCode: c.dialCode, localDigits: '' };
      }
      return { countryCode: c.code, dialCode: c.dialCode, localDigits };
    }
  }

  // Fallback: If only digits and looks like a BD number
  const onlyDigits = cleanStr.replace(/[^0-9]/g, '');
  if (/^0+$/.test(onlyDigits)) {
    return { countryCode: 'BD', dialCode: '+880', localDigits: '' };
  }
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
  labelClassName?: string | undefined;
  value?: string | null | undefined;
  onChange: (fullPhoneNumber: string) => void;
  placeholder?: string | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
  inputClassName?: string | undefined;
  roundedClassName?: 'rounded-xl' | 'rounded-2xl' | string | undefined;
  size?: 'sm' | 'md' | 'lg' | undefined;
  required?: boolean | undefined;
  id?: string | undefined;
}

export function PhoneNumberInput({
  label,
  labelClassName,
  value = '',
  onChange,
  placeholder,
  disabled = false,
  className = '',
  inputClassName = '',
  roundedClassName,
  size = 'md',
  required = false,
  id,
}: PhoneNumberInputProps) {
  const parsed = useMemo(() => parsePhoneNumber(value), [value]);

  const [selectedCountryCode, setSelectedCountryCode] = useState<string>(parsed.countryCode);
  const [localDigits, setLocalDigits] = useState<string>(parsed.localDigits);
  const isUserTypingRef = useRef<boolean>(false);

  // Sync internal state when external value changes
  useEffect(() => {
    if (isUserTypingRef.current) {
      isUserTypingRef.current = false;
      return;
    }
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

    if (countryCode === 'BD') {
      // Standard international E.164: +8801XXXXXXXXX
      const bdDigits = digits.startsWith('0') ? digits.slice(1) : digits;
      onChange(`+880${bdDigits}`);
      return;
    }

    onChange(`${dialCode}${digits}`);
  };

  const handleCountryChange = (newCode: string) => {
    setSelectedCountryCode(newCode);
    const country = COUNTRY_LIST.find((c) => c.code === newCode) || COUNTRY_LIST[0]!;
    const clampedDigits = localDigits.slice(0, country.maxDigits);
    setLocalDigits(clampedDigits);
    emitValue(country.dialCode, clampedDigits, newCode);
  };

  const handleDigitsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    isUserTypingRef.current = true;
    const raw = e.target.value;

    // Only allow numeric digits
    const digitsOnly = raw.replace(/[^0-9]/g, '');

    // Strict length enforcement: max 11 digits for Bangladesh (12 or more strictly blocked!)
    const clamped = digitsOnly.slice(0, maxDigits);

    setLocalDigits(clamped);
    emitValue(currentCountry.dialCode, clamped, selectedCountryCode);
  };

  const isBD = selectedCountryCode === 'BD';

  // Sizing styles
  const heightClass =
    size === 'lg' ? 'h-11 sm:h-12' : size === 'sm' ? 'h-9' : 'h-10';

  const defaultRounded = size === 'lg' ? 'rounded-2xl' : 'rounded-xl';
  const effectiveRounded = roundedClassName || defaultRounded;
  const leftRounded = effectiveRounded === 'rounded-2xl' ? 'rounded-l-2xl' : 'rounded-l-xl';
  const rightRounded = effectiveRounded === 'rounded-2xl' ? 'rounded-r-2xl' : 'rounded-r-xl';

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className={
            labelClassName ||
            'text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block truncate'
          }
          title={label}
        >
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}

      {/* Input Group: Fast Country Dropdown + Phone Input */}
      <div className="flex items-center group relative shadow-sm">
        {/* Left: Country Code Dropdown */}
        <div className="relative shrink-0 w-[115px] sm:w-[130px]">
          <select
            value={selectedCountryCode}
            disabled={disabled}
            onChange={(e) => handleCountryChange(e.target.value)}
            className={`w-full ${heightClass} pl-2.5 pr-7 ${leftRounded} bg-muted/70 hover:bg-muted/90 border border-r-0 border-border text-xs sm:text-[12px] font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer appearance-none transition`}
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
            id={id}
            type="tel"
            inputMode="numeric"
            disabled={disabled}
            value={localDigits}
            onChange={handleDigitsChange}
            maxLength={maxDigits}
            placeholder={
              placeholder || (isBD ? '01711000000' : 'Phone number')
            }
            className={`w-full ${heightClass} pl-8 pr-3.5 ${rightRounded} bg-surface border border-border text-xs sm:text-[13px] font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary focus:z-10 transition ${inputClassName}`}
          />
          <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
