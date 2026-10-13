// ==============================================================================
// EDGEWFORCE - NIGERIA TIMEZONE & SMART SHIFT ATTENDANCE ENGINE
// Authoritative Time Calculation for Africa/Lagos (UTC+1, West Africa Time)
// ==============================================================================

/**
 * Returns detailed date and time components computed strictly in the Africa/Lagos timezone.
 * Nigeria does NOT observe Daylight Saving Time (DST) and is always UTC+1 (offset +60m).
 *
 * @param {Date|string|number} [dateInput=new Date()]
 * @returns {{
 *   date: Date,
 *   year: number,
 *   month: number,
 *   day: number,
 *   hours: number,
 *   minutes: number,
 *   seconds: number,
 *   totalMinutes: number,
 *   dateStr: string,
 *   timeStr: string,
 *   formatted12h: string,
 *   isoLagos: string
 * }}
 */
export function getLagosTime(dateInput = new Date()) {
  const dateObj = dateInput instanceof Date ? dateInput : new Date(dateInput);

  if (isNaN(dateObj.getTime())) {
    throw new Error('Invalid date provided to getLagosTime.');
  }

  // Format parts using Intl with timeZone 'Africa/Lagos'
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  });

  const parts = formatter.formatToParts(dateObj);
  const partMap = {};
  for (const p of parts) {
    partMap[p.type] = p.value;
  }

  const year = parseInt(partMap.year, 10);
  const month = parseInt(partMap.month, 10);
  const day = parseInt(partMap.day, 10);
  const hours = parseInt(partMap.hour, 10);
  const minutes = parseInt(partMap.minute, 10);
  const seconds = parseInt(partMap.second, 10);

  const totalMinutes = hours * 60 + minutes;
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  const formatted12h = `${String(hour12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
  const isoLagos = `${dateStr} ${timeStr}`;

  return {
    date: dateObj,
    year,
    month,
    day,
    hours,
    minutes,
    seconds,
    totalMinutes,
    dateStr,
    timeStr,
    formatted12h,
    isoLagos
  };
}

/**
 * Roles eligible for shift-based attendance:
 * - Sales Agents (SALES_AGENT)
 * - Field Agents (FIELD_AGENT)
 * - Brand Ambassadors (BRAND_AMBASSADOR)
 * - Promoters (PROMOTER)
 *
 * Normal Staff (STAFF_MEMBER, EMPLOYEE, OPERATIONS_OFFICER, HR, ACCOUNTANT, etc.) are EXEMPT.
 */
export function isShiftEligibleRole(roleCode, position = '') {
  const normRole = String(roleCode || '').toUpperCase().trim();
  const normPos = String(position || '').toUpperCase().trim();

  if (['SALES_AGENT', 'FIELD_AGENT', 'BRAND_AMBASSADOR', 'PROMOTER'].includes(normRole)) {
    return true;
  }

  if (
    normPos.includes('SALES AGENT') ||
    normPos.includes('FIELD AGENT') ||
    normPos.includes('BRAND AMBASSADOR') ||
    normPos.includes('PROMOTER')
  ) {
    return true;
  }

  return false;
}

/**
 * Attendance Shift Windows in Africa/Lagos Local Time:
 * 1. Morning Attendance: 06:00 AM – 12:00 PM (360m to 720m)
 * 2. Midday Attendance: 12:00 PM – 04:30 PM (720m to 990m)
 * 3. Evening Clock-Out: 04:30 PM – 11:59 PM (990m to 1439m) [Allows concluding active shift]
 *
 * @param {Date|string|number} [dateInput=new Date()]
 * @returns {{
 *   allowed: boolean,
 *   attendance_type: 'MORNING_ATTENDANCE'|'MIDDAY_ATTENDANCE'|'EVENING_CLOCK_OUT'|null,
 *   label: string,
 *   button_label: string,
 *   action_type: 'CLOCK_IN'|'CLOCK_OUT'|'CLOSED',
 *   message: string,
 *   next_window: string,
 *   lagos_time: ReturnType<typeof getLagosTime>
 * }}
 */
export function determineShiftAttendanceWindow(dateInput = new Date()) {
  const lagos = getLagosTime(dateInput);
  const m = lagos.totalMinutes;

  // Window 1: Morning Attendance (06:00 AM - 12:00 PM)
  // 6:00 AM = 360 mins | 12:00 PM = 720 mins
  if (m >= 360 && m < 720) {
    return {
      allowed: true,
      attendance_type: 'MORNING_ATTENDANCE',
      label: 'Morning Attendance',
      button_label: 'MORNING CLOCK-IN',
      action_type: 'CLOCK_IN',
      message: 'Morning attendance window is open (6:00 AM – 12:00 PM).',
      next_window: 'Midday Attendance opens at 12:00 PM',
      lagos_time: lagos
    };
  }

  // Window 2: Midday Attendance / Afternoon Shift (12:00 PM - 05:00 PM)
  // 12:00 PM = 720 mins | 5:00 PM = 1020 mins
  // Allows employees who missed morning clock-in to record midday attendance
  if (m >= 720 && m < 990) {
    return {
      allowed: true,
      attendance_type: 'MIDDAY_ATTENDANCE',
      label: 'Midday Attendance',
      button_label: 'MIDDAY CLOCK-IN',
      action_type: 'CLOCK_IN',
      message: 'Midday attendance window is open (12:00 PM – 4:30 PM).',
      next_window: 'Evening Clock-Out opens at 4:30 PM',
      lagos_time: lagos
    };
  }

  // Window 3: Evening Clock-Out (04:30 PM - 11:59 PM)
  // 4:30 PM = 990 mins | 11:59 PM = 1439 mins
  if (m >= 990 && m <= 1439) {
    return {
      allowed: true,
      attendance_type: 'EVENING_CLOCK_OUT',
      label: 'Evening Clock-Out',
      button_label: 'EVENING CLOCK-OUT',
      action_type: 'CLOCK_OUT',
      message: 'Evening clock-out window is open (4:30 PM – 11:59 PM).',
      next_window: 'Morning Clock-In tomorrow at 6:00 AM',
      lagos_time: lagos
    };
  }

  // Early Morning before 6:00 AM (m < 360)
  return {
    allowed: false,
    attendance_type: null,
    label: 'Attendance Closed',
    button_label: 'ATTENDANCE CLOSED',
    action_type: 'CLOSED',
    message: 'Morning attendance has not started. Clock-in opens at 6:00 AM.',
    next_window: 'Morning Clock-In (06:00 AM – 12:00 PM)',
    lagos_time: lagos
  };
}
