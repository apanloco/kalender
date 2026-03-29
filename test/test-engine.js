// test-engine.js — Unit tests for calendar-engine.js

import {
  isLeapYear, daysInMonth, dayOfWeek, isoWeekData,
  easterSunday, computeEasterBasedHolidays, computeMidsommar,
  computeAllaHelgonsDag, getHolidaysForYear, computeDay,
} from '../js/calendar-engine.js';

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(message);
    console.error(`FAIL: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual === expected) {
    passed++;
  } else {
    failed++;
    const msg = `${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`;
    failures.push(msg);
    console.error(`FAIL: ${msg}`);
  }
}

function assertDeepEqual(actual, expected, message) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed++;
  } else {
    failed++;
    const msg = `${message}: expected ${e}, got ${a}`;
    failures.push(msg);
    console.error(`FAIL: ${msg}`);
  }
}

// ============================================================
// isLeapYear
// ============================================================

assertEqual(isLeapYear(2000), true, 'isLeapYear(2000) — divisible by 400');
assertEqual(isLeapYear(1900), false, 'isLeapYear(1900) — divisible by 100 but not 400');
assertEqual(isLeapYear(2024), true, 'isLeapYear(2024) — divisible by 4');
assertEqual(isLeapYear(2023), false, 'isLeapYear(2023) — not divisible by 4');
assertEqual(isLeapYear(1600), true, 'isLeapYear(1600)');
assertEqual(isLeapYear(2100), false, 'isLeapYear(2100)');

// ============================================================
// daysInMonth
// ============================================================

assertEqual(daysInMonth(2023, 1), 31, 'daysInMonth Jan');
assertEqual(daysInMonth(2023, 2), 28, 'daysInMonth Feb non-leap');
assertEqual(daysInMonth(2024, 2), 29, 'daysInMonth Feb leap');
assertEqual(daysInMonth(2023, 4), 30, 'daysInMonth Apr');
assertEqual(daysInMonth(2023, 12), 31, 'daysInMonth Dec');
assertEqual(daysInMonth(1900, 2), 28, 'daysInMonth Feb 1900 non-leap');
assertEqual(daysInMonth(2000, 2), 29, 'daysInMonth Feb 2000 leap');

// ============================================================
// dayOfWeek
// ============================================================

// Known dates
assertEqual(dayOfWeek(2024, 1, 1), 1, 'dayOfWeek 2024-01-01 = Monday');
assertEqual(dayOfWeek(2023, 12, 25), 1, 'dayOfWeek 2023-12-25 = Monday');
assertEqual(dayOfWeek(2023, 1, 1), 7, 'dayOfWeek 2023-01-01 = Sunday');
assertEqual(dayOfWeek(2023, 6, 6), 2, 'dayOfWeek 2023-06-06 = Tuesday');
assertEqual(dayOfWeek(2021, 12, 24), 5, 'dayOfWeek 2021-12-24 = Friday');
assertEqual(dayOfWeek(2021, 12, 25), 6, 'dayOfWeek 2021-12-25 = Saturday');
assertEqual(dayOfWeek(2021, 12, 26), 7, 'dayOfWeek 2021-12-26 = Sunday');
assertEqual(dayOfWeek(2000, 1, 1), 6, 'dayOfWeek 2000-01-01 = Saturday');
assertEqual(dayOfWeek(1970, 1, 1), 4, 'dayOfWeek 1970-01-01 = Thursday');

// ============================================================
// isoWeekData
// ============================================================

// 2024-01-01 is Monday, week 1
assertDeepEqual(isoWeekData(2024, 1, 1), { week: 1, isoYear: 2024 }, 'isoWeek 2024-01-01');

// 2023-01-01 is Sunday, belongs to week 52 of 2022
assertDeepEqual(isoWeekData(2023, 1, 1), { week: 52, isoYear: 2022 }, 'isoWeek 2023-01-01 → week 52 of 2022');

// 2020-12-31 is Thursday, belongs to week 53 of 2020
assertDeepEqual(isoWeekData(2020, 12, 31), { week: 53, isoYear: 2020 }, 'isoWeek 2020-12-31 → week 53');

// 2021-01-01 is Friday, still week 53 of 2020
assertDeepEqual(isoWeekData(2021, 1, 1), { week: 53, isoYear: 2020 }, 'isoWeek 2021-01-01 → week 53 of 2020');

// 2021-01-04 is Monday, week 1 of 2021
assertDeepEqual(isoWeekData(2021, 1, 4), { week: 1, isoYear: 2021 }, 'isoWeek 2021-01-04');

// 2025-12-29 is Monday — should be week 1 of 2026
assertDeepEqual(isoWeekData(2025, 12, 29), { week: 1, isoYear: 2026 }, 'isoWeek 2025-12-29 → week 1 of 2026');

// ============================================================
// easterSunday
// ============================================================

const knownEasters = [
  [2000, 4, 23],
  [2005, 3, 27],
  [2010, 4, 4],
  [2015, 4, 5],
  [2020, 4, 12],
  [2021, 4, 4],
  [2022, 4, 17],
  [2023, 4, 9],
  [2024, 3, 31],
  [2025, 4, 20],
  [2026, 4, 5],
  [2027, 3, 28],
  [2028, 4, 16],
  [2029, 4, 1],
  [2030, 4, 21],
  [1961, 4, 2],
  [2038, 4, 25], // latest possible Easter
  [2008, 3, 23], // early Easter (close to earliest: Mar 22)
];

for (const [year, month, day] of knownEasters) {
  const result = easterSunday(year);
  assertDeepEqual(result, { month, day }, `Easter ${year}`);
}

// ============================================================
// computeEasterBasedHolidays
// ============================================================

// Verify 2023 Easter-based holidays
const easter2023 = computeEasterBasedHolidays(2023);
const findHoliday = (list, name) => list.find(h => h.helgdag === name || h.helgdagsafton === name);

const skartorsdag2023 = findHoliday(easter2023, 'Skärtorsdagen');
assertEqual(skartorsdag2023.month, 4, 'Skärtorsdagen 2023 month');
assertEqual(skartorsdag2023.day, 6, 'Skärtorsdagen 2023 day');

const langfredag2023 = findHoliday(easter2023, 'Långfredagen');
assertEqual(langfredag2023.month, 4, 'Långfredagen 2023 month');
assertEqual(langfredag2023.day, 7, 'Långfredagen 2023 day');
assertEqual(langfredag2023.rodDag, true, 'Långfredagen is röd dag');

const kristiHimmel2023 = findHoliday(easter2023, 'Kristi himmelsfärdsdag');
assertEqual(kristiHimmel2023.month, 5, 'Kristi himmelsfärdsdag 2023 month');
assertEqual(kristiHimmel2023.day, 18, 'Kristi himmelsfärdsdag 2023 day');

const pingstdagen2023 = findHoliday(easter2023, 'Pingstdagen');
assertEqual(pingstdagen2023.month, 5, 'Pingstdagen 2023 month');
assertEqual(pingstdagen2023.day, 28, 'Pingstdagen 2023 day');

// Annandag pingst 2023 — not arbetsfri (year >= 2005)
const annandagPingst2023 = findHoliday(easter2023, 'Annandag pingst');
assertEqual(annandagPingst2023.month, 5, 'Annandag pingst 2023 month');
assertEqual(annandagPingst2023.day, 29, 'Annandag pingst 2023 day');
assertEqual(annandagPingst2023.arbetsfri, undefined, 'Annandag pingst 2023 not arbetsfri');
assertEqual(annandagPingst2023.rodDag, undefined, 'Annandag pingst 2023 not röd dag');

// ============================================================
// computeMidsommar
// ============================================================

// 2023: Midsommarafton = Jun 23 (Friday), Midsommardagen = Jun 24 (Saturday)
const midsommar2023 = computeMidsommar(2023);
assertEqual(midsommar2023[0].day, 23, 'Midsommarafton 2023 = Jun 23');
assertEqual(midsommar2023[1].day, 24, 'Midsommardagen 2023 = Jun 24');

// 2021: Jun 19 is Saturday → Midsommarafton = Jun 25 (Friday)
const midsommar2021 = computeMidsommar(2021);
assertEqual(midsommar2021[0].day, 25, 'Midsommarafton 2021 = Jun 25');
assertEqual(midsommar2021[1].day, 26, 'Midsommardagen 2021 = Jun 26');

// 2020: Jun 19 is Friday → Midsommarafton = Jun 19
const midsommar2020 = computeMidsommar(2020);
assertEqual(midsommar2020[0].day, 19, 'Midsommarafton 2020 = Jun 19');
assertEqual(midsommar2020[1].day, 20, 'Midsommardagen 2020 = Jun 20');

// ============================================================
// computeAllaHelgonsDag
// ============================================================

// 2023: Oct 31 is Tuesday → Alla helgons dag = Nov 4 (Saturday)
const allHelg2023 = computeAllaHelgonsDag(2023);
assertEqual(allHelg2023[1].month, 11, 'Alla helgons dag 2023 month = Nov');
assertEqual(allHelg2023[1].day, 4, 'Alla helgons dag 2023 day = 4');
assertEqual(allHelg2023[0].month, 11, 'Allhelgonaafton 2023 month = Nov');
assertEqual(allHelg2023[0].day, 3, 'Allhelgonaafton 2023 day = 3');

// 2020: Oct 31 is Saturday → Alla helgons dag = Oct 31
const allHelg2020 = computeAllaHelgonsDag(2020);
assertEqual(allHelg2020[1].month, 10, 'Alla helgons dag 2020 month = Oct');
assertEqual(allHelg2020[1].day, 31, 'Alla helgons dag 2020 day = 31');
assertEqual(allHelg2020[0].month, 10, 'Allhelgonaafton 2020 month = Oct');
assertEqual(allHelg2020[0].day, 30, 'Allhelgonaafton 2020 day = 30');

// ============================================================
// getHolidaysForYear — dag_före_arbetsfri_helgdag
// ============================================================

const holidays2023 = getHolidaysForYear(2023);

// Jan 5 (Trettondagsafton) should be dag_fore (before Trettondedag jul Jan 6)
const jan5 = holidays2023.get('01-05');
assertEqual(jan5.dagForeArbetsfriHelgdag, true, '2023 Jan 5 dag_före');

// Skärtorsdagen (Apr 6) should be dag_fore (before Långfredagen Apr 7)
const apr6 = holidays2023.get('04-06');
assertEqual(apr6.dagForeArbetsfriHelgdag, true, '2023 Apr 6 dag_före');

// May 17 (before Kristi himmelsfärdsdag May 18)
const may17 = holidays2023.get('05-17');
assert(may17 && may17.dagForeArbetsfriHelgdag, '2023 May 17 dag_före');

// Jun 5 (before Sveriges nationaldag Jun 6)
const jun5 = holidays2023.get('06-05');
assert(jun5 && jun5.dagForeArbetsfriHelgdag, '2023 Jun 5 dag_före');

// Nov 3 (Allhelgonaafton, before Alla helgons dag Nov 4)
const nov3 = holidays2023.get('11-03');
assert(nov3 && nov3.dagForeArbetsfriHelgdag, '2023 Nov 3 dag_före');

// ============================================================
// getHolidaysForYear — flag days
// ============================================================

const jan1 = holidays2023.get('01-01');
assertEqual(jan1.flaggdag, 'Nyårsdagen', '2023 Jan 1 flaggdag');

const jan28 = holidays2023.get('01-28');
assertEqual(jan28.flaggdag, 'Kung Carl XVI Gustafs namnsdag', '2023 Jan 28 flaggdag');

const jun6 = holidays2023.get('06-06');
assertEqual(jun6.flaggdag, 'Sveriges nationaldag och svenska flaggans dag', '2023 Jun 6 flaggdag');
assertEqual(jun6.helgdag, 'Sveriges nationaldag', '2023 Jun 6 helgdag');

// ============================================================
// computeDay
// ============================================================

// Regular workday
const feb1 = computeDay(2023, 2, 1, holidays2023);
assertEqual(feb1.off, false, '2023-02-01 is not off');
assertEqual(feb1.redDay, false, '2023-02-01 is not red');
assertEqual(feb1.dayOfWeek, 3, '2023-02-01 is Wednesday');

// Saturday
const feb4 = computeDay(2023, 2, 4, holidays2023);
assertEqual(feb4.off, true, '2023-02-04 (Saturday) is off');
assertEqual(feb4.redDay, false, '2023-02-04 (Saturday) is NOT red');

// Sunday
const feb5 = computeDay(2023, 2, 5, holidays2023);
assertEqual(feb5.off, true, '2023-02-05 (Sunday) is off');
assertEqual(feb5.redDay, true, '2023-02-05 (Sunday) IS red');

// Julafton 2021 (Friday) — arbetsfri but not röd dag
const holidays2021 = getHolidaysForYear(2021);
const julafton2021 = computeDay(2021, 12, 24, holidays2021);
assertEqual(julafton2021.off, true, 'Julafton 2021 is off');
assertEqual(julafton2021.redDay, false, 'Julafton 2021 is NOT red');
assertEqual(julafton2021.name, 'Julafton', 'Julafton 2021 name');

// Name days
assertEqual(feb1.nameDays.length > 0, true, '2023-02-01 has name days');

// ============================================================
// Summary
// ============================================================

console.log(`\n${'='.repeat(50)}`);
console.log(`Engine tests: ${passed} passed, ${failed} failed`);
if (failures.length > 0) {
  console.log('\nFailures:');
  for (const f of failures) {
    console.log(`  - ${f}`);
  }
}
console.log(`${'='.repeat(50)}\n`);

export { passed, failed, failures };
