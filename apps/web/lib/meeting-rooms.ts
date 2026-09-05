'use client';

export interface MeetingRoom {
  id: string;
  name: string;
  roomNumber: number;
  capacity: number;
  floor: string;
  location: string;
  status: 'Available' | 'In Use' | 'Booked' | 'Maintenance';
  amenities: string[];
  image: string;
  description: string;
  color?: string;
  createdAt?: string;
}

export interface RoomBooking {
  id: string;
  roomId: string;
  roomName: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // "11:00" (24h) or "11:00 AM"
  endTime: string; // "13:00" (24h) or "01:00 PM"
  bookedByName: string;
  bookedByCode?: string;
  bookedByDept?: string;
  bookedByAvatar?: string;
  attendeesCount?: number;
  notes?: string;
  status?: 'Confirmed' | 'Cancelled' | 'Pending';
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_ROOMS: MeetingRoom[] = [
  {
    id: 'room-1',
    name: '1. Meeting Room In',
    roomNumber: 1,
    capacity: 20,
    floor: 'Floor 1',
    location: 'Floor 1 • HQ - JAAGO Foundation',
    status: 'Available',
    amenities: ['20 Chairs', 'Projector & Screen', 'Video Conference Camera', 'High Speed WiFi', 'Air Conditioned', 'Whiteboard'],
    image: '/rooms/room-1.jpg',
    description: 'Internal presentation and hybrid team conferencing hall with theater-style and classroom chair arrangement.',
    color: 'amber',
  },
  {
    id: 'room-2',
    name: '2. Meeting Room Out',
    roomNumber: 2,
    capacity: 20,
    floor: 'Floor 1',
    location: 'Floor 1 • HQ - JAAGO Foundation',
    status: 'Available',
    amenities: ['Conference Table', '20 Executive Chairs', 'Wall Display TV', 'Conference Mic', 'Air Conditioned', 'Whiteboard'],
    image: '/rooms/room-2.jpg',
    description: 'Formal executive board meeting room featuring a solid wood conference table and multimedia video conferencing gear.',
    color: 'blue',
  },
  {
    id: 'room-3',
    name: '3. Meeting Room In & Out',
    roomNumber: 3,
    capacity: 60,
    floor: 'Floor 1',
    location: 'Floor 1 • HQ - JAAGO Foundation',
    status: 'Available',
    amenities: ['60 Audience Chairs', 'Dual Laser Projector', 'Stage Audio System', 'Wireless Microphones', 'Central AC', 'Podium'],
    image: '/rooms/room-3.jpg',
    description: 'Large multifunctional auditorium & training hall suited for all-hands townhalls, workshops, and youth leadership assemblies.',
    color: 'purple',
  },
  {
    id: 'room-4',
    name: '4. VBD Lounge',
    roomNumber: 4,
    capacity: 10,
    floor: 'Floor 1',
    location: 'Floor 1 • HQ - JAAGO Foundation',
    status: 'Available',
    amenities: ['Glass Enclosure', 'Lounge Chairs & Table', 'Coffee Bar Access', 'Whiteboard', 'Air Conditioned'],
    image: '/rooms/room-4.jpg',
    description: 'Volunteer for Bangladesh (VBD) executive lounge & collaborative brainstorming nook with cozy acoustic setup.',
    color: 'emerald',
  },
  {
    id: 'room-5',
    name: '5. Quiet Room-2nd Floor',
    roomNumber: 5,
    capacity: 2,
    floor: 'Floor 2',
    location: 'Floor 2 • HQ - JAAGO Foundation',
    status: 'Available',
    amenities: ['Soundproof Booth', 'Ergonomic Task Chairs', 'Power & USB Hubs', 'Focus Lighting', 'Air Conditioned'],
    image: '/rooms/room-5.jpg',
    description: 'Dedicated soundproof acoustic focus pod designed for confidential 1-on-1 appraisals, donor calls, and deep work.',
    color: 'rose',
  },
  {
    id: 'room-6',
    name: '6. Quiet Room-1st Floor',
    roomNumber: 6,
    capacity: 3,
    floor: 'Floor 1',
    location: 'Floor 1 • HQ - JAAGO Foundation',
    status: 'Available',
    amenities: ['Round Meeting Table', '3 Mesh Chairs', 'Whiteboard', 'Air Conditioned', 'Power Strip'],
    image: '/rooms/room-6.jpg',
    description: 'Compact round-table huddle space for fast tactical check-ins, sprint reviews, and peer design syncs.',
    color: 'teal',
  },
  {
    id: 'room-7',
    name: '7. Ground Floor',
    roomNumber: 7,
    capacity: 6,
    floor: 'Ground Floor',
    location: 'Ground Floor • HQ - JAAGO Foundation',
    status: 'Available',
    amenities: ['Open Collaborative Table', 'Standing Desk Station', 'High-Speed WiFi', 'Power Bar', 'Natural Light'],
    image: '/rooms/room-7.jpg',
    description: 'Ground floor agile team collaboration station offering instant walk-in accessibility and open-air natural lighting.',
    color: 'amber',
  },
];

export const DEFAULT_BOOKINGS: RoomBooking[] = [
  // ── September 1, 2026
  {
    id: 'b-101',
    roomId: 'room-1',
    roomName: '1. Meeting Room In',
    title: 'Her Vote Her Seat: Upcoming Activities Discussion',
    date: '2026-09-01',
    startTime: '15:00',
    endTime: '16:30',
    bookedByName: 'Monower Hossain',
    bookedByDept: 'Program Implementation',
    attendeesCount: 12,
    notes: 'Co-design workshop for field mobilization.',
    status: 'Confirmed',
    createdAt: '2026-08-25T10:00:00Z',
    updatedAt: '2026-08-25T10:00:00Z',
  },
  {
    id: 'b-102',
    roomId: 'room-2',
    roomName: '2. Meeting Room Out',
    title: 'JAAGO HUB Technical Architecture Sync',
    date: '2026-09-01',
    startTime: '17:00',
    endTime: '18:30',
    bookedByName: 'Nasif Kamal',
    bookedByDept: "Founder's Office / FC",
    attendeesCount: 8,
    notes: 'BioTime TCP heartbeat daemon and RBAC security lock.',
    status: 'Confirmed',
    createdAt: '2026-08-26T11:00:00Z',
    updatedAt: '2026-08-26T11:00:00Z',
  },
  {
    id: 'b-103',
    roomId: 'room-3',
    roomName: '3. Meeting Room In & Out',
    title: 'NexGen Youth Leadership Kickoff',
    date: '2026-09-01',
    startTime: '17:00',
    endTime: '19:00',
    bookedByName: 'S M Nayeem Rahman',
    bookedByDept: 'Youth Development & VBD',
    attendeesCount: 45,
    notes: 'Orientation for 45 incoming regional youth ambassadors.',
    status: 'Confirmed',
    createdAt: '2026-08-27T09:00:00Z',
    updatedAt: '2026-08-27T09:00:00Z',
  },
  {
    id: 'b-104',
    roomId: 'room-4',
    roomName: '4. VBD Lounge',
    title: 'Volunteer Operations Budget Alignment',
    date: '2026-09-01',
    startTime: '11:00',
    endTime: '12:30',
    bookedByName: 'Md. Rajvi Hasan',
    bookedByDept: 'Finance & Accounts',
    attendeesCount: 6,
    status: 'Confirmed',
    createdAt: '2026-08-28T14:00:00Z',
    updatedAt: '2026-08-28T14:00:00Z',
  },
  {
    id: 'b-105',
    roomId: 'room-5',
    roomName: '5. Quiet Room-2nd Floor',
    title: 'Confidential Performance Appraisal Review',
    date: '2026-09-01',
    startTime: '14:00',
    endTime: '15:00',
    bookedByName: 'Tanvir Islam',
    bookedByDept: 'People and Culture',
    attendeesCount: 2,
    status: 'Confirmed',
    createdAt: '2026-08-28T15:00:00Z',
    updatedAt: '2026-08-28T15:00:00Z',
  },
  {
    id: 'b-106',
    roomId: 'room-6',
    roomName: '6. Quiet Room-1st Floor',
    title: 'Donor Grant Financial Checklist',
    date: '2026-09-01',
    startTime: '10:00',
    endTime: '11:30',
    bookedByName: 'Farhan Ahmed',
    bookedByDept: 'Finance & Grants',
    attendeesCount: 3,
    status: 'Confirmed',
    createdAt: '2026-08-29T08:00:00Z',
    updatedAt: '2026-08-29T08:00:00Z',
  },
  {
    id: 'b-107',
    roomId: 'room-7',
    roomName: '7. Ground Floor',
    title: 'DSP Digital Classroom Teacher Sync',
    date: '2026-09-01',
    startTime: '13:00',
    endTime: '14:30',
    bookedByName: 'Sharmin Akter',
    bookedByDept: 'Digital School Program',
    attendeesCount: 6,
    status: 'Confirmed',
    createdAt: '2026-08-29T09:00:00Z',
    updatedAt: '2026-08-29T09:00:00Z',
  },

  // ── September 2, 2026
  {
    id: 'b-201',
    roomId: 'room-2',
    roomName: '2. Meeting Room Out',
    title: 'Interview Coordinator, Finance',
    date: '2026-09-02',
    startTime: '11:00',
    endTime: '13:00',
    bookedByName: 'Maung Than Aye',
    bookedByDept: 'People and Culture',
    attendeesCount: 5,
    notes: 'Candidate panel interview for Senior Finance Officer.',
    status: 'Confirmed',
    createdAt: '2026-08-29T10:00:00Z',
    updatedAt: '2026-08-29T10:00:00Z',
  },
  {
    id: 'b-202',
    roomId: 'room-4',
    roomName: '4. VBD Lounge',
    title: 'Her Vote Her Seat Budget Review',
    date: '2026-09-02',
    startTime: '11:00',
    endTime: '12:15',
    bookedByName: 'Md. Rajvi Hasan',
    bookedByDept: 'Finance & Accounts',
    attendeesCount: 6,
    status: 'Confirmed',
    createdAt: '2026-08-29T11:00:00Z',
    updatedAt: '2026-08-29T11:00:00Z',
  },
  {
    id: 'b-203',
    roomId: 'room-1',
    roomName: '1. Meeting Room In',
    title: 'Her Vote Her Seat: Discussion on Upcoming Activities',
    date: '2026-09-02',
    startTime: '13:00',
    endTime: '14:00',
    bookedByName: 'Monower Hossain',
    bookedByDept: 'Program Implementation',
    attendeesCount: 14,
    status: 'Confirmed',
    createdAt: '2026-08-30T09:00:00Z',
    updatedAt: '2026-08-30T09:00:00Z',
  },
  {
    id: 'b-204',
    roomId: 'room-3',
    roomName: '3. Meeting Room In & Out',
    title: 'Audit Exit Meeting | Shomotay Tarunno',
    date: '2026-09-02',
    startTime: '16:00',
    endTime: '17:00',
    bookedByName: 'Sharmin Akter',
    bookedByDept: 'Compliance & Audit',
    attendeesCount: 25,
    status: 'Confirmed',
    createdAt: '2026-08-30T10:00:00Z',
    updatedAt: '2026-08-30T10:00:00Z',
  },
  {
    id: 'b-205',
    roomId: 'room-2',
    roomName: '2. Meeting Room Out',
    title: 'Shomotay Tarunno Gender Award Planning Meeting',
    date: '2026-09-02',
    startTime: '17:00',
    endTime: '18:30',
    bookedByName: 'Nusrat Jahan',
    bookedByDept: 'Program Implementation',
    attendeesCount: 12,
    status: 'Confirmed',
    createdAt: '2026-08-30T11:00:00Z',
    updatedAt: '2026-08-30T11:00:00Z',
  },

  // ── September 3, 2026
  {
    id: 'b-301',
    roomId: 'room-4',
    roomName: '4. VBD Lounge',
    title: 'Interview: Program Coordinator',
    date: '2026-09-03',
    startTime: '15:30',
    endTime: '17:00',
    bookedByName: 'Maung Than Aye',
    bookedByDept: 'People and Culture',
    attendeesCount: 4,
    status: 'Confirmed',
    createdAt: '2026-08-30T14:00:00Z',
    updatedAt: '2026-08-30T14:00:00Z',
  },
  {
    id: 'b-302',
    roomId: 'room-1',
    roomName: '1. Meeting Room In',
    title: 'Interview_Accounts Officer Round 2',
    date: '2026-09-03',
    startTime: '15:30',
    endTime: '16:30',
    bookedByName: 'Monower Hossain',
    bookedByDept: 'Finance & Accounts',
    attendeesCount: 6,
    status: 'Confirmed',
    createdAt: '2026-08-31T09:00:00Z',
    updatedAt: '2026-08-31T09:00:00Z',
  },
  {
    id: 'b-303',
    roomId: 'room-2',
    roomName: '2. Meeting Room Out',
    title: 'nexgen Core Team Sync',
    date: '2026-09-03',
    startTime: '15:02',
    endTime: '16:30',
    bookedByName: 'S M Nayeem Rahman',
    bookedByDept: 'Youth Development & VBD',
    attendeesCount: 10,
    status: 'Confirmed',
    createdAt: '2026-08-31T10:00:00Z',
    updatedAt: '2026-08-31T10:00:00Z',
  },

  // ── September 4, 2026 (Today)
  {
    id: 'b-401',
    roomId: 'room-1',
    roomName: '1. Meeting Room In',
    title: 'Executive Director & SMT Weekly Alignment',
    date: '2026-09-04',
    startTime: '10:00',
    endTime: '11:30',
    bookedByName: 'Korvi Rakshand (Founder & ED)',
    bookedByDept: "Founder's Office",
    attendeesCount: 15,
    status: 'Confirmed',
    createdAt: '2026-09-01T09:00:00Z',
    updatedAt: '2026-09-01T09:00:00Z',
  },
  {
    id: 'b-402',
    roomId: 'room-3',
    roomName: '3. Meeting Room In & Out',
    title: 'JAAGO Foundation All-Hands Townhall',
    date: '2026-09-04',
    startTime: '15:00',
    endTime: '17:00',
    bookedByName: 'Nasif Kamal',
    bookedByDept: "Founder's Office / FC",
    attendeesCount: 55,
    status: 'Confirmed',
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z',
  },

  // ── September 6, 2026
  {
    id: 'b-601',
    roomId: 'room-3',
    roomName: '3. Meeting Room In & Out',
    title: 'Her Vote, Her Seat Co-Creation Meeting',
    date: '2026-09-06',
    startTime: '10:00',
    endTime: '13:00',
    bookedByName: 'Monower Hossain',
    bookedByDept: 'Program Implementation',
    attendeesCount: 30,
    status: 'Confirmed',
    createdAt: '2026-09-01T11:00:00Z',
    updatedAt: '2026-09-01T11:00:00Z',
  },
  {
    id: 'b-602',
    roomId: 'room-1',
    roomName: '1. Meeting Room In',
    title: 'Her Vote, Her Seat Co-Creation Meeting (Breakout Group A)',
    date: '2026-09-06',
    startTime: '10:00',
    endTime: '12:00',
    bookedByName: 'Md. Rajvi Hasan',
    bookedByDept: 'Finance & Accounts',
    attendeesCount: 10,
    status: 'Confirmed',
    createdAt: '2026-09-01T12:00:00Z',
    updatedAt: '2026-09-01T12:00:00Z',
  },

  // ── September 8, 2026
  {
    id: 'b-801',
    roomId: 'room-3',
    roomName: '3. Meeting Room In & Out',
    title: 'Orientation of YouthNet Global_NexGen',
    date: '2026-09-08',
    startTime: '11:00',
    endTime: '13:30',
    bookedByName: 'S M Nayeem Rahman',
    bookedByDept: 'Youth Development & VBD',
    attendeesCount: 50,
    status: 'Confirmed',
    createdAt: '2026-09-02T10:00:00Z',
    updatedAt: '2026-09-02T10:00:00Z',
  },

  // ── September 9, 2026
  {
    id: 'b-901',
    roomId: 'room-3',
    roomName: '3. Meeting Room In & Out',
    title: 'JMC Monthly Meeting | September, 2026',
    date: '2026-09-09',
    startTime: '15:00',
    endTime: '17:30',
    bookedByName: 'Korvi Rakshand (Founder & ED)',
    bookedByDept: "Founder's Office",
    attendeesCount: 40,
    status: 'Confirmed',
    createdAt: '2026-09-02T14:00:00Z',
    updatedAt: '2026-09-02T14:00:00Z',
  },
];

const ROOMS_STORAGE_KEY = 'jaago_meeting_rooms';
const BOOKINGS_STORAGE_KEY = 'jaago_room_bookings';

/**
 * Get all meeting rooms
 */
export function getMeetingRooms(): MeetingRoom[] {
  if (typeof window === 'undefined') return DEFAULT_ROOMS;
  try {
    const raw = localStorage.getItem(ROOMS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(DEFAULT_ROOMS));
      return DEFAULT_ROOMS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_ROOMS;

    // Migrate any legacy unsplash URLs to local room assets
    const migrated = parsed.map((room: MeetingRoom) => {
      if (room.image && room.image.includes('unsplash.com')) {
        const defaultMatch = DEFAULT_ROOMS.find((dr) => dr.id === room.id);
        return defaultMatch ? { ...room, image: defaultMatch.image } : room;
      }
      return room;
    });

    localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  } catch (err) {
    console.error('Error loading rooms from storage:', err);
    return DEFAULT_ROOMS;
  }
}

/**
 * Save or update a meeting room
 */
export function saveMeetingRoom(room: MeetingRoom): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getMeetingRooms();
    const idx = existing.findIndex((r) => r.id === room.id);
    let updated: MeetingRoom[];
    if (idx >= 0) {
      updated = [...existing];
      updated[idx] = { ...updated[idx], ...room };
    } else {
      updated = [room, ...existing];
    }
    localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('jaago_meeting_rooms_updated'));
  } catch (err) {
    console.error('Error saving room:', err);
  }
}

/**
 * Delete a meeting room
 */
export function deleteMeetingRoom(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getMeetingRooms();
    const filtered = existing.filter((r) => r.id !== id);
    localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent('jaago_meeting_rooms_updated'));
  } catch (err) {
    console.error('Error deleting room:', err);
  }
}

/**
 * Get all room bookings
 */
export function getRoomBookings(): RoomBooking[] {
  if (typeof window === 'undefined') return DEFAULT_BOOKINGS;
  try {
    const raw = localStorage.getItem(BOOKINGS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(DEFAULT_BOOKINGS));
      return DEFAULT_BOOKINGS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_BOOKINGS;
  } catch (err) {
    console.error('Error loading bookings:', err);
    return DEFAULT_BOOKINGS;
  }
}

/**
 * Save a single booking
 */
export function saveRoomBooking(booking: RoomBooking): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getRoomBookings();
    const idx = existing.findIndex((b) => b.id === booking.id);
    let updated: RoomBooking[];
    if (idx >= 0) {
      updated = [...existing];
      updated[idx] = { ...updated[idx], ...booking, updatedAt: new Date().toISOString() };
    } else {
      updated = [booking, ...existing];
    }
    localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('jaago_bookings_updated'));
  } catch (err) {
    console.error('Error saving booking:', err);
  }
}

/**
 * Save multi-date bookings in batch
 */
export function createMultiDateBookings(
  baseBooking: Omit<RoomBooking, 'id' | 'date' | 'createdAt' | 'updatedAt'>,
  dates: string[]
): RoomBooking[] {
  if (typeof window === 'undefined') return [];
  try {
    const existing = getRoomBookings();
    const newBookings: RoomBooking[] = dates.map((date, idx) => ({
      ...baseBooking,
      id: `booking-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      date,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    const combined = [...newBookings, ...existing];
    localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(combined));
    window.dispatchEvent(new CustomEvent('jaago_bookings_updated'));
    return newBookings;
  } catch (err) {
    console.error('Error creating multi-date bookings:', err);
    return [];
  }
}

/**
 * Delete a booking
 */
export function deleteRoomBooking(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getRoomBookings();
    const filtered = existing.filter((b) => b.id !== id);
    localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent('jaago_bookings_updated'));
  } catch (err) {
    console.error('Error deleting booking:', err);
  }
}

/**
 * Convert time string (e.g., "11:30", "11:30 AM", "01:00 PM") to total minutes from midnight for collision calculation
 */
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim();
  const is12Hour = /(am|pm)/i.test(clean);

  if (is12Hour) {
    const match = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match && match[1] && match[2] && match[3]) {
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const meridian = match[3].toUpperCase();
      if (meridian === 'PM' && hours < 12) hours += 12;
      if (meridian === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    }
  }

  // 24-hour format "HH:mm"
  const parts = clean.split(':');
  if (parts.length >= 2 && parts[0] && parts[1]) {
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    return hours * 60 + minutes;
  }
  return 0;
}

/**
 * Checks if a room has booking collision
 */
export function checkRoomCollision(
  roomId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeBookingId?: string
): RoomBooking | null {
  const bookings = getRoomBookings();
  const startMin = timeStringToMinutes(startTime);
  const endMin = timeStringToMinutes(endTime);

  const conflict = bookings.find((b) => {
    if (b.roomId !== roomId || b.date !== date) return false;
    if (excludeBookingId && b.id === excludeBookingId) return false;
    if (b.status === 'Cancelled') return false;

    const bStart = timeStringToMinutes(b.startTime);
    const bEnd = timeStringToMinutes(b.endTime);

    // Overlap condition: start < bEnd && end > bStart
    return startMin < bEnd && endMin > bStart;
  });

  return conflict || null;
}

/**
 * Formats date into e.g. "Wednesday, Sep 2nd"
 */
export function formatDayDisplay(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return dateStr;
    const d = new Date(year, month - 1, day);
    const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
    const monthName = d.toLocaleDateString('en-US', { month: 'short' });
    const dayNum = d.getDate();

    const suffix =
      dayNum % 10 === 1 && dayNum !== 11
        ? 'st'
        : dayNum % 10 === 2 && dayNum !== 12
        ? 'nd'
        : dayNum % 10 === 3 && dayNum !== 13
        ? 'rd'
        : 'th';

    return `${weekday}, ${monthName} ${dayNum}${suffix}`;
  } catch {
    return dateStr;
  }
}
