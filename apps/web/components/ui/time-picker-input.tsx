'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Clock, Check, Sparkles } from 'lucide-react';

interface TimePickerInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  position?: 'auto' | 'top' | 'bottom';
}

const HOURS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];
const QUICK_PRESETS = [
  '07:30 AM',
  '08:00 AM',
  '08:30 AM',
  '09:00 AM',
  '09:30 AM',
  '10:00 AM',
  '04:30 PM',
  '05:00 PM',
  '05:30 PM',
  '06:00 PM',
  '08:00 PM',
  '11:30 PM',
];

export function TimePickerInput({
  value,
  onChange,
  placeholder = '09:00 AM',
  className = '',
  position = 'auto',
}: TimePickerInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openDirection, setOpenDirection] = useState<'down' | 'up'>('down');
  const containerRef = useRef<HTMLDivElement>(null);
  const nativeInputRef = useRef<HTMLInputElement>(null);

  // Parse current value
  const parseTime = (valStr: string) => {
    try {
      if (!valStr || !valStr.includes(':')) {
        return { hour: '09', minute: '00', meridiem: 'AM' };
      }
      const parts = valStr.trim().split(' ');
      const timePart = parts[0] || '09:00';
      const meridiem = (parts[1] || 'AM').toUpperCase() === 'PM' ? 'PM' : 'AM';
      const [h, m] = timePart.split(':');
      let hourNum = parseInt(h || '9', 10);
      if (isNaN(hourNum) || hourNum < 1 || hourNum > 12) hourNum = 9;
      const hour = hourNum < 10 ? `0${hourNum}` : `${hourNum}`;
      let minNum = parseInt(m || '0', 10);
      if (isNaN(minNum) || minNum < 0 || minNum > 59) minNum = 0;
      const minute = minNum < 10 ? `0${minNum}` : `${minNum}`;
      return { hour, minute, meridiem };
    } catch {
      return { hour: '09', minute: '00', meridiem: 'AM' };
    }
  };

  const { hour: currentHour, minute: currentMinute, meridiem: currentMeridiem } = parseTime(value);

  const [selectedHour, setSelectedHour] = useState(currentHour);
  const [selectedMinute, setSelectedMinute] = useState(currentMinute);
  const [selectedMeridiem, setSelectedMeridiem] = useState(currentMeridiem);

  useEffect(() => {
    const parsed = parseTime(value);
    setSelectedHour(parsed.hour);
    setSelectedMinute(parsed.minute);
    setSelectedMeridiem(parsed.meridiem);
  }, [value]);

  // Determine direction (up vs down)
  useEffect(() => {
    if (isOpen && containerRef.current) {
      if (position === 'top') {
        setOpenDirection('up');
      } else if (position === 'bottom') {
        setOpenDirection('down');
      } else {
        const rect = containerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        if (spaceBelow < 360 && rect.top > 300) {
          setOpenDirection('up');
        } else {
          setOpenDirection('down');
        }
      }
    }
  }, [isOpen, position]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const updateTime = (newH: string, newM: string, newMed: string) => {
    setSelectedHour(newH);
    setSelectedMinute(newM);
    setSelectedMeridiem(newMed);
    onChange(`${newH}:${newM} ${newMed}`);
  };

  const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value; // "14:30"
    if (!val) return;
    const [hStr, mStr] = val.split(':');
    let h = parseInt(hStr || '0', 10);
    const m = mStr || '00';
    const med = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    const formattedH = h < 10 ? `0${h}` : `${h}`;
    updateTime(formattedH, m, med);
  };

  // Convert 12h to 24h for native input
  const get24HourVal = () => {
    let h = parseInt(selectedHour, 10);
    if (selectedMeridiem === 'PM' && h < 12) h += 12;
    if (selectedMeridiem === 'AM' && h === 12) h = 0;
    const hStr = h < 10 ? `0${h}` : `${h}`;
    return `${hStr}:${selectedMinute}`;
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onClick={() => setIsOpen(true)}
          placeholder={placeholder}
          className={`w-full h-11 px-3.5 pr-10 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-semibold text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm transition cursor-pointer ${className}`}
        />

        {/* Interactive Clickable Clock Icon Button */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-lg transition cursor-pointer ${
            isOpen
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-muted-foreground hover:text-amber-500 hover:bg-surface/80'
          }`}
          title="Open Clock Picker"
        >
          <Clock className="h-4 w-4" />
        </button>

        {/* Hidden Native Time Picker Helper */}
        <input
          ref={nativeInputRef}
          type="time"
          value={get24HourVal()}
          onChange={handleNativeChange}
          className="sr-only"
        />
      </div>

      {/* ── INTERACTIVE CLOCK PICKER POPOVER ── */}
      {isOpen && (
        <div
          className={`absolute z-[100] left-0 right-0 sm:left-auto sm:right-0 sm:w-80 p-4 rounded-2xl bg-card border border-border shadow-2xl space-y-3.5 animate-in fade-in zoom-in-95 ${
            openDirection === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          {/* Header Time Display & AM/PM Switcher */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface/80 border border-border/70">
            <div className="flex items-center space-x-1 font-mono text-xl font-black text-foreground">
              <span className="text-amber-500">{selectedHour}</span>
              <span>:</span>
              <span className="text-amber-500">{selectedMinute}</span>
            </div>

            {/* AM / PM Segmented Control */}
            <div className="flex items-center bg-surface rounded-lg p-0.5 border border-border text-xs font-black">
              <button
                type="button"
                onClick={() => updateTime(selectedHour, selectedMinute, 'AM')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  selectedMeridiem === 'AM'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => updateTime(selectedHour, selectedMinute, 'PM')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  selectedMeridiem === 'PM'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                PM
              </button>
            </div>
          </div>

          {/* ── 1. HOURS GRID (1 to 12) ── */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <span>Select Hour</span>
              <span className="text-amber-500 font-mono">{selectedHour}</span>
            </div>
            <div className="grid grid-cols-6 gap-1 text-xs">
              {HOURS.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => updateTime(h, selectedMinute, selectedMeridiem)}
                  className={`h-8 rounded-lg font-bold font-mono transition cursor-pointer flex items-center justify-center ${
                    selectedHour === h
                      ? 'bg-amber-500 text-slate-950 shadow-md font-black scale-105'
                      : 'bg-surface/60 hover:bg-surface text-muted-foreground hover:text-foreground border border-border/40'
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>

          {/* ── 2. MINUTES GRID (00 to 55) ── */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <span>Select Minute</span>
              <span className="text-amber-500 font-mono">{selectedMinute}</span>
            </div>
            <div className="grid grid-cols-6 gap-1 text-xs">
              {MINUTES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => updateTime(selectedHour, m, selectedMeridiem)}
                  className={`h-8 rounded-lg font-bold font-mono transition cursor-pointer flex items-center justify-center ${
                    selectedMinute === m
                      ? 'bg-amber-500 text-slate-950 shadow-md font-black scale-105'
                      : 'bg-surface/60 hover:bg-surface text-muted-foreground hover:text-foreground border border-border/40'
                  }`}
                >
                  :{m}
                </button>
              ))}
            </div>
          </div>

          {/* ── 3. QUICK PRESETS ── */}
          <div className="space-y-1.5 pt-1 border-t border-border/60">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center space-x-1">
              <Sparkles className="h-3 w-3 text-amber-500" />
              <span>Quick Presets</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {QUICK_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    const parsed = parseTime(preset);
                    updateTime(parsed.hour, parsed.minute, parsed.meridiem);
                  }}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold font-mono transition cursor-pointer ${
                    value === preset
                      ? 'bg-amber-500/20 text-amber-500 border border-amber-500/40'
                      : 'bg-surface/60 hover:bg-surface text-muted-foreground hover:text-foreground border border-border/40'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
            <button
              type="button"
              onClick={() => nativeInputRef.current?.showPicker?.()}
              className="text-[11px] font-bold text-muted-foreground hover:text-amber-500 transition cursor-pointer flex items-center space-x-1"
            >
              <Clock className="h-3 w-3" />
              <span>Native Clock</span>
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[11px] uppercase tracking-wider shadow-sm transition cursor-pointer flex items-center space-x-1"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Done</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
