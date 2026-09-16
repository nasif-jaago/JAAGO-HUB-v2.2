'use client';

import React from 'react';
import { AlertTriangle, Clock, Calendar as CalendarIcon, DoorOpen, Users, X } from 'lucide-react';
import { BookingConflictDetail } from '@/lib/meeting-rooms';

interface BookingConflictModalProps {
  conflict: BookingConflictDetail | null;
  onClose: () => void;
}

export function BookingConflictModal({ conflict, onClose }: BookingConflictModalProps) {
  if (!conflict) return null;

  const { roomName, date, startTime, endTime, conflictingBooking } = conflict;

  return (
    <div className="fixed inset-0 z-[80] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-3xl bg-card border border-rose-500/40 shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 shrink-0">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-foreground">Duplicate Booking Not Allowed</h3>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-bold">
                Room is already booked during this time slot
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface transition cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="p-3.5 rounded-2xl bg-surface border border-border/80 text-xs text-muted-foreground leading-relaxed">
          The requested meeting room has an existing confirmed reservation during this time. 
          To prevent scheduling conflicts and double bookings, duplicate reservations are strictly prohibited.
        </div>

        {/* Existing Conflicting Booking Card */}
        <div className="rounded-2xl bg-rose-500/5 border border-rose-500/20 p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-rose-500/15 pb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Existing Reservation Details
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-700 dark:text-rose-300">
              Already Booked
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase text-muted-foreground block">Meeting Room</span>
              <span className="font-black text-foreground flex items-center space-x-1.5 mt-0.5">
                <DoorOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="truncate">{roomName || conflictingBooking.roomName}</span>
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase text-muted-foreground block">Meeting Title</span>
              <span className="font-bold text-foreground block truncate mt-0.5" title={conflictingBooking.title}>
                {conflictingBooking.title}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase text-muted-foreground block">Reserved Date</span>
              <span className="font-bold text-foreground flex items-center space-x-1.5 mt-0.5">
                <CalendarIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>{conflictingBooking.date}</span>
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase text-muted-foreground block">Booked Time Slot</span>
              <span className="font-black text-rose-600 dark:text-rose-400 flex items-center space-x-1.5 mt-0.5">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>{conflictingBooking.startTime} – {conflictingBooking.endTime}</span>
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase text-muted-foreground block">Organizer</span>
              <span className="font-bold text-foreground flex items-center space-x-1.5 mt-0.5">
                <Users className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="truncate">{conflictingBooking.bookedByName}</span>
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase text-muted-foreground block">Department</span>
              <span className="font-bold text-muted-foreground block truncate mt-0.5">
                {conflictingBooking.bookedByDept || 'General'}
              </span>
            </div>
          </div>
        </div>

        {/* User's Attempted Slot */}
        <div className="rounded-2xl bg-surface border border-border p-3 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
          <span className="text-muted-foreground font-semibold">Your Requested Slot:</span>
          <span className="font-mono font-bold text-foreground">
            {date} ({startTime} – {endTime})
          </span>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 h-11 rounded-xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider hover:opacity-90 transition cursor-pointer shadow-md"
          >
            Change Date, Time, or Room
          </button>
        </div>
      </div>
    </div>
  );
}
