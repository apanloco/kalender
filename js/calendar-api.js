// calendar-api.js — Public API for the Swedish calendar.
// All functions are synchronous (pure computation).

import { daysInMonth, dayOfWeek, isoWeekData, getHolidaysForYear, computeDay } from './calendar-engine.js';

// Cache holiday maps per year to avoid recomputation.
const holidayCache = new Map();

function getHolidayMap(year) {
  if (!holidayCache.has(year)) {
    holidayCache.set(year, getHolidaysForYear(year));
  }
  return holidayCache.get(year);
}

// ============================================================
// getMonth(year, month) → CalendarData
// ============================================================
//
// Returns the calendar grid for a given month, including padding days
// from adjacent months to fill complete Mon-Sun weeks.
//
// Shape: { weeks, year, yearPrev, yearNext, month, monthPrev, monthNext }

export function getMonth(year, month) {
  if (month < 1 || month > 12) throw new Error(`Invalid month: ${month}`);

  // Compute prev/next month+year
  const monthPrev = month === 1 ? 12 : month - 1;
  const yearPrev = month === 1 ? year - 1 : year;
  const monthNext = month === 12 ? 1 : month + 1;
  const yearNext = month === 12 ? year + 1 : year;

  // Preload holiday maps for the 3 months we need
  const holidayMapPrev = getHolidayMap(yearPrev);
  const holidayMapCurr = getHolidayMap(year);
  const holidayMapNext = getHolidayMap(yearNext);

  // How many days from previous month to pad at the start?
  const firstDow = dayOfWeek(year, month, 1); // 1=Mon..7=Sun
  const padBefore = firstDow - 1; // Mon=0, Tue=1, ..., Sun=6

  // How many days from next month to pad at the end?
  const lastDay = daysInMonth(year, month);
  const lastDow = dayOfWeek(year, month, lastDay);
  const padAfter = 7 - lastDow; // Sun=0, Mon=6, ..., Sat=1

  // Build flat array of days
  const days = [];

  // Previous month padding
  const prevMonthDays = daysInMonth(yearPrev, monthPrev);
  for (let i = padBefore - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    days.push(computeDay(yearPrev, monthPrev, d, holidayMapPrev));
  }

  // Current month
  for (let d = 1; d <= lastDay; d++) {
    days.push(computeDay(year, month, d, holidayMapCurr));
  }

  // Next month padding
  for (let d = 1; d <= padAfter; d++) {
    days.push(computeDay(yearNext, monthNext, d, holidayMapNext));
  }

  // Chunk into weeks of 7
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    const weekDays = days.slice(i, i + 7);
    weeks.push({
      week: weekDays[0].week,
      days: weekDays,
    });
  }

  return {
    weeks,
    year,
    yearPrev,
    yearNext,
    month,
    monthPrev,
    monthNext,
  };
}

// ============================================================
// getDay(year, month, day) → CalendarDay
// ============================================================

export function getDay(year, month, day) {
  const holidayMap = getHolidayMap(year);
  return computeDay(year, month, day, holidayMap);
}

// ============================================================
// getYear(year) → CalendarData[12]
// ============================================================

export function getYear(year) {
  const months = [];
  for (let m = 1; m <= 12; m++) {
    months.push(getMonth(year, m));
  }
  return months;
}

// ============================================================
// getWeek(year, weekNumber) → { week, days: CalendarDay[7] }
// ============================================================
//
// Finds the Monday of the given ISO week and generates 7 days.

export function getWeek(year, weekNumber) {
  // Find Jan 4 (always in ISO week 1) and its day-of-week
  const jan4Dow = dayOfWeek(year, 1, 4); // 1=Mon..7=Sun

  // Monday of week 1 = Jan 4 - (jan4Dow - 1)
  // Monday of requested week = Monday of week 1 + (weekNumber - 1) * 7
  const mondayOffset = (weekNumber - 1) * 7 - (jan4Dow - 1);

  // Convert offset from Jan 4 to actual date
  // Jan 4 + mondayOffset days
  let d = 4 + mondayOffset;
  let m = 1;
  let y = year;

  // Normalize date (could be in previous or next year)
  while (d < 1) {
    m--;
    if (m < 1) { m = 12; y--; }
    d += daysInMonth(y, m);
  }
  while (d > daysInMonth(y, m)) {
    d -= daysInMonth(y, m);
    m++;
    if (m > 12) { m = 1; y++; }
  }

  // Generate 7 days starting from Monday
  const days = [];
  let curY = y, curM = m, curD = d;
  for (let i = 0; i < 7; i++) {
    const holidayMap = getHolidayMap(curY);
    days.push(computeDay(curY, curM, curD, holidayMap));
    curD++;
    if (curD > daysInMonth(curY, curM)) {
      curD = 1;
      curM++;
      if (curM > 12) { curM = 1; curY++; }
    }
  }

  return {
    week: weekNumber,
    days,
  };
}
