'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Grid,
  List,
  Plus,
  Search,
  Filter,
  Users,
  DoorOpen,
  MapPin,
  CheckCircle2,
  X,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Info,
  Check,
} from 'lucide-react';
import {
  MeetingRoom,
  RoomBooking,
  getMeetingRooms,
  saveMeetingRoom,
  deleteMeetingRoom,
  getRoomBookings,
  saveRoomBooking,
  createMultiDateBookings,
  deleteRoomBooking,
  checkRoomCollision,
  timeStringToMinutes,
  formatDayDisplay,
} from '@/lib/meeting-rooms';
import { getActiveEmployeeProfile } from '@/lib/user-profile-sync';

export default function MeetingRoomsPage() {
  const [viewMode, setViewMode] = useState<'CARDS' | 'LIST' | 'CALENDAR'>('CARDS');
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [bookings, setBookings] = useState<RoomBooking[]>([]);
  const [currentUser, setCurrentUser] = useState({
    name: 'Nasif Kamal',
    code: 'FO032507061190',
    department: "Founder's Office / FC",
  });

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [capacityFilter, setCapacityFilter] = useState('ALL');
  const [locationFilter, setLocationFilter] = useState('ALL');
  const [dateRangeStart, setDateRangeStart] = useState('2026-09-01');
  const [dateRangeEnd, setDateRangeEnd] = useState('2026-09-30');

  // Calendar States
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date(2026, 8, 1)); // Sep 2026
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>('2026-09-02');
  const [calendarRoomFilter, setCalendarRoomFilter] = useState<string>('ALL');

  // Modals
  const [showBookModal, setShowBookModal] = useState(false);
  const [selectedRoomForBooking, setSelectedRoomForBooking] = useState<MeetingRoom | null>(null);
  const [bookingFormData, setBookingFormData] = useState({
    title: '',
    dates: ['2026-09-04'],
    currentInputDate: '2026-09-04',
    startTime: '11:00',
    endTime: '12:00',
    attendeesCount: 5,
    notes: '',
  });

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRoomForDetails, setSelectedRoomForDetails] = useState<MeetingRoom | null>(null);

  const [showRoomEditModal, setShowRoomEditModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<MeetingRoom | null>(null);
  const [roomFormData, setRoomFormData] = useState<Partial<MeetingRoom>>({
    name: '',
    capacity: 10,
    floor: 'Floor 1',
    location: 'Floor 1 • HQ - JAAGO Foundation',
    status: 'Available',
    amenities: ['Air Conditioned', 'High Speed WiFi'],
    image: '',
    description: '',
  });

  const [showEditBookingModal, setShowEditBookingModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<RoomBooking | null>(null);

  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const loadData = () => {
    setRooms(getMeetingRooms());
    setBookings(getRoomBookings());
  };

  useEffect(() => {
    getActiveEmployeeProfile().then((emp) => {
      if (emp) {
        setCurrentUser({
          name: emp.name,
          code: emp.code,
          department: emp.department || "Founder's Office / FC",
        });
      }
    });

    loadData();

    window.addEventListener('jaago_meeting_rooms_updated', loadData);
    window.addEventListener('jaago_bookings_updated', loadData);
    return () => {
      window.removeEventListener('jaago_meeting_rooms_updated', loadData);
      window.removeEventListener('jaago_bookings_updated', loadData);
    };
  }, []);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // ── Filtered Rooms ──────────────────────────────────────────────────────────
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const matchesSearch =
        room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.amenities.some((a) => a.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchesCapacity = true;
      if (capacityFilter === '4+') matchesCapacity = room.capacity >= 4;
      if (capacityFilter === '8+') matchesCapacity = room.capacity >= 8;
      if (capacityFilter === '12+') matchesCapacity = room.capacity >= 12;
      if (capacityFilter === '20+') matchesCapacity = room.capacity >= 20;
      if (capacityFilter === '50+') matchesCapacity = room.capacity >= 50;

      let matchesLocation = true;
      if (locationFilter !== 'ALL') {
        matchesLocation = room.location.toLowerCase().includes(locationFilter.toLowerCase());
      }

      return matchesSearch && matchesCapacity && matchesLocation;
    });
  }, [rooms, searchQuery, capacityFilter, locationFilter]);

  // ── Stats Calculations ──────────────────────────────────────────────────────
  const totalRooms = rooms.length;
  const availableNowCount = rooms.filter((r) => r.status === 'Available').length;
  const currentlyBookedCount = rooms.filter((r) => r.status === 'Booked' || r.status === 'In Use').length;

  const rangeBookingsCount = useMemo(() => {
    return bookings.filter((b) => {
      if (dateRangeStart && b.date < dateRangeStart) return false;
      if (dateRangeEnd && b.date > dateRangeEnd) return false;
      return true;
    }).length;
  }, [bookings, dateRangeStart, dateRangeEnd]);

  // ── Calendar Helpers ────────────────────────────────────────────────────────
  const currentYear = currentCalendarDate.getFullYear();
  const currentMonth = currentCalendarDate.getMonth();

  const monthName = currentCalendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun
    const daysInMonth = lastDayOfMonth.getDate();

    // Previous month filler days
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    const prevDays = [];
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(currentYear, currentMonth - 1, prevMonthLastDay - i);
      const dateStr = prevDate.toISOString().slice(0, 10);
      prevDays.push({
        date: prevDate,
        dateStr,
        dayNum: prevMonthLastDay - i,
        isCurrentMonth: false,
      });
    }

    // Current month days
    const currDays = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const currDate = new Date(currentYear, currentMonth, i);
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      currDays.push({
        date: currDate,
        dateStr,
        dayNum: i,
        isCurrentMonth: true,
      });
    }

    // Next month filler days to complete 35 or 42 grid cells
    const totalCells = prevDays.length + currDays.length > 35 ? 42 : 35;
    const nextDaysNeeded = totalCells - (prevDays.length + currDays.length);
    const nextDays = [];
    for (let i = 1; i <= nextDaysNeeded; i++) {
      const nextDate = new Date(currentYear, currentMonth + 1, i);
      const dateStr = nextDate.toISOString().slice(0, 10);
      nextDays.push({
        date: nextDate,
        dateStr,
        dayNum: i,
        isCurrentMonth: false,
      });
    }

    return [...prevDays, ...currDays, ...nextDays];
  }, [currentYear, currentMonth]);

  const handlePrevMonth = () => {
    setCurrentCalendarDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentCalendarDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleJumpToToday = () => {
    const today = new Date(2026, 8, 4); // JAAGO active simulated clock Sep 4, 2026
    setCurrentCalendarDate(new Date(2026, 8, 1));
    setSelectedCalendarDate(today.toISOString().slice(0, 10));
  };

  const selectedDateBookings = useMemo(() => {
    if (!selectedCalendarDate) return [];
    return bookings
      .filter((b) => b.date === selectedCalendarDate)
      .filter((b) => (calendarRoomFilter === 'ALL' ? true : b.roomId === calendarRoomFilter))
      .sort((a, b) => timeStringToMinutes(a.startTime) - timeStringToMinutes(b.startTime));
  }, [bookings, selectedCalendarDate, calendarRoomFilter]);

  // ── Open Booking Modal ──────────────────────────────────────────────────────
  const handleOpenBookModal = (room?: MeetingRoom, date?: string) => {
    const targetRoom = room || rooms[0] || null;
    setSelectedRoomForBooking(targetRoom);
    const initDate = date || selectedCalendarDate || '2026-09-04';
    setBookingFormData({
      title: '',
      dates: [initDate],
      currentInputDate: initDate,
      startTime: '11:00',
      endTime: '12:30',
      attendeesCount: targetRoom?.capacity ? Math.min(6, targetRoom.capacity) : 5,
      notes: '',
    });
    setShowBookModal(true);
  };

  const handleAddDateToBooking = () => {
    if (!bookingFormData.currentInputDate) return;
    if (bookingFormData.dates.includes(bookingFormData.currentInputDate)) {
      showToast('Date already added to list', 'info');
      return;
    }
    setBookingFormData({
      ...bookingFormData,
      dates: [...bookingFormData.dates, bookingFormData.currentInputDate].sort(),
    });
  };

  const handleRemoveDateFromBooking = (dateToRemove: string) => {
    if (bookingFormData.dates.length <= 1) {
      showToast('At least one booking date is required', 'error');
      return;
    }
    setBookingFormData({
      ...bookingFormData,
      dates: bookingFormData.dates.filter((d) => d !== dateToRemove),
    });
  };

  const handleConfirmBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomForBooking) {
      showToast('Please select a meeting room', 'error');
      return;
    }
    if (!bookingFormData.title.trim()) {
      showToast('Please enter a meeting title', 'error');
      return;
    }
    if (bookingFormData.dates.length === 0) {
      showToast('Please specify at least one date', 'error');
      return;
    }

    const startMin = timeStringToMinutes(bookingFormData.startTime);
    const endMin = timeStringToMinutes(bookingFormData.endTime);
    if (endMin <= startMin) {
      showToast('End time must be after start time', 'error');
      return;
    }

    // Check collision for each date
    for (const d of bookingFormData.dates) {
      const conflict = checkRoomCollision(
        selectedRoomForBooking.id,
        d,
        bookingFormData.startTime,
        bookingFormData.endTime
      );
      if (conflict) {
        showToast(
          `Conflict on ${d}: Room "${selectedRoomForBooking.name}" is already booked for "${conflict.title}" (${conflict.startTime} - ${conflict.endTime})`,
          'error'
        );
        return;
      }
    }

    // Create multi-date bookings
    createMultiDateBookings(
      {
        roomId: selectedRoomForBooking.id,
        roomName: selectedRoomForBooking.name,
        title: bookingFormData.title.trim(),
        startTime: bookingFormData.startTime,
        endTime: bookingFormData.endTime,
        bookedByName: currentUser.name,
        bookedByCode: currentUser.code,
        bookedByDept: currentUser.department,
        attendeesCount: Number(bookingFormData.attendeesCount) || 2,
        notes: bookingFormData.notes.trim(),
        status: 'Confirmed',
      },
      bookingFormData.dates
    );

    setShowBookModal(false);
    showToast(
      `Room "${selectedRoomForBooking.name}" booked successfully for ${bookingFormData.dates.length} date(s)!`,
      'success'
    );
  };

  // ── Open Room Details ───────────────────────────────────────────────────────
  const handleOpenRoomDetails = (room: MeetingRoom) => {
    setSelectedRoomForDetails(room);
    setShowDetailsModal(true);
  };

  // ── Add/Edit Room Handlers ──────────────────────────────────────────────────
  const handleOpenAddRoom = () => {
    setEditingRoom(null);
    setRoomFormData({
      name: `${rooms.length + 1}. New Meeting Room`,
      capacity: 12,
      floor: 'Floor 1',
      location: 'Floor 1 • HQ - JAAGO Foundation',
      status: 'Available',
      amenities: ['Air Conditioned', 'Whiteboard', 'High Speed WiFi'],
      image: 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=800&q=80',
      description: 'Modern collaborative meeting workspace.',
    });
    setShowRoomEditModal(true);
  };

  const handleOpenEditRoom = (room: MeetingRoom) => {
    setEditingRoom(room);
    setRoomFormData({ ...room });
    setShowRoomEditModal(true);
  };

  const handleSaveRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomFormData.name?.trim()) {
      showToast('Please enter room name', 'error');
      return;
    }

    const payload: MeetingRoom = {
      id: editingRoom?.id || `room-${Date.now()}`,
      name: roomFormData.name.trim(),
      roomNumber: editingRoom?.roomNumber || rooms.length + 1,
      capacity: Number(roomFormData.capacity) || 10,
      floor: roomFormData.floor || 'Floor 1',
      location: roomFormData.location || 'Floor 1 • HQ - JAAGO Foundation',
      status: (roomFormData.status as any) || 'Available',
      amenities: roomFormData.amenities || ['Air Conditioned'],
      image:
        roomFormData.image?.trim() ||
        'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
      description: roomFormData.description?.trim() || '',
      createdAt: editingRoom?.createdAt || new Date().toISOString(),
    };

    saveMeetingRoom(payload);
    setShowRoomEditModal(false);
    showToast(editingRoom ? 'Room details updated successfully' : 'New meeting room added');
  };

  const handleDeleteRoom = (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove "${name}"?`)) {
      deleteMeetingRoom(id);
      showToast(`Meeting room "${name}" deleted`);
    }
  };

  // ── Edit Booking Handlers ───────────────────────────────────────────────────
  const handleOpenEditBooking = (b: RoomBooking) => {
    setEditingBooking(b);
    setShowEditBookingModal(true);
  };

  const handleSaveEditBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking) return;

    saveRoomBooking(editingBooking);
    setShowEditBookingModal(false);
    showToast('Booking updated successfully');
  };

  const handleDeleteBooking = (id: string, title: string) => {
    if (confirm(`Cancel and delete booking "${title}"?`)) {
      deleteRoomBooking(id);
      showToast('Booking cancelled');
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-2 text-xs font-bold animate-in slide-in-from-bottom-4 transition ${
            toastMsg.type === 'error'
              ? 'bg-rose-600 text-white'
              : toastMsg.type === 'info'
              ? 'bg-blue-600 text-white'
              : 'bg-emerald-600 text-white'
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── HEADER SECTION ───────────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-4">
        <div className="flex items-center space-x-3.5">
          <div className="h-12 w-12 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black flex-shrink-0 shadow-sm border border-amber-500/30">
            <DoorOpen className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                Meeting Rooms
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center space-x-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{availableNowCount} of {totalRooms} available</span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">
              Real-time room scheduling, reservation workflows, multi-day bookings &amp; HQ floor allocation.
            </p>
          </div>
        </div>

        {/* View Switchers + Add Room */}
        <div className="flex items-center space-x-2.5">
          <div className="flex items-center bg-card border border-border/80 rounded-2xl p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode('CARDS')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition cursor-pointer flex items-center space-x-1.5 ${
                viewMode === 'CARDS'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Grid className="h-3.5 w-3.5" />
              <span>CARDS</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('LIST')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition cursor-pointer flex items-center space-x-1.5 ${
                viewMode === 'LIST'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>LIST</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('CALENDAR')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition cursor-pointer flex items-center space-x-1.5 ${
                viewMode === 'CALENDAR'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              <span>CALENDAR</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleOpenAddRoom}
            className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-black text-xs uppercase tracking-wider transition flex items-center space-x-2 shadow-lg shadow-amber-500/20 cursor-pointer active:scale-95 flex-shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>ADD ROOM</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── FILTER STRIP ─────────────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
        {/* Search */}
        <div className="lg:col-span-4 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search rooms, amenities..."
            className="w-full h-11 pl-10 pr-4 rounded-2xl bg-card border border-border/80 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
          />
        </div>

        {/* Capacity */}
        <div className="lg:col-span-2">
          <select
            value={capacityFilter}
            onChange={(e) => setCapacityFilter(e.target.value)}
            className="w-full h-11 px-3.5 rounded-2xl bg-card border border-border/80 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs cursor-pointer"
          >
            <option value="ALL">Any Capacity</option>
            <option value="4+">4+ seats</option>
            <option value="8+">8+ seats</option>
            <option value="12+">12+ seats</option>
            <option value="20+">20+ seats</option>
            <option value="50+">50+ seats</option>
          </select>
        </div>

        {/* Locations */}
        <div className="lg:col-span-3">
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="w-full h-11 px-3.5 rounded-2xl bg-card border border-border/80 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs cursor-pointer"
          >
            <option value="ALL">All Locations</option>
            <option value="Floor 1">Floor 1 • HQ</option>
            <option value="Floor 2">Floor 2 • HQ</option>
            <option value="Ground Floor">Ground Floor • HQ</option>
          </select>
        </div>

        {/* Date Range */}
        <div className="lg:col-span-3 flex items-center space-x-1.5 bg-card border border-border/80 rounded-2xl px-3 h-11 shadow-xs">
          <CalendarIcon className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
          <input
            type="date"
            value={dateRangeStart}
            onChange={(e) => setDateRangeStart(e.target.value)}
            className="w-full text-[11px] font-semibold bg-transparent text-foreground focus:outline-none cursor-pointer"
          />
          <span className="text-muted-foreground text-xs">&rarr;</span>
          <input
            type="date"
            value={dateRangeEnd}
            onChange={(e) => setDateRangeEnd(e.target.value)}
            className="w-full text-[11px] font-semibold bg-transparent text-foreground focus:outline-none cursor-pointer"
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── STATS STRIP ──────────────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-3xl bg-card border border-border/80 shadow-xs flex items-center space-x-3.5">
          <div className="h-11 w-11 rounded-2xl bg-blue-500/15 text-blue-500 flex items-center justify-center font-black flex-shrink-0">
            <DoorOpen className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">TOTAL ROOMS</div>
            <div className="text-2xl font-black text-foreground font-mono">{totalRooms}</div>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-card border border-border/80 shadow-xs flex items-center space-x-3.5">
          <div className="h-11 w-11 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center font-black flex-shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">AVAILABLE NOW</div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{availableNowCount}</div>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-card border border-border/80 shadow-xs flex items-center space-x-3.5">
          <div className="h-11 w-11 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center font-black flex-shrink-0">
            <X className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">CURRENTLY BOOKED</div>
            <div className="text-2xl font-black text-rose-500 font-mono">{currentlyBookedCount}</div>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-card border border-border/80 shadow-xs flex items-center space-x-3.5">
          <div className="h-11 w-11 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center font-black flex-shrink-0">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">RANGE BOOKINGS</div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">{rangeBookingsCount}</div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── VIEW 1: CARDS VIEW (Screenshot 1) ────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {viewMode === 'CARDS' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {filteredRooms.map((room) => {
            const isAvailable = room.status === 'Available';

            return (
              <div
                key={room.id}
                className="rounded-3xl bg-card border border-border/80 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between group"
              >
                {/* Image Banner */}
                <div>
                  <div className="relative h-44 w-full bg-surface overflow-hidden">
                    <img
                      src={room.image}
                      alt={room.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      onError={(e) => {
                        (e.target as any).src = '/rooms/room-1.jpg';
                      }}
                    />

                    {/* Top Left: Capacity Badge */}
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-xs text-white text-[11px] font-bold flex items-center space-x-1.5 shadow-sm">
                      <Users className="h-3.5 w-3.5" />
                      <span>{room.capacity} seats</span>
                    </div>

                    {/* Top Right: Status Badge */}
                    <div
                      className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center space-x-1 shadow-sm ${
                        isAvailable
                          ? 'bg-emerald-500 text-white'
                          : 'bg-rose-500 text-white'
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                      <span>{isAvailable ? 'Available' : room.status}</span>
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-extrabold text-foreground text-base group-hover:text-amber-500 transition line-clamp-1">
                        {room.name}
                      </h3>
                      <button
                        type="button"
                        onClick={() => handleOpenEditRoom(room)}
                        className="p-1 text-muted-foreground hover:text-amber-500 transition cursor-pointer"
                        title="Edit Room"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center space-x-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{room.location}</span>
                    </div>

                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed pt-1">
                      {room.description}
                    </p>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="p-4 pt-0 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenBookModal(room)}
                    className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-black text-xs uppercase tracking-wider transition text-center shadow-xs cursor-pointer active:scale-95"
                  >
                    BOOK NOW
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenRoomDetails(room)}
                    className="py-2.5 px-3 rounded-xl bg-surface hover:bg-surface/80 border border-border text-foreground font-extrabold text-xs uppercase tracking-wider transition text-center cursor-pointer"
                  >
                    DETAILS
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── VIEW 2: LIST VIEW ────────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {viewMode === 'LIST' && (
        <div className="rounded-3xl bg-card border border-border/80 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface border-b border-border/80 text-[11px] uppercase tracking-wider font-extrabold text-muted-foreground">
                <tr>
                  <th className="py-3.5 px-4">Room Details</th>
                  <th className="py-3.5 px-4">Capacity</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Amenities</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredRooms.map((room) => (
                  <tr key={room.id} className="hover:bg-surface/50 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <img
                          src={room.image}
                          alt={room.name}
                          className="h-10 w-14 rounded-xl object-cover flex-shrink-0"
                          onError={(e) => {
                            (e.target as any).src = '/rooms/room-1.jpg';
                          }}
                        />
                        <div>
                          <div className="font-extrabold text-foreground text-xs">{room.name}</div>
                          <div className="text-[11px] text-muted-foreground line-clamp-1">{room.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-foreground">
                      {room.capacity} seats
                    </td>
                    <td className="py-3 px-4 font-medium text-muted-foreground">
                      {room.location}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {room.amenities.slice(0, 3).map((a, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-lg bg-surface border border-border text-[10px] font-semibold text-muted-foreground"
                          >
                            {a}
                          </span>
                        ))}
                        {room.amenities.length > 3 && (
                          <span className="px-1.5 py-0.5 rounded-lg bg-surface border border-border text-[10px] font-bold text-amber-500">
                            +{room.amenities.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center space-x-1 ${
                          room.status === 'Available'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                        }`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        <span>{room.status}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => handleOpenBookModal(room)}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[11px] uppercase tracking-wider transition cursor-pointer"
                        >
                          Book
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenRoomDetails(room)}
                          className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface transition cursor-pointer"
                          title="Details"
                        >
                          <Info className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditRoom(room)}
                          className="p-1.5 rounded-xl text-muted-foreground hover:text-amber-500 hover:bg-surface transition cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── VIEW 3: CALENDAR VIEW (Screenshots 3 & 4) ────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {viewMode === 'CALENDAR' && (
        <div className="space-y-4">
          {/* Calendar Month Header & Room Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/80 rounded-3xl p-4 shadow-xs">
            <div className="flex items-center space-x-2.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-2 rounded-xl bg-surface hover:bg-surface/80 border border-border text-foreground transition cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-2 rounded-xl bg-surface hover:bg-surface/80 border border-border text-foreground transition cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <h2 className="text-xl sm:text-2xl font-black text-foreground ml-2">
                {monthName}
              </h2>
              <button
                type="button"
                onClick={handleJumpToToday}
                className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface/80 border border-border text-foreground text-xs font-black uppercase tracking-wider ml-2 cursor-pointer"
              >
                TODAY
              </button>
            </div>

            {/* Room Filter for Calendar */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <select
                value={calendarRoomFilter}
                onChange={(e) => setCalendarRoomFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-surface border border-border text-xs font-bold text-foreground focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Rooms</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Calendar Grid + Side Panel Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left 8 Cols: Month Calendar Grid */}
            <div className="lg:col-span-8 rounded-3xl bg-card border border-border/80 overflow-hidden shadow-xs">
              {/* Day Name Headers */}
              <div className="grid grid-cols-7 border-b border-border/80 bg-surface/70 text-center py-3 text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                <div>SUN</div>
                <div>MON</div>
                <div>TUE</div>
                <div>WED</div>
                <div>THU</div>
                <div>FRI</div>
                <div>SAT</div>
              </div>

              {/* Days Matrix */}
              <div className="grid grid-cols-7 divide-x divide-y divide-border/60">
                {calendarDays.map((cell, idx) => {
                  const isSelected = selectedCalendarDate === cell.dateStr;
                  const dayBookings = bookings
                    .filter((b) => b.date === cell.dateStr)
                    .filter((b) => (calendarRoomFilter === 'ALL' ? true : b.roomId === calendarRoomFilter));

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedCalendarDate(cell.dateStr)}
                      className={`min-h-[100px] p-2 space-y-1.5 transition cursor-pointer relative ${
                        cell.isCurrentMonth ? 'bg-card' : 'bg-surface/30 opacity-60'
                      } ${
                        isSelected
                          ? 'ring-2 ring-amber-500 bg-amber-500/5 z-10'
                          : 'hover:bg-surface/60'
                      }`}
                    >
                      {/* Top Row: Date Number + Bookings Count */}
                      <div className="flex items-center justify-between text-xs">
                        <span
                          className={`font-black font-mono ${
                            isSelected
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-foreground'
                          }`}
                        >
                          {cell.dayNum}
                        </span>

                        {dayBookings.length > 0 && (
                          <span className="text-[10px] font-bold text-muted-foreground font-mono">
                            {dayBookings.length} {dayBookings.length === 1 ? 'booking' : 'bookings'}
                          </span>
                        )}
                      </div>

                      {/* Booking Chips inside Day cell */}
                      <div className="space-y-1 overflow-hidden">
                        {dayBookings.slice(0, 3).map((b) => (
                          <div
                            key={b.id}
                            className="px-1.5 py-0.5 rounded-md bg-amber-500 text-slate-950 font-bold text-[10px] truncate shadow-2xs"
                            title={`${b.startTime} - ${b.title} (${b.roomName})`}
                          >
                            <span className="font-mono">{b.startTime}</span> {b.title}
                          </div>
                        ))}

                        {dayBookings.length > 3 && (
                          <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 pl-1">
                            + {dayBookings.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right 4 Cols: Selected Date Detailed Log Panel (Screenshot 4) */}
            <div className="lg:col-span-4 rounded-3xl bg-card border border-border/80 p-5 space-y-4 shadow-xs">
              <div className="border-b border-border/70 pb-3">
                <h3 className="text-base font-black text-foreground">
                  {selectedCalendarDate ? formatDayDisplay(selectedCalendarDate) : 'Select a day'}
                </h3>
                <p className="text-xs text-muted-foreground font-medium">
                  {selectedDateBookings.length} bookings scheduled
                </p>
              </div>

              {/* Bookings Stack for Selected Date */}
              <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                {selectedDateBookings.map((b) => (
                  <div
                    key={b.id}
                    className="p-4 rounded-2xl bg-surface/70 border border-border/80 space-y-2.5 shadow-2xs hover:shadow-xs transition"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-black text-amber-600 dark:text-amber-400">
                        {b.startTime} - {b.endTime}
                      </span>
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditBooking(b)}
                          className="p-1 text-muted-foreground hover:text-amber-500 transition cursor-pointer"
                          title="Edit Booking"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBooking(b.id, b.title)}
                          className="p-1 text-muted-foreground hover:text-rose-500 transition cursor-pointer"
                          title="Delete Booking"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-extrabold text-foreground text-xs leading-snug">
                        {b.title}
                      </h4>
                      <div className="flex items-center space-x-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                        <DoorOpen className="h-3 w-3" />
                        <span>HQ - {b.roomName}</span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-[11px] text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>{b.bookedByName} {b.bookedByDept ? `• ${b.bookedByDept}` : ''}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {selectedDateBookings.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground space-y-2">
                    <CalendarIcon className="h-8 w-8 mx-auto text-muted-foreground/40" />
                    <div className="text-xs font-bold text-foreground">No bookings for this date</div>
                    <p className="text-[11px]">Click &quot;+ Book Room&quot; below to schedule a meeting.</p>
                  </div>
                )}
              </div>

              {/* Quick Book on Selected Date */}
              <button
                type="button"
                onClick={() => handleOpenBookModal(undefined, selectedCalendarDate)}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider transition text-center shadow-xs cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Book on this day</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── MODAL 1: BOOK ROOM (Screenshot 2) ────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {showBookModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-3xl bg-card border border-border shadow-2xl p-6 sm:p-7 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div>
                <h3 className="text-xl font-black text-foreground">Book Room</h3>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-bold">
                  {selectedRoomForBooking ? selectedRoomForBooking.name : 'Select a Room'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBookModal(false)}
                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmBooking} className="space-y-4 text-xs">
              {/* Room Selector if not preselected */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Select Room
                </label>
                <select
                  value={selectedRoomForBooking?.id || ''}
                  onChange={(e) => {
                    const r = rooms.find((x) => x.id === e.target.value);
                    if (r) setSelectedRoomForBooking(r);
                  }}
                  className="w-full h-10 px-3.5 rounded-xl bg-surface border border-border text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.capacity} seats - {r.floor})
                    </option>
                  ))}
                </select>
              </div>

              {/* Meeting Title */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Meeting Title <span className="text-amber-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={bookingFormData.title}
                  onChange={(e) => setBookingFormData({ ...bookingFormData, title: e.target.value })}
                  placeholder="e.g. Weekly Sync"
                  className="w-full h-10 px-3.5 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs"
                />
              </div>

              {/* Meeting Dates (Multi-Date Chips + Date Picker + Add Date button) */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Meeting Dates
                </label>

                {/* Selected Date Chips */}
                <div className="min-h-[38px] p-2 rounded-xl bg-surface/70 border border-border/80 flex flex-wrap gap-1.5 items-center">
                  {bookingFormData.dates.map((d) => (
                    <span
                      key={d}
                      className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold text-[11px] flex items-center space-x-1.5 shadow-2xs"
                    >
                      <span>{d}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDateFromBooking(d)}
                        className="hover:opacity-75 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>

                {/* Date Input + Add Date Button */}
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-8">
                    <input
                      type="date"
                      value={bookingFormData.currentInputDate}
                      onChange={(e) =>
                        setBookingFormData({ ...bookingFormData, currentInputDate: e.target.value })
                      }
                      className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
                    />
                  </div>
                  <div className="col-span-4">
                    <button
                      type="button"
                      onClick={handleAddDateToBooking}
                      className="w-full h-10 rounded-xl bg-surface hover:bg-surface/80 border border-border text-foreground font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-1 transition cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>ADD DATE</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Start & End Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Start Time
                  </label>
                  <input
                    type="time"
                    required
                    value={bookingFormData.startTime}
                    onChange={(e) => setBookingFormData({ ...bookingFormData, startTime: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    End Time
                  </label>
                  <input
                    type="time"
                    required
                    value={bookingFormData.endTime}
                    onChange={(e) => setBookingFormData({ ...bookingFormData, endTime: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Attendees & Organizer */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Attendees Count
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={selectedRoomForBooking?.capacity || 60}
                    value={bookingFormData.attendeesCount}
                    onChange={(e) =>
                      setBookingFormData({ ...bookingFormData, attendeesCount: Number(e.target.value) })
                    }
                    className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Organizer
                  </label>
                  <input
                    type="text"
                    disabled
                    value={currentUser.name}
                    className="w-full h-10 px-3 rounded-xl bg-surface/50 border border-border text-xs font-semibold text-muted-foreground"
                  />
                </div>
              </div>

              {/* Notes / Agenda */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Meeting Notes / Agenda (Optional)
                </label>
                <textarea
                  rows={2}
                  value={bookingFormData.notes}
                  onChange={(e) => setBookingFormData({ ...bookingFormData, notes: e.target.value })}
                  placeholder="Key discussion points, AV requirements, guests..."
                  className="w-full p-2.5 rounded-xl bg-surface border border-border text-xs font-medium text-foreground focus:outline-none"
                />
              </div>

              {/* Confirm Booking Button */}
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md transition cursor-pointer active:scale-98 mt-2"
              >
                CONFIRM BOOKING
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── MODAL 2: ROOM DETAILS ────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {showDetailsModal && selectedRoomForDetails && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl bg-card border border-border shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <h3 className="text-lg font-black text-foreground">Room Details</h3>
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="p-1 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <img
                src={selectedRoomForDetails.image}
                alt={selectedRoomForDetails.name}
                className="w-full h-52 object-cover rounded-2xl"
              />

              <div className="space-y-1">
                <h4 className="text-xl font-black text-foreground">{selectedRoomForDetails.name}</h4>
                <div className="flex items-center space-x-2 text-xs text-amber-600 dark:text-amber-400 font-bold">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{selectedRoomForDetails.location}</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                {selectedRoomForDetails.description}
              </p>

              {/* Amenities Grid */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Amenities &amp; Equipment
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedRoomForDetails.amenities.map((a, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground flex items-center space-x-1"
                    >
                      <Check className="h-3.5 w-3.5 text-amber-500" />
                      <span>{a}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Upcoming bookings for this room */}
              <div className="space-y-2 pt-2 border-t border-border/70">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Upcoming Bookings for this room
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {bookings
                    .filter((b) => b.roomId === selectedRoomForDetails.id)
                    .slice(0, 4)
                    .map((b) => (
                      <div
                        key={b.id}
                        className="p-2.5 rounded-xl bg-surface border border-border/80 text-xs flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-foreground">{b.title}</span>
                          <span className="text-muted-foreground ml-2">({b.date})</span>
                        </div>
                        <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">
                          {b.startTime} - {b.endTime}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-border/70">
                <button
                  type="button"
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-surface text-muted-foreground text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleOpenBookModal(selectedRoomForDetails);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md transition cursor-pointer"
                >
                  Book This Room
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── MODAL 3: ADD / EDIT ROOM ─────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {showRoomEditModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl bg-card border border-border shadow-2xl p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <h3 className="text-lg font-black text-foreground">
                {editingRoom ? 'Edit Room Details' : 'Add New Meeting Room'}
              </h3>
              <button
                type="button"
                onClick={() => setShowRoomEditModal(false)}
                className="p-1 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoom} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Room Name <span className="text-amber-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={roomFormData.name || ''}
                  onChange={(e) => setRoomFormData({ ...roomFormData, name: e.target.value })}
                  placeholder="e.g. 1. Meeting Room In"
                  className="w-full h-10 px-3.5 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Capacity (Seats)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={roomFormData.capacity || 10}
                    onChange={(e) => setRoomFormData({ ...roomFormData, capacity: Number(e.target.value) })}
                    className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Status
                  </label>
                  <select
                    value={roomFormData.status || 'Available'}
                    onChange={(e) => setRoomFormData({ ...roomFormData, status: e.target.value as any })}
                    className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs font-bold text-foreground focus:outline-none cursor-pointer"
                  >
                    <option value="Available">Available</option>
                    <option value="In Use">In Use</option>
                    <option value="Booked">Booked</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Location String
                </label>
                <input
                  type="text"
                  value={roomFormData.location || ''}
                  onChange={(e) => setRoomFormData({ ...roomFormData, location: e.target.value })}
                  placeholder="e.g. Floor 1 • HQ - JAAGO Foundation"
                  className="w-full h-10 px-3.5 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Photo URL
                </label>
                <input
                  type="url"
                  value={roomFormData.image || ''}
                  onChange={(e) => setRoomFormData({ ...roomFormData, image: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full h-10 px-3.5 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={roomFormData.description || ''}
                  onChange={(e) => setRoomFormData({ ...roomFormData, description: e.target.value })}
                  placeholder="Brief description of the room..."
                  className="w-full p-2.5 rounded-xl bg-surface border border-border text-xs font-medium text-foreground focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border/70">
                {editingRoom ? (
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteRoom(editingRoom.id, editingRoom.name);
                      setShowRoomEditModal(false);
                    }}
                    className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition cursor-pointer"
                    title="Delete Room"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowRoomEditModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-surface text-muted-foreground text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md transition cursor-pointer"
                  >
                    Save Room
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── MODAL 4: EDIT BOOKING ────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {showEditBookingModal && editingBooking && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-card border border-border shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <h3 className="text-lg font-black text-foreground">Edit Booking</h3>
              <button
                type="button"
                onClick={() => setShowEditBookingModal(false)}
                className="p-1 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditBooking} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={editingBooking.title}
                  onChange={(e) => setEditingBooking({ ...editingBooking, title: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={editingBooking.startTime}
                    onChange={(e) => setEditingBooking({ ...editingBooking, startTime: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={editingBooking.endTime}
                    onChange={(e) => setEditingBooking({ ...editingBooking, endTime: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={editingBooking.notes || ''}
                  onChange={(e) => setEditingBooking({ ...editingBooking, notes: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-surface border border-border text-xs font-medium text-foreground focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-border/70">
                <button
                  type="button"
                  onClick={() => setShowEditBookingModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-surface text-muted-foreground text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
