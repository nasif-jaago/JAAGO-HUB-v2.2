'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Calendar as CalendarIcon,
  RotateCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default function PnCLeaveCalendarPage() {
  const [currentMonth, setCurrentMonth] = useState('August 2026');

  return (
    <div className="space-y-6 select-none">
      {/* ── 1. HEADER SECTION ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-serif font-black tracking-tight text-foreground">
            Leave Calendar
          </h1>
          <p className="text-xs font-semibold text-muted-foreground pt-1">
            Monthly view of approved leaves and public holidays.
          </p>
        </div>

        <button
          onClick={() => alert('Calendar refreshed!')}
          className="px-4 py-2 rounded-2xl bg-card border border-border text-xs font-bold text-foreground hover:border-primary/50 transition flex items-center space-x-2 shadow-sm self-start sm:self-auto cursor-pointer"
        >
          <RotateCw className="h-3.5 w-3.5 text-muted-foreground" />
          <span>REFRESH</span>
        </button>
      </div>

      {/* ── 2. TOP METRIC CARDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Approved Leaves */}
        <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-md flex items-center justify-between">
          <div>
            <div className="text-4xl font-black text-emerald-500 tracking-tight">151</div>
            <div className="text-xs font-bold text-muted-foreground pt-1">Approved Leaves</div>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        {/* Pending Leaves */}
        <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-md flex items-center justify-between">
          <div>
            <div className="text-4xl font-black text-amber-500 tracking-tight">31</div>
            <div className="text-xs font-bold text-muted-foreground pt-1">Pending Leaves</div>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        {/* Holidays This Month */}
        <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-md flex items-center justify-between">
          <div>
            <div className="text-4xl font-black text-blue-500 tracking-tight">1</div>
            <div className="text-xs font-bold text-muted-foreground pt-1">Holidays This Month</div>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-500 flex items-center justify-center">
            <CalendarIcon className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* ── 3. MONTH PICKER BAR ── */}
      <div className="p-3 rounded-2xl bg-card border border-border/80 shadow-md flex items-center justify-between">
        <button
          onClick={() => setCurrentMonth('July 2026')}
          className="p-2 rounded-xl bg-surface border border-border hover:border-primary text-muted-foreground hover:text-foreground transition cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <h2 className="text-lg font-serif font-black text-foreground">
          {currentMonth}
        </h2>

        <button
          onClick={() => setCurrentMonth('September 2026')}
          className="p-2 rounded-xl bg-surface border border-border hover:border-primary text-muted-foreground hover:text-foreground transition cursor-pointer"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* ── 4. CALENDAR MATRIX ── */}
      <div className="rounded-3xl bg-card border border-border/80 shadow-md overflow-hidden">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-border/70 text-center text-xs font-extrabold uppercase tracking-wider py-3 bg-surface/50 text-amber-600 dark:text-amber-400">
          <div>SUN</div>
          <div>MON</div>
          <div>TUE</div>
          <div>WED</div>
          <div>THU</div>
          <div>FRI</div>
          <div>SAT</div>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-border/50 text-xs">
          {/* Row 1: Days 1 */}
          <div className="min-h-[110px] p-2 bg-surface/20"></div>
          <div className="min-h-[110px] p-2 bg-surface/20"></div>
          <div className="min-h-[110px] p-2 bg-surface/20"></div>
          <div className="min-h-[110px] p-2 bg-surface/20"></div>
          <div className="min-h-[110px] p-2 bg-surface/20"></div>
          <div className="min-h-[110px] p-2 bg-surface/20"></div>
          <div className="min-h-[110px] p-2 space-y-1">
            <div className="text-right font-bold text-muted-foreground">1</div>
          </div>

          {/* Row 2: Days 2 to 8 */}
          <div className="min-h-[110px] p-2 space-y-1">
            <div className="text-right font-bold text-muted-foreground">2</div>
            <div className="text-[10px] font-semibold bg-surface border border-border p-1 rounded-md truncate">👤 Shoaib</div>
            <div className="text-[10px] font-semibold bg-surface border border-border p-1 rounded-md truncate">👤 Rasul</div>
            <div className="text-[10px] font-semibold bg-surface border border-border p-1 rounded-md truncate">👤 Mostafa</div>
            <div className="text-[9px] text-muted-foreground font-bold pl-1">+8 more</div>
          </div>

          <div className="min-h-[110px] p-2 space-y-1">
            <div className="text-right font-bold text-muted-foreground">3</div>
            <div className="text-[10px] font-semibold bg-surface border border-border p-1 rounded-md truncate">👤 Mahnaz</div>
            <div className="text-[10px] font-semibold bg-surface border border-border p-1 rounded-md truncate">👤 Mohammad</div>
            <div className="text-[10px] font-semibold bg-surface border border-border p-1 rounded-md truncate">👤 Nahida</div>
            <div className="text-[9px] text-muted-foreground font-bold pl-1">+8 more</div>
          </div>

          <div className="min-h-[110px] p-2 space-y-1">
            <div className="text-right font-bold text-muted-foreground">4</div>
            <div className="text-[10px] font-semibold bg-surface border border-border p-1 rounded-md truncate">👤 Asif</div>
            <div className="text-[10px] font-semibold bg-surface border border-border p-1 rounded-md truncate">👤 Md.</div>
            <div className="text-[10px] font-semibold bg-surface border border-border p-1 rounded-md truncate">👤 Amdad</div>
            <div className="text-[9px] text-muted-foreground font-bold pl-1">+11 more</div>
          </div>

          <div className="min-h-[110px] p-2 space-y-1 bg-blue-500/5">
            <div className="text-right font-bold text-muted-foreground">5</div>
            <div className="text-[10px] font-bold bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 p-1 rounded-md truncate">
              🎉 July Uprising Day
            </div>
            <div className="text-[10px] font-semibold bg-surface border border-border p-1 rounded-md truncate">👤 Apurba</div>
            <div className="text-[10px] font-semibold bg-surface border border-border p-1 rounded-md truncate">👤 Rifat</div>
          </div>

          <div className="min-h-[110px] p-2 space-y-1">
            <div className="text-right font-bold text-muted-foreground">6</div>
            <div className="text-[10px] font-semibold bg-surface border border-border p-1 rounded-md truncate">👤 Liton</div>
            <div className="text-[10px] font-semibold bg-surface border border-border p-1 rounded-md truncate">👤 Samia</div>
            <div className="text-[10px] font-semibold bg-surface border border-border p-1 rounded-md truncate">👤 Ahmed</div>
            <div className="text-[9px] text-muted-foreground font-bold pl-1">+27 more</div>
          </div>

          <div className="min-h-[110px] p-2 space-y-1">
            <div className="text-right font-bold text-muted-foreground">7</div>
          </div>

          <div className="min-h-[110px] p-2 space-y-1">
            <div className="text-right font-bold text-muted-foreground">8</div>
            <div className="text-[10px] font-semibold bg-surface border border-border p-1 rounded-md truncate">👤 Shakil</div>
          </div>

          {/* Row 3: Days 9 to 15 */}
          <div className="min-h-[110px] p-2 space-y-1">
            <div className="text-right font-bold text-muted-foreground">9</div>
            <div className="text-[10px] font-semibold bg-surface border border-border p-1 rounded-md truncate">👤 Nusrat</div>
            <div className="text-[10px] font-semibold bg-surface border border-border p-1 rounded-md truncate">👤 Bikash</div>
            <div className="text-[10px] font-semibold bg-surface border border-border p-1 rounded-md truncate">👤 Laboni</div>
            <div className="text-[9px] text-muted-foreground font-bold pl-1">+8 more</div>
          </div>

          <div className="min-h-[110px] p-2 space-y-1">
            <div className="text-right font-bold text-muted-foreground">10</div>
            <div className="text-[10px] font-semibold bg-surface border border-border p-1 rounded-md truncate">👤 Apurba</div>
            <div className="text-[10px] font-semibold bg-surface border border-border p-1 rounded-md truncate">👤 Mousina</div>
            <div className="text-[10px] font-semibold bg-surface border border-border p-1 rounded-md truncate">👤 Syed</div>
            <div className="text-[9px] text-muted-foreground font-bold pl-1">+7 more</div>
          </div>

          <div className="min-h-[110px] p-2 space-y-1">
            <div className="text-right font-bold text-muted-foreground">11</div>
            <div className="text-[10px] font-semibold bg-surface border border-border p-1 rounded-md truncate">👤 Apurba</div>
            <div className="text-[10px] font-semibold bg-surface border border-border p-1 rounded-md truncate">👤 Mousina</div>
            <div className="text-[10px] font-semibold bg-surface border border-border p-1 rounded-md truncate">👤 Syed</div>
            <div className="text-[9px] text-muted-foreground font-bold pl-1">+8 more</div>
          </div>

          <div className="min-h-[110px] p-2 space-y-1">
            <div className="text-right font-bold text-muted-foreground">12</div>
            <div className="text-[10px] font-semibold bg-surface border border-border p-1 rounded-md truncate">👤 Mostafa</div>
            <div className="text-[10px] font-semibold bg-surface border border-border p-1 rounded-md truncate">👤 S</div>
            <div className="text-[10px] font-semibold bg-surface border border-border p-1 rounded-md truncate">👤 Maung</div>
            <div className="text-[9px] text-muted-foreground font-bold pl-1">+14 more</div>
          </div>

          <div className="min-h-[110px] p-2 space-y-1">
            <div className="text-right font-bold text-muted-foreground">13</div>
            <div className="text-[10px] font-semibold bg-surface border border-border p-1 rounded-md truncate">👤 Zerida</div>
            <div className="text-[10px] font-semibold bg-surface border border-border p-1 rounded-md truncate">👤 Rini</div>
            <div className="text-[10px] font-semibold bg-surface border border-border p-1 rounded-md truncate">👤 Nasrin</div>
            <div className="text-[9px] text-muted-foreground font-bold pl-1">+12 more</div>
          </div>

          <div className="min-h-[110px] p-2 space-y-1">
            <div className="text-right font-bold text-muted-foreground">14</div>
            <div className="text-[10px] font-semibold bg-surface border border-border p-1 rounded-md truncate">👤 Saima</div>
          </div>

          <div className="min-h-[110px] p-2 space-y-1">
            <div className="text-right font-bold text-muted-foreground">15</div>
            <div className="text-[10px] font-semibold bg-surface border border-border p-1 rounded-md truncate">👤 Saima</div>
          </div>

          {/* Row 4: Days 16 to 22 */}
          <div className="min-h-[110px] p-2 space-y-1">
            <div className="text-right font-bold text-muted-foreground">16</div>
            <div className="text-[10px] font-semibold bg-surface border border-border p-1 rounded-md truncate">👤 Nasif</div>
            <div className="text-[10px] font-semibold bg-surface border border-border p-1 rounded-md truncate">👤 Mohammad</div>
          </div>

          <div className="min-h-[110px] p-2 space-y-1">
            <div className="text-right font-bold text-muted-foreground">17</div>
            <div className="text-[10px] font-semibold bg-surface border border-border p-1 rounded-md truncate">👤 Zakia</div>
            <div className="text-[10px] font-semibold bg-surface border border-border p-1 rounded-md truncate">👤 Aeysha</div>
          </div>

          <div className="min-h-[110px] p-2 space-y-1">
            <div className="text-right font-bold text-muted-foreground">18</div>
            <div className="text-[10px] font-semibold bg-surface border border-border p-1 rounded-md truncate">👤 Zerida</div>
            <div className="text-[10px] font-semibold bg-surface border border-border p-1 rounded-md truncate">👤 Nusrat</div>
          </div>

          <div className="min-h-[110px] p-2 space-y-1">
            <div className="text-right font-bold text-muted-foreground">19</div>
            <div className="text-[10px] font-semibold bg-surface border border-border p-1 rounded-md truncate">👤 Md.</div>
            <div className="text-[10px] font-semibold bg-surface border border-border p-1 rounded-md truncate">👤 S</div>
          </div>

          <div className="min-h-[110px] p-2 space-y-1">
            <div className="text-right font-bold text-muted-foreground">20</div>
            <div className="text-[10px] font-semibold bg-surface border border-border p-1 rounded-md truncate">👤 Puja</div>
            <div className="text-[10px] font-semibold bg-surface border border-border p-1 rounded-md truncate">👤 Sayed</div>
          </div>

          <div className="min-h-[110px] p-2 space-y-1">
            <div className="text-right font-bold text-muted-foreground">21</div>
            <div className="text-[10px] font-semibold bg-surface border border-border p-1 rounded-md truncate">👤 Amdad</div>
            <div className="text-[10px] font-semibold bg-surface border border-border p-1 rounded-md truncate">👤 Mohammad</div>
          </div>

          <div className="min-h-[110px] p-2 space-y-1 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <div className="flex items-center justify-between font-bold">
              <span className="text-[9px] uppercase font-black text-amber-500">TODAY</span>
              <span className="h-5 w-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-black">
                22
              </span>
            </div>
            <div className="text-[10px] font-semibold bg-card border border-border p-1 rounded-md truncate">👤 Amdad</div>
            <div className="text-[10px] font-semibold bg-card border border-border p-1 rounded-md truncate">👤 Mohammad</div>
          </div>
        </div>
      </div>
    </div>
  );
}
