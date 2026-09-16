'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  DoorOpen,
  Plus,
  Search,
  Users,
  MapPin,
  CheckCircle2,
  X,
  Edit2,
  Trash2,
  Calendar as CalendarIcon,
  Clock,
  Layers,
  Settings,
  AlertTriangle,
  Sliders,
  Check,
  ShieldCheck,
  RefreshCw,
  Info,
} from 'lucide-react';
import {
  MeetingRoom,
  RoomBooking,
  BookingConflictDetail,
  getMeetingRooms,
  saveMeetingRoom,
  deleteMeetingRoom,
  getRoomBookings,
  saveRoomBooking,
  deleteRoomBooking,
  checkRoomCollision,
  timeStringToMinutes,
  formatDayDisplay,
  ROOM_PRESET_IMAGES,
  STANDARD_AMENITIES,
  getPresentDateString,
  getPresentTimeString,
  getDefaultEndTimeString,
} from '@/lib/meeting-rooms';
import { BookingConflictModal } from '@/components/meeting-rooms/booking-conflict-modal';

export default function AdminMeetingRoomsPage() {
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [bookings, setBookings] = useState<RoomBooking[]>([]);
  const [activeTab, setActiveTab] = useState<'rooms' | 'bookings' | 'settings'>('rooms');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Search & Filters for Rooms
  const [roomSearch, setRoomSearch] = useState('');
  const [floorFilter, setFloorFilter] = useState('ALL');
  const [capacityFilter, setCapacityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Search & Filters for Bookings
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingRoomFilter, setBookingRoomFilter] = useState('ALL');
  const [bookingDateFilter, setBookingDateFilter] = useState('');

  // Modals
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<MeetingRoom | null>(null);
  const [roomFormData, setRoomFormData] = useState<Partial<MeetingRoom>>({
    name: '',
    roomNumber: 1,
    capacity: 10,
    floor: 'Floor 1',
    location: 'Floor 1 • HQ - JAAGO Foundation',
    status: 'Available',
    amenities: ['Air Conditioned', 'High Speed WiFi'],
    image: '/rooms/room-1.jpg?v=2',
    description: '',
  });

  const [deleteRoomTarget, setDeleteRoomTarget] = useState<MeetingRoom | null>(null);
  const [deleteBookingTarget, setDeleteBookingTarget] = useState<RoomBooking | null>(null);

  // Admin Booking Modal
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<RoomBooking | null>(null);
  const [bookingFormData, setBookingFormData] = useState({
    roomId: '',
    title: '',
    date: getPresentDateString(),
    startTime: getPresentTimeString(),
    endTime: getDefaultEndTimeString(),
    bookedByName: 'Habibur Rahman',
    bookedByCode: 'AP0112',
    bookedByDept: 'Admin & Procurement',
    attendeesCount: 5,
    notes: '',
  });

  // Duplicate / Conflict Alert Pop-up Modal State
  const [conflictAlert, setConflictAlert] = useState<BookingConflictDetail | null>(null);

  // Policy Settings State
  const [policySettings, setPolicySettings] = useState({
    operatingHoursStart: '08:00',
    operatingHoursEnd: '20:00',
    maxAdvanceDays: 30,
    defaultDurationMinutes: 60,
    autoReleaseMinutes: 15,
    allowWeekendBookings: true,
  });

  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const loadData = () => {
    setRooms(getMeetingRooms());
    setBookings(getRoomBookings());
  };

  useEffect(() => {
    loadData();

    // Load custom policy if saved
    try {
      const savedPolicy = localStorage.getItem('jaago_meeting_room_policy');
      if (savedPolicy) {
        setPolicySettings(JSON.parse(savedPolicy));
      }
    } catch {}

    const handleRoomUpdate = () => loadData();
    const handleBookingUpdate = () => loadData();
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'jaago_meeting_rooms' || e.key === 'jaago_room_bookings') {
        loadData();
      }
    };

    window.addEventListener('jaago_meeting_rooms_updated', handleRoomUpdate);
    window.addEventListener('jaago_bookings_updated', handleBookingUpdate);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('jaago_meeting_rooms_updated', handleRoomUpdate);
      window.removeEventListener('jaago_bookings_updated', handleBookingUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // ── Metrics KPI ────────────────────────────────────────────────────────────
  const totalRooms = rooms.length;
  const availableCount = rooms.filter((r) => r.status === 'Available').length;
  const maintenanceCount = rooms.filter((r) => r.status === 'Maintenance').length;
  const inUseCount = rooms.filter((r) => r.status === 'In Use' || r.status === 'Booked').length;
  const totalBookingsCount = bookings.length;

  // ── Filtered Rooms ─────────────────────────────────────────────────────────
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const q = roomSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        room.name.toLowerCase().includes(q) ||
        room.location.toLowerCase().includes(q) ||
        room.floor.toLowerCase().includes(q) ||
        room.amenities.some((a) => a.toLowerCase().includes(q));

      const matchesFloor = floorFilter === 'ALL' || room.floor.toLowerCase() === floorFilter.toLowerCase();
      const matchesStatus = statusFilter === 'ALL' || room.status === statusFilter;

      let matchesCapacity = true;
      if (capacityFilter === '2-5') matchesCapacity = room.capacity >= 2 && room.capacity <= 5;
      if (capacityFilter === '6-15') matchesCapacity = room.capacity >= 6 && room.capacity <= 15;
      if (capacityFilter === '16-30') matchesCapacity = room.capacity >= 16 && room.capacity <= 30;
      if (capacityFilter === '31+') matchesCapacity = room.capacity >= 31;

      return matchesSearch && matchesFloor && matchesStatus && matchesCapacity;
    });
  }, [rooms, roomSearch, floorFilter, statusFilter, capacityFilter]);

  // ── Filtered Bookings ──────────────────────────────────────────────────────
  const filteredBookings = useMemo(() => {
    return bookings
      .filter((b) => {
        const q = bookingSearch.toLowerCase().trim();
        const matchesSearch =
          !q ||
          b.title.toLowerCase().includes(q) ||
          b.bookedByName.toLowerCase().includes(q) ||
          (b.bookedByDept && b.bookedByDept.toLowerCase().includes(q)) ||
          (b.bookedByCode && b.bookedByCode.toLowerCase().includes(q)) ||
          b.roomName.toLowerCase().includes(q);

        const matchesRoom = bookingRoomFilter === 'ALL' || b.roomId === bookingRoomFilter;
        const matchesDate = !bookingDateFilter || b.date === bookingDateFilter;

        return matchesSearch && matchesRoom && matchesDate;
      })
      .sort((a, b) => {
        // Sort newest date first, then by time
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return timeStringToMinutes(a.startTime) - timeStringToMinutes(b.startTime);
      });
  }, [bookings, bookingSearch, bookingRoomFilter, bookingDateFilter]);

  // ── Room Handlers ──────────────────────────────────────────────────────────
  const handleOpenAddRoom = () => {
    setEditingRoom(null);
    setRoomFormData({
      name: `${rooms.length + 1}. New Meeting Room`,
      roomNumber: rooms.length + 1,
      capacity: 12,
      floor: 'Floor 1',
      location: 'Floor 1 • HQ - JAAGO Foundation',
      status: 'Available',
      amenities: ['Air Conditioned', 'High Speed WiFi', 'Wall Display TV'],
      image: ROOM_PRESET_IMAGES[rooms.length % ROOM_PRESET_IMAGES.length]?.url || '/rooms/room-1.jpg?v=2',
      description: 'Executive collaborative meeting space equipped for hybrid work.',
    });
    setShowRoomModal(true);
  };

  const handleOpenEditRoom = (room: MeetingRoom) => {
    setEditingRoom(room);
    setRoomFormData({ ...room });
    setShowRoomModal(true);
  };

  const handleToggleAmenity = (amenity: string) => {
    const current = roomFormData.amenities || [];
    if (current.includes(amenity)) {
      setRoomFormData({ ...roomFormData, amenities: current.filter((a) => a !== amenity) });
    } else {
      setRoomFormData({ ...roomFormData, amenities: [...current, amenity] });
    }
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
      roomNumber: editingRoom?.roomNumber || Number(roomFormData.roomNumber) || rooms.length + 1,
      capacity: Number(roomFormData.capacity) || 10,
      floor: roomFormData.floor?.trim() || 'Floor 1',
      location: roomFormData.location?.trim() || 'Floor 1 • HQ - JAAGO Foundation',
      status: (roomFormData.status as any) || 'Available',
      amenities: roomFormData.amenities && roomFormData.amenities.length > 0
        ? roomFormData.amenities
        : ['Air Conditioned', 'High Speed WiFi'],
      image: roomFormData.image?.trim() || '/rooms/room-1.jpg?v=2',
      description: roomFormData.description?.trim() || 'Collaborative workspace',
      createdAt: editingRoom?.createdAt || new Date().toISOString(),
    };

    saveMeetingRoom(payload);
    setShowRoomModal(false);
    showToast(editingRoom ? `Room "${payload.name}" updated successfully` : `Room "${payload.name}" registered successfully`);
  };

  const handleConfirmDeleteRoom = () => {
    if (!deleteRoomTarget) return;
    deleteMeetingRoom(deleteRoomTarget.id);
    showToast(`Room "${deleteRoomTarget.name}" deleted along with associated bookings.`, 'info');
    setDeleteRoomTarget(null);
  };

  const handleQuickStatusChange = (room: MeetingRoom, status: MeetingRoom['status']) => {
    saveMeetingRoom({ ...room, status });
    showToast(`"${room.name}" status updated to ${status}`);
  };

  // Live collision check for the active admin booking form inputs
  const liveConflict = useMemo(() => {
    if (!bookingFormData.roomId || !bookingFormData.date || !bookingFormData.startTime || !bookingFormData.endTime) return null;
    const conflict = checkRoomCollision(
      bookingFormData.roomId,
      bookingFormData.date,
      bookingFormData.startTime,
      bookingFormData.endTime,
      editingBooking?.id
    );
    if (conflict) {
      const room = rooms.find((r) => r.id === bookingFormData.roomId);
      return {
        roomName: room?.name || conflict.roomName,
        conflict,
      };
    }
    return null;
  }, [bookingFormData.roomId, bookingFormData.date, bookingFormData.startTime, bookingFormData.endTime, editingBooking, rooms, bookings]);

  // ── Booking Handlers ───────────────────────────────────────────────────────
  const handleOpenAddBooking = (room?: MeetingRoom) => {
    setEditingBooking(null);
    const targetRoom = room || rooms[0];
    const nowStart = getPresentTimeString();
    const nowEnd = getDefaultEndTimeString(nowStart);
    setBookingFormData({
      roomId: targetRoom ? targetRoom.id : '',
      title: '',
      date: getPresentDateString(),
      startTime: nowStart,
      endTime: nowEnd,
      bookedByName: 'Habibur Rahman',
      bookedByCode: 'AP0112',
      bookedByDept: 'Admin & Procurement',
      attendeesCount: targetRoom?.capacity ? Math.min(8, targetRoom.capacity) : 6,
      notes: '',
    });
    setShowBookingModal(true);
  };

  const handleOpenEditBooking = (b: RoomBooking) => {
    setEditingBooking(b);
    setBookingFormData({
      roomId: b.roomId,
      title: b.title,
      date: b.date,
      startTime: b.startTime,
      endTime: b.endTime,
      bookedByName: b.bookedByName,
      bookedByCode: b.bookedByCode || '',
      bookedByDept: b.bookedByDept || 'Admin & Procurement',
      attendeesCount: b.attendeesCount || 5,
      notes: b.notes || '',
    });
    setShowBookingModal(true);
  };

  const handleSaveBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingFormData.roomId) {
      showToast('Please select a meeting room', 'error');
      return;
    }
    if (!bookingFormData.title.trim()) {
      showToast('Please enter meeting title', 'error');
      return;
    }

    const startMin = timeStringToMinutes(bookingFormData.startTime);
    const endMin = timeStringToMinutes(bookingFormData.endTime);
    if (endMin <= startMin) {
      showToast('End time must be after start time', 'error');
      return;
    }

    const selectedRoom = rooms.find((r) => r.id === bookingFormData.roomId);
    if (!selectedRoom) {
      showToast('Selected room does not exist', 'error');
      return;
    }

    // Check collision (skip collision check against self if editing) — Strictly disallow duplicate booking
    const conflict = checkRoomCollision(
      bookingFormData.roomId,
      bookingFormData.date,
      bookingFormData.startTime,
      bookingFormData.endTime,
      editingBooking?.id
    );

    if (conflict) {
      setConflictAlert({
        roomName: selectedRoom.name,
        date: bookingFormData.date,
        startTime: bookingFormData.startTime,
        endTime: bookingFormData.endTime,
        conflictingBooking: conflict,
      });
      return; // Strictly do not allow duplicate booking
    }

    const bookingPayload: RoomBooking = {
      id: editingBooking?.id || `booking-${Date.now()}`,
      roomId: selectedRoom.id,
      roomName: selectedRoom.name,
      title: bookingFormData.title.trim(),
      date: bookingFormData.date,
      startTime: bookingFormData.startTime,
      endTime: bookingFormData.endTime,
      bookedByName: bookingFormData.bookedByName.trim(),
      bookedByCode: bookingFormData.bookedByCode.trim() || undefined,
      bookedByDept: bookingFormData.bookedByDept.trim() || undefined,
      attendeesCount: Number(bookingFormData.attendeesCount) || 2,
      notes: bookingFormData.notes.trim(),
      status: 'Confirmed',
      createdAt: editingBooking?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveRoomBooking(bookingPayload);
    setShowBookingModal(false);
    showToast(editingBooking ? 'Booking updated successfully' : 'Meeting room booked successfully');
  };

  const handleConfirmDeleteBooking = () => {
    if (!deleteBookingTarget) return;
    deleteRoomBooking(deleteBookingTarget.id);
    showToast(`Booking "${deleteBookingTarget.title}" has been deleted.`, 'info');
    setDeleteBookingTarget(null);
  };

  const handleSavePolicy = () => {
    try {
      localStorage.setItem('jaago_meeting_room_policy', JSON.stringify(policySettings));
      showToast('Meeting room policies and configuration saved successfully');
    } catch {
      showToast('Error saving policy settings', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto pb-20 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-2 text-xs font-bold animate-in slide-in-from-bottom-4 transition ${
            toastMsg.type === 'error'
              ? 'bg-rose-600 text-white'
              : toastMsg.type === 'info'
              ? 'bg-blue-600 text-white'
              : 'bg-[#F5C200] text-black'
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── HEADER ───────────────────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-4">
        <div className="flex items-center space-x-3.5">
          <div className="h-12 w-12 rounded-2xl bg-amber-500/20 text-amber-500 dark:text-amber-400 flex items-center justify-center font-black flex-shrink-0 shadow-sm border border-amber-500/30">
            <DoorOpen className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                Meeting Room Settings
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-primary/20 text-[#F5C200] border border-primary/40 text-xs font-black">
                Admin Control
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">
              HQ room infrastructure, capacity allocations, room additions/edits, and organization-wide booking management.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={loadData}
            className="p-2.5 rounded-xl bg-surface hover:bg-surface-elevated border border-border text-foreground transition cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </button>

          <button
            type="button"
            onClick={() => handleOpenAddBooking()}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-surface hover:bg-surface-elevated border border-border text-xs font-bold text-foreground transition cursor-pointer"
          >
            <CalendarIcon className="h-4 w-4 text-amber-500" />
            <span>Admin Book</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddRoom}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-black bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition transform active:scale-95 cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>ADD ROOM</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── KPI METRICS STRIP ────────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Total Rooms
            </span>
            <div className="text-2xl font-black text-foreground">{totalRooms}</div>
            <span className="text-[10px] text-muted-foreground">HQ floors &amp; pods</span>
          </div>
          <div className="h-11 w-11 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
            <DoorOpen className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Available Now
            </span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {availableCount}
            </div>
            <span className="text-[10px] text-muted-foreground">Ready for instant reservation</span>
          </div>
          <div className="h-11 w-11 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              In Use / Maint.
            </span>
            <div className="text-2xl font-black text-amber-500">
              {inUseCount + maintenanceCount}
            </div>
            <span className="text-[10px] text-muted-foreground">
              {maintenanceCount} maintenance • {inUseCount} occupied
            </span>
          </div>
          <div className="h-11 w-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Total Bookings
            </span>
            <div className="text-2xl font-black text-foreground">{totalBookingsCount}</div>
            <span className="text-[10px] text-muted-foreground">Company-wide reservations</span>
          </div>
          <div className="h-11 w-11 rounded-xl bg-primary/10 text-[#F5C200] flex items-center justify-center font-bold">
            <CalendarIcon className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── TAB NAVIGATION ───────────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="flex items-center space-x-2 border-b border-border pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('rooms')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'rooms'
              ? 'bg-primary/20 text-[#F5C200] border border-primary/40 font-black shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-surface'
          }`}
        >
          <DoorOpen className="h-4 w-4" />
          <span>Rooms Management ({rooms.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bookings')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'bookings'
              ? 'bg-primary/20 text-[#F5C200] border border-primary/40 font-black shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-surface'
          }`}
        >
          <CalendarIcon className="h-4 w-4" />
          <span>All Bookings Register ({bookings.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-primary/20 text-[#F5C200] border border-primary/40 font-black shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-surface'
          }`}
        >
          <Settings className="h-4 w-4" />
          <span>Room Policies &amp; Presets</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── TAB 1: ROOMS MANAGEMENT ──────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'rooms' && (
        <div className="space-y-5">
          {/* Filters Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
            {/* Search */}
            <div className="lg:col-span-5 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={roomSearch}
                onChange={(e) => setRoomSearch(e.target.value)}
                placeholder="Search rooms by name, floor, or amenities..."
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-card border border-border/80 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
              />
            </div>

            {/* Floor Filter */}
            <div className="lg:col-span-2">
              <select
                value={floorFilter}
                onChange={(e) => setFloorFilter(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-card border border-border/80 text-xs font-bold text-foreground focus:outline-none cursor-pointer shadow-2xs"
              >
                <option value="ALL">All Floors</option>
                <option value="Floor 1">Floor 1</option>
                <option value="Floor 2">Floor 2</option>
                <option value="Floor 3">Floor 3</option>
              </select>
            </div>

            {/* Capacity Filter */}
            <div className="lg:col-span-2">
              <select
                value={capacityFilter}
                onChange={(e) => setCapacityFilter(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-card border border-border/80 text-xs font-bold text-foreground focus:outline-none cursor-pointer shadow-2xs"
              >
                <option value="ALL">Any Capacity</option>
                <option value="2-5">2 - 5 Seats (Pods)</option>
                <option value="6-15">6 - 15 Seats (Medium)</option>
                <option value="16-30">16 - 30 Seats (Large)</option>
                <option value="31+">31+ Seats (Hall / Townhall)</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="lg:col-span-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-card border border-border/80 text-xs font-bold text-foreground focus:outline-none cursor-pointer shadow-2xs"
              >
                <option value="ALL">All Statuses</option>
                <option value="Available">Available</option>
                <option value="In Use">In Use</option>
                <option value="Booked">Booked</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="lg:col-span-1 flex justify-end">
              <div className="flex rounded-xl bg-card border border-border/80 p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    viewMode === 'cards'
                      ? 'bg-primary text-black font-black'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Card Grid"
                >
                  <Layers className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-primary text-black font-black'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Table View"
                >
                  <Sliders className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Cards View */}
          {viewMode === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredRooms.map((room) => {
                const roomBookings = bookings.filter((b) => b.roomId === room.id);
                return (
                  <div
                    key={room.id}
                    className="group rounded-3xl bg-card border border-border/80 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Image Header with Badges */}
                      <div className="relative h-44 w-full bg-surface overflow-hidden">
                        <img
                          src={room.image}
                          alt={room.name}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => {
                            (e.target as any).src = '/rooms/room-1.jpg';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                        {/* Top Badges */}
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                          <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white font-mono font-bold text-[11px] border border-white/10 flex items-center space-x-1">
                            <Users className="h-3 w-3 text-amber-400" />
                            <span>{room.capacity} seats</span>
                          </span>

                          <div className="flex items-center space-x-1.5">
                            <select
                              value={room.status}
                              onChange={(e) =>
                                handleQuickStatusChange(room, e.target.value as MeetingRoom['status'])
                              }
                              className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border shadow-xs cursor-pointer backdrop-blur-md focus:outline-none ${
                                room.status === 'Available'
                                  ? 'bg-emerald-500/90 text-white border-emerald-400'
                                  : room.status === 'Maintenance'
                                  ? 'bg-rose-500/90 text-white border-rose-400'
                                  : 'bg-amber-500/90 text-slate-950 border-amber-400'
                              }`}
                            >
                              <option value="Available" className="text-black bg-white">Available</option>
                              <option value="In Use" className="text-black bg-white">In Use</option>
                              <option value="Booked" className="text-black bg-white">Booked</option>
                              <option value="Maintenance" className="text-black bg-white">Maintenance</option>
                            </select>
                          </div>
                        </div>

                        {/* Bottom image overlay with Room Title */}
                        <div className="absolute bottom-3 left-3 right-3">
                          <h3 className="font-black text-white text-base leading-tight drop-shadow-sm line-clamp-1">
                            {room.name}
                          </h3>
                          <div className="flex items-center space-x-1 text-[11px] text-amber-300 font-bold mt-0.5">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{room.location}</span>
                          </div>
                        </div>
                      </div>

                      {/* Content Body */}
                      <div className="p-4 space-y-3">
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {room.description || 'No description provided.'}
                        </p>

                        {/* Amenities Chips */}
                        <div className="flex flex-wrap gap-1">
                          {room.amenities.slice(0, 4).map((amenity, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-lg bg-surface border border-border text-[10px] font-semibold text-muted-foreground"
                            >
                              {amenity}
                            </span>
                          ))}
                          {room.amenities.length > 4 && (
                            <span className="px-1.5 py-0.5 rounded-lg bg-surface border border-border text-[10px] font-bold text-amber-500">
                              +{room.amenities.length - 4} more
                            </span>
                          )}
                        </div>

                        <div className="pt-2 border-t border-border/70 flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Floor: <strong className="text-foreground">{room.floor}</strong></span>
                          <span>Active bookings: <strong className="text-foreground">{roomBookings.length}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Actions Footer */}
                    <div className="p-4 pt-0 grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenAddBooking(room)}
                        className="py-2 px-2 rounded-xl bg-surface hover:bg-surface-elevated border border-border text-foreground font-bold text-[11px] uppercase tracking-wider transition text-center cursor-pointer flex items-center justify-center space-x-1"
                        title="Book this room"
                      >
                        <CalendarIcon className="h-3 w-3 text-amber-500" />
                        <span>Book</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEditRoom(room)}
                        className="py-2 px-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-extrabold text-[11px] uppercase tracking-wider transition text-center cursor-pointer flex items-center justify-center space-x-1"
                        title="Edit Room Details"
                      >
                        <Edit2 className="h-3 w-3" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteRoomTarget(room)}
                        className="py-2 px-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-500 font-extrabold text-[11px] uppercase tracking-wider transition text-center cursor-pointer flex items-center justify-center space-x-1"
                        title="Delete Room"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Table View */}
          {viewMode === 'table' && (
            <div className="rounded-3xl bg-card border border-border/80 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface border-b border-border/80 text-[11px] uppercase tracking-wider font-extrabold text-muted-foreground">
                    <tr>
                      <th className="py-3.5 px-4">Room Information</th>
                      <th className="py-3.5 px-4">Floor &amp; Location</th>
                      <th className="py-3.5 px-4">Capacity</th>
                      <th className="py-3.5 px-4">Amenities</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Bookings</th>
                      <th className="py-3.5 px-4 text-right">Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredRooms.map((room) => {
                      const roomBookings = bookings.filter((b) => b.roomId === room.id);
                      return (
                        <tr key={room.id} className="hover:bg-surface/50 transition">
                          <td className="py-3.5 px-4">
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
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-foreground text-xs">{room.floor}</div>
                            <div className="text-[11px] text-muted-foreground">{room.location}</div>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                            {room.capacity} seats
                          </td>
                          <td className="py-3.5 px-4">
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
                          <td className="py-3.5 px-4">
                            <select
                              value={room.status}
                              onChange={(e) =>
                                handleQuickStatusChange(room, e.target.value as MeetingRoom['status'])
                              }
                              className={`text-[10px] font-black uppercase px-2 py-1 rounded-full border shadow-2xs cursor-pointer focus:outline-none ${
                                room.status === 'Available'
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                  : room.status === 'Maintenance'
                                  ? 'bg-rose-500/15 text-rose-500 border-rose-500/30'
                                  : 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                              }`}
                            >
                              <option value="Available">Available</option>
                              <option value="In Use">In Use</option>
                              <option value="Booked">Booked</option>
                              <option value="Maintenance">Maintenance</option>
                            </select>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                            {roomBookings.length}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenAddBooking(room)}
                                className="p-1.5 rounded-xl text-muted-foreground hover:text-amber-500 hover:bg-surface transition cursor-pointer"
                                title="Book Room"
                              >
                                <CalendarIcon className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditRoom(room)}
                                className="p-1.5 rounded-xl text-muted-foreground hover:text-amber-500 hover:bg-surface transition cursor-pointer"
                                title="Edit Room"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteRoomTarget(room)}
                                className="p-1.5 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-surface transition cursor-pointer"
                                title="Delete Room"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── TAB 2: ALL BOOKINGS REGISTER ─────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'bookings' && (
        <div className="space-y-5">
          {/* Booking Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
            {/* Search */}
            <div className="lg:col-span-5 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={bookingSearch}
                onChange={(e) => setBookingSearch(e.target.value)}
                placeholder="Search by title, staff name, employee code, or department..."
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-card border border-border/80 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
              />
            </div>

            {/* Room Filter */}
            <div className="lg:col-span-3">
              <select
                value={bookingRoomFilter}
                onChange={(e) => setBookingRoomFilter(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-card border border-border/80 text-xs font-bold text-foreground focus:outline-none cursor-pointer shadow-2xs"
              >
                <option value="ALL">All Meeting Rooms</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Filter */}
            <div className="lg:col-span-2">
              <input
                type="date"
                value={bookingDateFilter}
                onChange={(e) => setBookingDateFilter(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-card border border-border/80 text-xs font-bold text-foreground focus:outline-none cursor-pointer shadow-2xs"
              />
            </div>

            {/* Reset Filter Button */}
            <div className="lg:col-span-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setBookingSearch('');
                  setBookingRoomFilter('ALL');
                  setBookingDateFilter('');
                }}
                className="px-3.5 py-2.5 rounded-xl bg-surface hover:bg-surface-elevated border border-border text-xs font-bold text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Bookings Table */}
          <div className="rounded-3xl bg-card border border-border/80 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface border-b border-border/80 text-[11px] uppercase tracking-wider font-extrabold text-muted-foreground">
                  <tr>
                    <th className="py-3.5 px-4">Date &amp; Schedule</th>
                    <th className="py-3.5 px-4">Room</th>
                    <th className="py-3.5 px-4">Meeting Title &amp; Agenda</th>
                    <th className="py-3.5 px-4">Booked By</th>
                    <th className="py-3.5 px-4">Attendees</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground">
                        <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-40 text-muted-foreground" />
                        <p className="font-bold text-xs">No bookings match the selected criteria.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-surface/50 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-black text-foreground text-xs">
                            {formatDayDisplay(b.date)}
                          </div>
                          <div className="font-mono font-extrabold text-amber-600 dark:text-amber-400 text-[11px]">
                            {b.startTime} - {b.endTime}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-foreground text-xs flex items-center space-x-1.5">
                            <DoorOpen className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                            <span>{b.roomName}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-black text-foreground text-xs">{b.title}</div>
                          {b.notes && (
                            <div className="text-[11px] text-muted-foreground line-clamp-1 italic">
                              &ldquo;{b.notes}&rdquo;
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-2.5">
                            <div className="h-7 w-7 rounded-full bg-primary/20 text-[#F5C200] border border-primary/30 flex items-center justify-center font-black text-[11px] flex-shrink-0">
                              {b.bookedByName.slice(0, 1)}
                            </div>
                            <div>
                              <div className="font-bold text-foreground text-xs">{b.bookedByName}</div>
                              <div className="text-[10px] text-muted-foreground">
                                {b.bookedByDept || 'JAAGO Team'}
                                {b.bookedByCode ? ` • ${b.bookedByCode}` : ''}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-lg bg-surface border border-border text-[11px] font-mono font-bold text-foreground">
                            {b.attendeesCount || 2} seats
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            Confirmed
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditBooking(b)}
                              className="p-1.5 rounded-xl text-muted-foreground hover:text-amber-500 hover:bg-surface transition cursor-pointer"
                              title="Reschedule / Edit Booking"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteBookingTarget(b)}
                              className="p-1.5 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-surface transition cursor-pointer"
                              title="Delete / Cancel Booking"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── TAB 3: ROOM SETTINGS & POLICIES ──────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-xs space-y-5">
            <div className="border-b border-border/70 pb-3">
              <h3 className="font-black text-foreground text-sm flex items-center space-x-2">
                <Sliders className="h-4 w-4 text-amber-500" />
                <span>Operating Hours &amp; Reservation Limits</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure standard operating schedules and maximum advance booking limits.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-muted-foreground block">
                  Operating Start Time
                </label>
                <input
                  type="time"
                  value={policySettings.operatingHoursStart}
                  onChange={(e) =>
                    setPolicySettings({ ...policySettings, operatingHoursStart: e.target.value })
                  }
                  className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs font-bold text-foreground focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-muted-foreground block">
                  Operating End Time
                </label>
                <input
                  type="time"
                  value={policySettings.operatingHoursEnd}
                  onChange={(e) =>
                    setPolicySettings({ ...policySettings, operatingHoursEnd: e.target.value })
                  }
                  className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs font-bold text-foreground focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-muted-foreground block">
                  Max Advance Window (Days)
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={policySettings.maxAdvanceDays}
                  onChange={(e) =>
                    setPolicySettings({ ...policySettings, maxAdvanceDays: Number(e.target.value) || 30 })
                  }
                  className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs font-bold text-foreground focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-muted-foreground block">
                  Default Duration (Minutes)
                </label>
                <input
                  type="number"
                  min={15}
                  step={15}
                  max={240}
                  value={policySettings.defaultDurationMinutes}
                  onChange={(e) =>
                    setPolicySettings({
                      ...policySettings,
                      defaultDurationMinutes: Number(e.target.value) || 60,
                    })
                  }
                  className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs font-bold text-foreground focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase text-muted-foreground block">
                Auto-Release No-Show Buffer (Minutes)
              </label>
              <input
                type="number"
                min={5}
                max={60}
                value={policySettings.autoReleaseMinutes}
                onChange={(e) =>
                  setPolicySettings({
                    ...policySettings,
                    autoReleaseMinutes: Number(e.target.value) || 15,
                  })
                }
                className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs font-bold text-foreground focus:outline-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSavePolicy}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider shadow-md hover:bg-primary/90 transition cursor-pointer"
              >
                Save Room Policies
              </button>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-xs space-y-5">
            <div className="border-b border-border/70 pb-3">
              <h3 className="font-black text-foreground text-sm flex items-center space-x-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>Standard Facilities &amp; Equipment Checklist</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Standard equipment templates automatically made available during room configuration.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {STANDARD_AMENITIES.map((amenity, i) => (
                <div
                  key={i}
                  className="px-3 py-1.5 rounded-xl bg-surface border border-border text-xs font-bold text-foreground flex items-center space-x-1.5"
                >
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span>{amenity}</span>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-medium space-y-1">
              <div className="font-bold flex items-center space-x-1.5">
                <Info className="h-4 w-4" />
                <span>Admin &amp; User View Synchronization Notice</span>
              </div>
              <p>
                All meeting room additions, modifications, and deletions saved here are automatically synced in real time across My Dashboard (Request Meeting Room) and Admin &amp; Procurement.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── MODAL: ADD / EDIT ROOM ───────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {showRoomModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl bg-card border border-border shadow-2xl p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="h-9 w-9 rounded-xl bg-primary/20 text-[#F5C200] flex items-center justify-center font-bold">
                  <DoorOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-foreground">
                    {editingRoom ? 'Edit Meeting Room Details' : 'Register New Meeting Room'}
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-medium">
                    Configure room specifications, capacity, and amenities.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRoomModal(false)}
                className="p-1 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoom} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Room Name <span className="text-amber-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={roomFormData.name || ''}
                    onChange={(e) => setRoomFormData({ ...roomFormData, name: e.target.value })}
                    placeholder="e.g. 1. Meeting Room In"
                    className="w-full h-10 px-3.5 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Room Number
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={roomFormData.roomNumber || 1}
                    onChange={(e) =>
                      setRoomFormData({ ...roomFormData, roomNumber: Number(e.target.value) })
                    }
                    className="w-full h-10 px-3.5 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Capacity (Seats) <span className="text-amber-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={250}
                    required
                    value={roomFormData.capacity || 10}
                    onChange={(e) =>
                      setRoomFormData({ ...roomFormData, capacity: Number(e.target.value) })
                    }
                    className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Floor
                  </label>
                  <select
                    value={roomFormData.floor || 'Floor 1'}
                    onChange={(e) => setRoomFormData({ ...roomFormData, floor: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs font-bold text-foreground focus:outline-none cursor-pointer"
                  >
                    <option value="Floor 1">Floor 1</option>
                    <option value="Floor 2">Floor 2</option>
                    <option value="Floor 3">Floor 3</option>
                    <option value="Basement">Basement</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Status
                  </label>
                  <select
                    value={roomFormData.status || 'Available'}
                    onChange={(e) =>
                      setRoomFormData({ ...roomFormData, status: e.target.value as any })
                    }
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
                  placeholder="Floor 1 • HQ - JAAGO Foundation"
                  className="w-full h-10 px-3.5 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground focus:outline-none"
                />
              </div>

              {/* Photo Selector with Presets */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Room Photo (Select Preset or Provide URL)
                </label>
                <div className="grid grid-cols-5 gap-2 overflow-x-auto pb-1">
                  {ROOM_PRESET_IMAGES.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setRoomFormData({ ...roomFormData, image: preset.url })}
                      className={`relative h-14 rounded-xl overflow-hidden border-2 transition cursor-pointer ${
                        roomFormData.image === preset.url
                          ? 'border-primary ring-2 ring-primary/40'
                          : 'border-border/60 hover:border-border'
                      }`}
                      title={preset.label}
                    >
                      <img
                        src={preset.url}
                        alt={preset.label}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as any).src = '/rooms/room-1.jpg';
                        }}
                      />
                      {roomFormData.image === preset.url && (
                        <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                          <Check className="h-4 w-4 text-black font-black" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={roomFormData.image || ''}
                  onChange={(e) => setRoomFormData({ ...roomFormData, image: e.target.value })}
                  placeholder="https://... or /rooms/room-1.jpg"
                  className="w-full h-9 px-3 rounded-xl bg-surface border border-border text-xs font-medium text-foreground focus:outline-none"
                />
              </div>

              {/* Amenities Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Amenities &amp; Facilities
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 rounded-2xl bg-surface/50 border border-border">
                  {STANDARD_AMENITIES.map((a) => {
                    const selected = (roomFormData.amenities || []).includes(a);
                    return (
                      <button
                        key={a}
                        type="button"
                        onClick={() => handleToggleAmenity(a)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center space-x-1 ${
                          selected
                            ? 'bg-primary text-black'
                            : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {selected && <Check className="h-3 w-3" />}
                        <span>{a}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={roomFormData.description || ''}
                  onChange={(e) =>
                    setRoomFormData({ ...roomFormData, description: e.target.value })
                  }
                  placeholder="Detailed description of room setup, suitability, and audio-video equipment..."
                  className="w-full p-2.5 rounded-xl bg-surface border border-border text-xs font-medium text-foreground focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-border/70">
                <button
                  type="button"
                  onClick={() => setShowRoomModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-surface text-muted-foreground text-xs font-bold cursor-pointer hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider shadow-md hover:bg-primary/90 transition cursor-pointer"
                >
                  {editingRoom ? 'Save Changes' : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── MODAL: CONFIRM DELETE ROOM ───────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {deleteRoomTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-card border border-border shadow-2xl p-6 space-y-4">
            <div className="flex items-center space-x-3 text-rose-500">
              <div className="h-10 w-10 rounded-2xl bg-rose-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-black text-foreground text-base">Delete Meeting Room?</h3>
                <p className="text-[11px] text-muted-foreground">This action cannot be undone.</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface border border-border text-xs space-y-1.5">
              <div>
                Room Name: <strong className="text-foreground">{deleteRoomTarget.name}</strong>
              </div>
              <div>
                Location: <span className="text-muted-foreground">{deleteRoomTarget.location}</span>
              </div>
              <div className="text-rose-500 font-semibold pt-1">
                Notice: All upcoming and historical bookings associated with this room will also be removed.
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteRoomTarget(null)}
                className="px-4 py-2.5 rounded-xl bg-surface text-muted-foreground text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteRoom}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider shadow-md transition cursor-pointer"
              >
                Delete Room
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── MODAL: CONFIRM DELETE BOOKING ────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {deleteBookingTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-card border border-border shadow-2xl p-6 space-y-4">
            <div className="flex items-center space-x-3 text-rose-500">
              <div className="h-10 w-10 rounded-2xl bg-rose-500/10 flex items-center justify-center">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-black text-foreground text-base">Delete Room Booking?</h3>
                <p className="text-[11px] text-muted-foreground">
                  Admin override: Cancels and deletes this booking immediately.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface border border-border text-xs space-y-2">
              <div>
                Meeting Title: <strong className="text-foreground">{deleteBookingTarget.title}</strong>
              </div>
              <div>
                Room: <span className="font-bold text-amber-500">{deleteBookingTarget.roomName}</span>
              </div>
              <div>
                Date &amp; Time: <span className="text-muted-foreground">{deleteBookingTarget.date} ({deleteBookingTarget.startTime} - {deleteBookingTarget.endTime})</span>
              </div>
              <div>
                Booked By: <strong className="text-foreground">{deleteBookingTarget.bookedByName}</strong> ({deleteBookingTarget.bookedByDept || 'JAAGO'})
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteBookingTarget(null)}
                className="px-4 py-2.5 rounded-xl bg-surface text-muted-foreground text-xs font-bold cursor-pointer"
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteBooking}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider shadow-md transition cursor-pointer"
              >
                Cancel &amp; Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── MODAL: ADD / EDIT BOOKING (ADMIN) ────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl bg-card border border-border shadow-2xl p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="h-9 w-9 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
                  <CalendarIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-foreground">
                    {editingBooking ? 'Reschedule / Edit Booking' : 'Administer New Booking'}
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-medium">
                    Schedule reservations directly on behalf of any department.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBookingModal(false)}
                className="p-1 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBooking} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Select Room <span className="text-amber-500">*</span>
                </label>
                <select
                  required
                  value={bookingFormData.roomId}
                  onChange={(e) => setBookingFormData({ ...bookingFormData, roomId: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs font-bold text-foreground focus:outline-none cursor-pointer"
                >
                  <option value="">-- Choose a Meeting Room --</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.capacity} seats • {r.floor})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Meeting Title / Purpose <span className="text-amber-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={bookingFormData.title}
                  onChange={(e) => setBookingFormData({ ...bookingFormData, title: e.target.value })}
                  placeholder="e.g. Executive Procurement Review"
                  className="w-full h-10 px-3.5 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Date <span className="text-amber-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={bookingFormData.date}
                    onChange={(e) => setBookingFormData({ ...bookingFormData, date: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs font-bold text-foreground focus:outline-none cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Start Time <span className="text-amber-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={bookingFormData.startTime}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      const startMin = timeStringToMinutes(newStart);
                      const endMin = timeStringToMinutes(bookingFormData.endTime);
                      const newEnd = endMin <= startMin ? getDefaultEndTimeString(newStart) : bookingFormData.endTime;
                      setBookingFormData({ ...bookingFormData, startTime: newStart, endTime: newEnd });
                    }}
                    className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs font-bold text-foreground focus:outline-none cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    End Time <span className="text-amber-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={bookingFormData.endTime}
                    onChange={(e) =>
                      setBookingFormData({ ...bookingFormData, endTime: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs font-bold text-foreground focus:outline-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Live Collision / Duplicate Warning inside Admin Form */}
              {liveConflict && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs space-y-1.5 animate-in fade-in">
                  <div className="flex items-center space-x-1.5 text-rose-600 dark:text-rose-400 font-bold">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>Time Conflict / Duplicate Detected</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    This room is already reserved on <span className="font-bold text-foreground">{bookingFormData.date}</span> from <span className="font-bold text-rose-600 dark:text-rose-400">{liveConflict.conflict.startTime} to {liveConflict.conflict.endTime}</span> for &ldquo;<span className="font-semibold text-foreground">{liveConflict.conflict.title}</span>&rdquo; by <span className="font-bold text-foreground">{liveConflict.conflict.bookedByName}</span>.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Booked On Behalf Of (Name) <span className="text-amber-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={bookingFormData.bookedByName}
                    onChange={(e) =>
                      setBookingFormData({ ...bookingFormData, bookedByName: e.target.value })
                    }
                    placeholder="Staff Member Name"
                    className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Department
                  </label>
                  <input
                    type="text"
                    value={bookingFormData.bookedByDept}
                    onChange={(e) =>
                      setBookingFormData({ ...bookingFormData, bookedByDept: e.target.value })
                    }
                    placeholder="e.g. Admin & Procurement"
                    className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Attendees Count
                </label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={bookingFormData.attendeesCount}
                  onChange={(e) =>
                    setBookingFormData({
                      ...bookingFormData,
                      attendeesCount: Number(e.target.value) || 2,
                    })
                  }
                  className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Meeting Notes / Agenda
                </label>
                <textarea
                  rows={2}
                  value={bookingFormData.notes}
                  onChange={(e) =>
                    setBookingFormData({ ...bookingFormData, notes: e.target.value })
                  }
                  placeholder="Optional meeting notes..."
                  className="w-full p-2.5 rounded-xl bg-surface border border-border text-xs font-medium text-foreground focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-border/70">
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-surface text-muted-foreground text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider shadow-md hover:bg-primary/90 transition cursor-pointer"
                >
                  {editingBooking ? 'Update Booking' : 'Confirm Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── MODAL: BOOKING CONFLICT / DUPLICATE POP-UP ALERT ──────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <BookingConflictModal
        conflict={conflictAlert}
        onClose={() => setConflictAlert(null)}
      />
    </div>
  );
}
