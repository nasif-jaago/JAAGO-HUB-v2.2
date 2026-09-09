/**
 * Universal Date Formatting Utility for JAAGO HUB
 * Standard Display Format: DD-MMM-YYYY (e.g. 01-Aug-2026)
 *
 * Designed to avoid timezone drift issues when parsing pure YYYY-MM-DD strings.
 */

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Format any date input (YYYY-MM-DD, ISO string, Date object, or timestamp)
 * into DD-MMM-YYYY (e.g. "01-Aug-2026", "08-Sep-2026").
 */
export function formatDisplayDate(
  dateInput?: string | Date | number | boolean | null | unknown,
  fallback: string = '—'
): string {
  if (dateInput === null || dateInput === undefined || dateInput === '') return fallback;

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (!trimmed || trimmed === '—' || trimmed === '-') return fallback;

    // Direct match for standard YYYY-MM-DD (with optional time)
    const ymdMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (ymdMatch && ymdMatch[1] && ymdMatch[2] && ymdMatch[3]) {
      const year = ymdMatch[1];
      const monthIdx = parseInt(ymdMatch[2], 10) - 1;
      const day = ymdMatch[3].padStart(2, '0');
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${day}-${MONTH_NAMES[monthIdx]}-${year}`;
      }
    }

    // Direct match for DD-MM-YYYY or DD/MM/YYYY
    const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (dmyMatch && dmyMatch[1] && dmyMatch[2] && dmyMatch[3]) {
      const day = dmyMatch[1].padStart(2, '0');
      const monthIdx = parseInt(dmyMatch[2], 10) - 1;
      const year = dmyMatch[3];
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${day}-${MONTH_NAMES[monthIdx]}-${year}`;
      }
    }

    // Match DD-MMM-YYYY or DD MMM YYYY (e.g. "01-Aug-2026" or "1 Aug 2026")
    const dMmmYMatch = trimmed.match(/^(\d{1,2})[- ]([A-Za-z]{3})[- ](\d{4})/);
    if (dMmmYMatch && dMmmYMatch[1] && dMmmYMatch[2] && dMmmYMatch[3]) {
      const day = dMmmYMatch[1].padStart(2, '0');
      const mStr = dMmmYMatch[2];
      const year = dMmmYMatch[3];
      const mCap = mStr.charAt(0).toUpperCase() + mStr.slice(1).toLowerCase();
      return `${day}-${mCap}-${year}`;
    }
  }

  // Fallback for Date objects, numbers, or other ISO strings
  try {
    const d = typeof dateInput === 'string' || typeof dateInput === 'number'
      ? new Date(dateInput)
      : (dateInput instanceof Date ? dateInput : null);

    if (!d || isNaN(d.getTime())) {
      return typeof dateInput === 'string' ? dateInput : fallback;
    }

    const day = String(d.getDate()).padStart(2, '0');
    const month = MONTH_NAMES[d.getMonth()];
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return typeof dateInput === 'string' ? dateInput : fallback;
  }
}

/**
 * Returns the short weekday name (e.g. "Mon", "Tue") without timezone skew.
 */
export function getWeekdayShort(dateInput?: string | Date | null): string {
  if (!dateInput) return '';
  try {
    if (typeof dateInput === 'string') {
      const match = dateInput.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (match && match[1] && match[2] && match[3]) {
        // Construct with local year, month, day to avoid UTC midnight timezone offsets
        const d = new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10));
        return d.toLocaleDateString('en-US', { weekday: 'short' });
      }
    }
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { weekday: 'short' });
  } catch {
    return '';
  }
}

/**
 * Format date range into "DD-MMM-YYYY → DD-MMM-YYYY" or single date if identical.
 */
export function formatDisplayDateRange(
  startDate?: string | null,
  endDate?: string | null,
  fallback: string = '—'
): string {
  if (!startDate && !endDate) return fallback;
  const startFmt = startDate ? formatDisplayDate(startDate) : '';
  const endFmt = endDate ? formatDisplayDate(endDate) : '';

  if (startFmt && endFmt) {
    if (startFmt === endFmt) return startFmt;
    return `${startFmt} → ${endFmt}`;
  }
  return startFmt || endFmt || fallback;
}

/**
 * Format date with time, e.g. "01-Aug-2026, 09:47 AM"
 */
export function formatDisplayDateTime(
  dateInput?: string | Date | number | null,
  fallback: string = '—'
): string {
  if (!dateInput && dateInput !== 0) return fallback;
  try {
    const d = typeof dateInput === 'string' || typeof dateInput === 'number'
      ? new Date(dateInput)
      : (dateInput instanceof Date ? dateInput : null);

    if (!d || isNaN(d.getTime())) {
      return typeof dateInput === 'string' ? dateInput : fallback;
    }

    const datePart = formatDisplayDate(d);
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const hourStr = String(hours).padStart(2, '0');

    return `${datePart}, ${hourStr}:${minutes} ${ampm}`;
  } catch {
    return typeof dateInput === 'string' ? dateInput : fallback;
  }
}
