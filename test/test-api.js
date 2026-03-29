// test-api.js — Tests for calendar-api.js

import { getMonth, getDay, getYear, getWeek } from '../js/calendar-api.js';

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

// ============================================================
// getMonth
// ============================================================

// Basic structure
const feb2024 = getMonth(2024, 2);
assertEqual(feb2024.year, 2024, 'getMonth year');
assertEqual(feb2024.month, 2, 'getMonth month');
assertEqual(feb2024.monthPrev, 1, 'getMonth monthPrev');
assertEqual(feb2024.monthNext, 3, 'getMonth monthNext');
assertEqual(feb2024.yearPrev, 2024, 'getMonth yearPrev (same year)');
assertEqual(feb2024.yearNext, 2024, 'getMonth yearNext (same year)');

// January wraps to previous year
const jan2024 = getMonth(2024, 1);
assertEqual(jan2024.monthPrev, 12, 'getMonth Jan monthPrev = 12');
assertEqual(jan2024.yearPrev, 2023, 'getMonth Jan yearPrev');

// December wraps to next year
const dec2024 = getMonth(2024, 12);
assertEqual(dec2024.monthNext, 1, 'getMonth Dec monthNext = 1');
assertEqual(dec2024.yearNext, 2025, 'getMonth Dec yearNext');

// Each week has exactly 7 days
for (const week of feb2024.weeks) {
  assertEqual(week.days.length, 7, `Week ${week.week} has 7 days`);
}

// Total days divisible by 7
const totalDays = feb2024.weeks.length * 7;
assert(totalDays % 7 === 0, 'Total days divisible by 7');

// First day of grid should be a Monday (dayOfWeek = 1)
assertEqual(feb2024.weeks[0].days[0].dayOfWeek, 1, 'Grid starts on Monday');

// Last day of grid should be a Sunday (dayOfWeek = 7)
const lastWeek = feb2024.weeks[feb2024.weeks.length - 1];
assertEqual(lastWeek.days[6].dayOfWeek, 7, 'Grid ends on Sunday');

// Feb 2024 starts on Thursday, so first 3 days are from January
const firstDay = feb2024.weeks[0].days[0];
assertEqual(firstDay.date.month, 1, 'First padding day is from January');
assertEqual(firstDay.date.day, 29, 'First padding day is Jan 29');

// Test several months for correct structure
for (const [y, m] of [[2023, 1], [2023, 6], [2023, 12], [2020, 2], [2025, 3]]) {
  const data = getMonth(y, m);
  assert(data.weeks.length >= 4 && data.weeks.length <= 6, `${y}-${m} has 4-6 weeks`);

  // All days in a week should be consecutive
  for (const week of data.weeks) {
    for (let i = 1; i < 7; i++) {
      const prev = week.days[i - 1];
      const curr = week.days[i];
      assertEqual(curr.dayOfWeek, prev.dayOfWeek + 1, `${y}-${m} week ${week.week} consecutive days`);
    }
  }
}

// ============================================================
// getDay
// ============================================================

const day = getDay(2023, 4, 9); // Påskdagen 2023
assertEqual(day.date.year, 2023, 'getDay year');
assertEqual(day.date.month, 4, 'getDay month');
assertEqual(day.date.day, 9, 'getDay day');
assertEqual(day.holiday, 'Påskdagen', 'getDay holiday');
assertEqual(day.off, true, 'getDay off');
assertEqual(day.redDay, true, 'getDay redDay');
assertEqual(day.flagday, 'Påskdagen', 'getDay flagday');

// Regular day
const regular = getDay(2023, 3, 15);
assertEqual(regular.off, false, 'getDay regular not off');
assertEqual(regular.redDay, false, 'getDay regular not red');
assert(regular.nameDays.length > 0, 'getDay regular has name days');

// ============================================================
// getYear
// ============================================================

const year2023 = getYear(2023);
assertEqual(year2023.length, 12, 'getYear returns 12 months');
assertEqual(year2023[0].month, 1, 'getYear first month is January');
assertEqual(year2023[11].month, 12, 'getYear last month is December');

// ============================================================
// getWeek
// ============================================================

// Week 1 of 2024: starts Monday Jan 1
const week1_2024 = getWeek(2024, 1);
assertEqual(week1_2024.week, 1, 'getWeek week number');
assertEqual(week1_2024.days.length, 7, 'getWeek has 7 days');
assertEqual(week1_2024.days[0].dayOfWeek, 1, 'getWeek starts on Monday');
assertEqual(week1_2024.days[0].date.day, 1, 'getWeek 2024 w1 starts Jan 1');
assertEqual(week1_2024.days[0].date.month, 1, 'getWeek 2024 w1 starts in January');
assertEqual(week1_2024.days[6].dayOfWeek, 7, 'getWeek ends on Sunday');

// Week 52 of 2023: 2023-01-01 (Sunday) is in week 52 of 2022
// So week 52 of 2022 contains Jan 1, 2023
const week52_2022 = getWeek(2022, 52);
assertEqual(week52_2022.days[6].date.year, 2023, 'getWeek 2022 w52 Sunday is in 2023');
assertEqual(week52_2022.days[6].date.month, 1, 'getWeek 2022 w52 Sunday is January');
assertEqual(week52_2022.days[6].date.day, 1, 'getWeek 2022 w52 Sunday is Jan 1');

// ============================================================
// Summary
// ============================================================

console.log(`\n${'='.repeat(50)}`);
console.log(`API tests: ${passed} passed, ${failed} failed`);
if (failures.length > 0) {
  console.log('\nFailures:');
  for (const f of failures) {
    console.log(`  - ${f}`);
  }
}
console.log(`${'='.repeat(50)}\n`);

export { passed, failed, failures };
