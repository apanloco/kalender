// calendar-engine.js — Pure computation for the Swedish calendar.
// No DOM access. Pure functions only. All date math uses integer arithmetic.

// ============================================================
// Date Primitives
// ============================================================

export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

export function daysInMonth(year, month) {
  const days = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month === 2 && isLeapYear(year)) return 29;
  return days[month];
}

// Returns 1=Monday .. 7=Sunday (ISO 8601).
// Tomohiko Sakamoto's algorithm, adapted for ISO day numbering.
export function dayOfWeek(year, month, day) {
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  let y = year;
  if (month < 3) y -= 1;
  // Sakamoto gives 0=Sunday..6=Saturday
  const dow = (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + t[month - 1] + day) % 7;
  // Convert to ISO: 1=Mon..7=Sun
  return dow === 0 ? 7 : dow;
}

// ============================================================
// ISO 8601 Week Numbers
// ============================================================

// Returns the ordinal day of the year (1-366).
function ordinalDay(year, month, day) {
  const daysBeforeMonth = [0, 0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let ord = daysBeforeMonth[month] + day;
  if (month > 2 && isLeapYear(year)) ord += 1;
  return ord;
}

// Returns { week, isoYear } per ISO 8601.
export function isoWeekData(year, month, day) {
  const dow = dayOfWeek(year, month, day); // 1=Mon..7=Sun
  const ord = ordinalDay(year, month, day);

  // Find the Thursday of the current week (ISO week is defined by its Thursday)
  const thursdayOrd = ord + (4 - dow); // offset to Thursday

  if (thursdayOrd < 1) {
    // Thursday is in the previous year
    const prevYear = year - 1;
    const prevYearDays = isLeapYear(prevYear) ? 366 : 365;
    const prevThursdayOrd = prevYearDays + thursdayOrd;
    const week = Math.floor((prevThursdayOrd - 1) / 7) + 1;
    return { week, isoYear: prevYear };
  }

  const yearDays = isLeapYear(year) ? 366 : 365;
  if (thursdayOrd > yearDays) {
    // Thursday is in the next year
    return { week: 1, isoYear: year + 1 };
  }

  const week = Math.floor((thursdayOrd - 1) / 7) + 1;
  return { week, isoYear: year };
}

// ============================================================
// Easter Algorithm (Computus)
// Anonymous Gregorian algorithm (Meeus/Jones/Butcher).
// Valid for years 1583+.
// ============================================================

export function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

// ============================================================
// Helper: add days to a date
// ============================================================

function addDays(year, month, day, offset) {
  // Simple approach: convert to a running day count, add offset, convert back.
  // We only need this for small offsets from Easter (max +50 days).
  let d = day + offset;
  let m = month;
  let y = year;

  while (d > daysInMonth(y, m)) {
    d -= daysInMonth(y, m);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  while (d < 1) {
    m--;
    if (m < 1) { m = 12; y--; }
    d += daysInMonth(y, m);
  }

  return { year: y, month: m, day: d };
}

// Format month/day as "MM-DD" key for the holiday map.
function dateKey(month, day) {
  return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ============================================================
// Moveable Holiday Calculations
// Each in its own clearly separated function.
// ============================================================

// All holidays that are offsets from Easter Sunday.
// Returns an array of { month, day, ...properties } objects.
export function computeEasterBasedHolidays(year) {
  const easter = easterSunday(year);
  const e = (offset) => addDays(easter.year || year, easter.month, easter.day, offset);

  const holidays = [];

  // Skärtorsdagen (Maundy Thursday) — Easter-3, helgdagsafton
  const skartorsdag = e(-3);
  holidays.push({
    ...skartorsdag,
    helgdagsafton: 'Skärtorsdagen',
    dagForeArbetsfriHelgdag: true, // day before Långfredagen
  });

  // Långfredagen (Good Friday) — Easter-2, röd dag
  const langfredag = e(-2);
  holidays.push({
    ...langfredag,
    helgdag: 'Långfredagen',
    rodDag: true,
    arbetsfri: true,
  });

  // Påskafton (Easter Saturday) — Easter-1, arbetsfri only
  const paskafton = e(-1);
  holidays.push({
    ...paskafton,
    helgdag: 'Påskafton',
    arbetsfri: true,
  });

  // Påskdagen (Easter Sunday) — Easter+0, röd dag, flaggdag
  holidays.push({
    month: easter.month,
    day: easter.day,
    helgdag: 'Påskdagen',
    rodDag: true,
    arbetsfri: true,
    flaggdag: 'Påskdagen',
  });

  // Annandag påsk (Easter Monday) — Easter+1, röd dag
  const annandagPask = e(1);
  holidays.push({
    ...annandagPask,
    helgdag: 'Annandag påsk',
    rodDag: true,
    arbetsfri: true,
  });

  // Kristi himmelsfärdsdag (Ascension) — Easter+39, röd dag
  const kristiHimmelsfardsdag = e(39);
  holidays.push({
    ...kristiHimmelsfardsdag,
    helgdag: 'Kristi himmelsfärdsdag',
    rodDag: true,
    arbetsfri: true,
  });

  // Pingstafton (Whit Saturday) — Easter+48, helgdagsafton
  const pingstafton = e(48);
  holidays.push({
    ...pingstafton,
    helgdagsafton: 'Pingstafton',
  });

  // Pingstdagen (Whit Sunday) — Easter+49, röd dag, flaggdag
  const pingstdagen = e(49);
  holidays.push({
    ...pingstdagen,
    helgdag: 'Pingstdagen',
    rodDag: true,
    arbetsfri: true,
    flaggdag: 'Pingstdagen',
  });

  // Annandag pingst (Whit Monday) — Easter+50
  // Since 2005: named only, NOT arbetsfri or röd dag
  const annandagPingst = e(50);
  if (year >= 2005) {
    holidays.push({
      ...annandagPingst,
      helgdag: 'Annandag pingst',
      // Not arbetsfri, not rodDag since 2005
    });
  } else {
    holidays.push({
      ...annandagPingst,
      helgdag: 'Annandag pingst',
      rodDag: true,
      arbetsfri: true,
    });
  }

  return holidays;
}

// Midsommar: Midsommarafton = Friday in Jun 19-25, Midsommardagen = Saturday in Jun 20-26.
export function computeMidsommar(year) {
  const dow19 = dayOfWeek(year, 6, 19); // 1=Mon..7=Sun
  const offset = (5 - dow19 + 7) % 7; // 5 = Friday
  const midsommaraftonDay = 19 + offset;
  const midsommardagenDay = midsommaraftonDay + 1;

  return [
    {
      month: 6,
      day: midsommaraftonDay,
      helgdag: 'Midsommarafton',
      arbetsfri: true,
      // NOT rodDag
    },
    {
      month: 6,
      day: midsommardagenDay,
      helgdag: 'Midsommardagen',
      rodDag: true,
      arbetsfri: true,
      flaggdag: 'Midsommardagen',
    },
  ];
}

// Alla helgons dag: Saturday in Oct 31 - Nov 6. Allhelgonaafton: Friday before.
export function computeAllaHelgonsDag(year) {
  const dow31 = dayOfWeek(year, 10, 31); // 1=Mon..7=Sun
  const offset = (6 - dow31 + 7) % 7; // 6 = Saturday
  const totalDay = 31 + offset;

  let allaHelgonsMonth, allaHelgonsDay;
  if (totalDay > 31) {
    allaHelgonsMonth = 11;
    allaHelgonsDay = totalDay - 31;
  } else {
    allaHelgonsMonth = 10;
    allaHelgonsDay = totalDay;
  }

  // Allhelgonaafton is the day before (always a Friday)
  const afton = addDays(year, allaHelgonsMonth, allaHelgonsDay, -1);

  return [
    {
      month: afton.month,
      day: afton.day,
      helgdagsafton: 'Allhelgonaafton',
    },
    {
      month: allaHelgonsMonth,
      day: allaHelgonsDay,
      helgdag: 'Alla helgons dag',
      rodDag: true,
      arbetsfri: true,
    },
  ];
}

// ============================================================
// Fixed Holidays
// ============================================================

function getFixedHolidays(year) {
  const holidays = [
    // Röd dag + arbetsfri
    { month: 1, day: 1, helgdag: 'Nyårsdagen', rodDag: true, arbetsfri: true, flaggdag: 'Nyårsdagen' },
    { month: 1, day: 6, helgdag: 'Trettondedag jul', rodDag: true, arbetsfri: true },
    { month: 5, day: 1, helgdag: 'Första Maj', rodDag: true, arbetsfri: true, flaggdag: 'Första maj' },
    { month: 12, day: 25, helgdag: 'Juldagen', rodDag: true, arbetsfri: true, flaggdag: 'Juldagen' },
    { month: 12, day: 26, helgdag: 'Annandag jul', rodDag: true, arbetsfri: true },

    // Sveriges nationaldag — röd dag since 2005
    {
      month: 6, day: 6,
      helgdag: 'Sveriges nationaldag',
      rodDag: year >= 2005,
      arbetsfri: year >= 2005,
      flaggdag: 'Sveriges nationaldag och svenska flaggans dag',
    },

    // Arbetsfri-only (NOT röd dag)
    { month: 12, day: 24, helgdag: 'Julafton', arbetsfri: true },
    { month: 12, day: 31, helgdag: 'Nyårsafton', arbetsfri: true },

    // Holiday eves (helgdagsafton, NOT arbetsfri)
    { month: 1, day: 5, helgdagsafton: 'Trettondagsafton' },
    { month: 4, day: 30, helgdagsafton: 'Valborgsmässoafton' },
  ];

  return holidays;
}

// ============================================================
// Flag Days (fixed dates only — moveable ones are set in holiday functions)
// ============================================================

const FIXED_FLAG_DAYS = [
  // { month, day } entries are handled above in holidays with flaggdag property.
  // These are flag-day-only dates (not holidays themselves):
  { month: 1, day: 28, flaggdag: 'Kung Carl XVI Gustafs namnsdag' },
  { month: 3, day: 12, flaggdag: 'Kronprinsessan Victorias namnsdag' },
  { month: 4, day: 30, flaggdag: 'Kung Carl XVI Gustafs födelsedag' },
  { month: 5, day: 29, flaggdag: 'Veterandagen' },
  { month: 7, day: 14, flaggdag: 'Kronprinsessan Victorias födelsedag' },
  { month: 8, day: 8, flaggdag: 'Drottning Silvias namnsdag' },
  { month: 10, day: 24, flaggdag: 'FN-dagen' },
  { month: 11, day: 6, flaggdag: 'Gustav Adolfsdagen' },
  { month: 12, day: 10, flaggdag: 'Nobeldagen' },
  { month: 12, day: 23, flaggdag: 'Drottning Silvias födelsedag' },
];

// ============================================================
// Holiday Map Assembly
// ============================================================

// Returns a Map keyed by "MM-DD" with merged holiday info for the year.
export function getHolidaysForYear(year) {
  const map = new Map();

  function addToMap(entry) {
    const key = dateKey(entry.month, entry.day);
    const existing = map.get(key) || {};

    // Merge: later entries can add properties but don't overwrite existing ones
    // Exception: Sveriges nationaldag should override Annandag pingst when they collide
    if (entry.helgdag === 'Sveriges nationaldag' && existing.helgdag === 'Annandag pingst') {
      // Override everything from Annandag pingst
      map.set(key, { ...entry });
      return;
    }

    const merged = { ...existing };
    // When two helgdagar fall on the same day (e.g., Kristi himmelsfärdsdag + Första Maj in 2008),
    // concatenate their names with ", " to match the Faboul API format.
    if (entry.helgdag) {
      merged.helgdag = merged.helgdag ? `${merged.helgdag}, ${entry.helgdag}` : entry.helgdag;
    }
    if (entry.helgdagsafton && !merged.helgdagsafton) merged.helgdagsafton = entry.helgdagsafton;
    if (entry.rodDag) merged.rodDag = true;
    if (entry.arbetsfri) merged.arbetsfri = true;
    if (entry.flaggdag && !merged.flaggdag) merged.flaggdag = entry.flaggdag;
    if (entry.dagForeArbetsfriHelgdag) merged.dagForeArbetsfriHelgdag = true;

    map.set(key, merged);
  }

  // Add all holiday sources
  // Easter-based holidays first, so when they collide with fixed holidays
  // (e.g., Kristi himmelsfärdsdag + Första Maj in 2008), the concatenation
  // order matches the Faboul API: "Kristi himmelsfärdsdag, Första Maj"
  for (const h of computeEasterBasedHolidays(year)) addToMap(h);
  for (const h of computeMidsommar(year)) addToMap(h);
  for (const h of computeAllaHelgonsDag(year)) addToMap(h);
  for (const h of getFixedHolidays(year)) addToMap(h);

  // Add flag-day-only entries
  for (const f of FIXED_FLAG_DAYS) {
    const key = dateKey(f.month, f.day);
    const existing = map.get(key) || {};
    if (!existing.flaggdag) existing.flaggdag = f.flaggdag;
    map.set(key, existing);
  }

  // Swedish parliamentary election flag day: second Sunday of September
  // every 4 years (1994, 1998, 2002, 2006, 2010, ...)
  if (year >= 1994 && (year - 1994) % 4 === 0) {
    // Find second Sunday of September
    const sep1Dow = dayOfWeek(year, 9, 1); // 1=Mon..7=Sun
    const firstSunday = sep1Dow === 7 ? 1 : (8 - sep1Dow);
    const secondSunday = firstSunday + 7;
    const key = dateKey(9, secondSunday);
    const existing = map.get(key) || {};
    if (!existing.flaggdag) existing.flaggdag = 'Val till Sveriges riksdag';
    map.set(key, existing);
  }

  // Compute dag_före_arbetsfri_helgdag
  // For every arbetsfri holiday, check if the previous day is a regular workday.
  for (const [key, info] of map) {
    if (!info.arbetsfri) continue;

    const [mm, dd] = key.split('-').map(Number);
    const prev = addDays(year, mm, dd, -1);
    const prevKey = dateKey(prev.month, prev.day);
    const prevDow = dayOfWeek(prev.year, prev.month, prev.day);

    // Skip if previous day is a weekend (Sat=6, Sun=7)
    if (prevDow >= 6) continue;

    // Skip if previous day is itself arbetsfri (holiday)
    const prevInfo = map.get(prevKey);
    if (prevInfo && prevInfo.arbetsfri) continue;

    // Mark the previous day
    const prevExisting = map.get(prevKey) || {};
    prevExisting.dagForeArbetsfriHelgdag = true;
    map.set(prevKey, prevExisting);
  }

  return map;
}

// ============================================================
// Day Assembly
// ============================================================

import { NAMEDAYS } from './namedays.js';

// Assemble complete data for a single day.
export function computeDay(year, month, day, holidayMap) {
  const dow = dayOfWeek(year, month, day);
  const { week, isoYear } = isoWeekData(year, month, day);
  const key = dateKey(month, day);
  const info = holidayMap.get(key) || {};

  // Weekend rules
  const isSunday = dow === 7;
  const isSaturday = dow === 6;

  const rodDag = !!(info.rodDag || isSunday);
  const arbetsfri = !!(info.arbetsfri || isSaturday || isSunday);

  // Name field: helgdagsafton overwrites helgdag (matching Rust behavior)
  let name = null;
  if (info.helgdag) name = info.helgdag;
  if (info.helgdagsafton) name = info.helgdagsafton;

  // Name days lookup
  const nameDays = (NAMEDAYS[month] && NAMEDAYS[month][day]) || [];

  return {
    date: { year, month, day },
    dayOfWeek: dow,
    week,
    off: arbetsfri,
    redDay: rodDag,
    name,
    flagday: info.flaggdag || null,
    nameDays,
    holiday: info.helgdag || null,
    holidayEve: info.helgdagsafton || null,
    dayBeforeHoliday: !!(info.dagForeArbetsfriHelgdag),
  };
}
