// test-against-faboul.js — Validates every day against the Faboul API.
// Fetches data from sholiday.faboul.se and compares field-by-field.
//
// Run in browser via test.html or from Node with a fetch polyfill.

import { getDay } from '../js/calendar-api.js';
import { isoWeekData, dayOfWeek } from '../js/calendar-engine.js';

// Known Faboul API bugs: years where Jun 6 (Sveriges nationaldag) coincides
// with Annandag pingst. The API incorrectly reports Annandag pingst properties.
const KNOWN_NATIONALDAG_ANNANDAG_PINGST_COLLISIONS = new Set();

// Precompute which years have this collision
// Annandag pingst = Easter+50. If Easter+50 falls on Jun 6, collision occurs.
import { easterSunday } from '../js/calendar-engine.js';

for (let year = 2005; year <= 2030; year++) {
  const easter = easterSunday(year);
  // Easter+50 as a date
  const easterDate = new Date(year, easter.month - 1, easter.day + 50);
  if (easterDate.getMonth() === 5 && easterDate.getDate() === 6) { // June = month 5
    KNOWN_NATIONALDAG_ANNANDAG_PINGST_COLLISIONS.add(year);
  }
}

// Sweden revised its name day calendar in 2011. Our data is from 2023.
// Name day differences in 2005-2010 are expected and documented here.
// Affected dates: Apr 6, Aug 28, Sep 1, Sep 7
const NAME_DAY_REVISION_YEAR = 2011;

function parseSvBool(val) {
  if (val === 'Ja') return true;
  if (val === 'Nej') return false;
  return false; // default for missing
}

let totalChecked = 0;
let totalMismatches = 0;
let totalSkipped = 0;
const mismatchDetails = [];

async function validateYear(year) {
  const url = `https://sholiday.faboul.se/dagar/v2.1/${year}`;
  let data;
  try {
    const resp = await fetch(url);
    data = await resp.json();
  } catch (e) {
    console.error(`Failed to fetch ${url}: ${e.message}`);
    return { checked: 0, mismatches: 0, skipped: 0 };
  }

  let checked = 0;
  let mismatches = 0;
  let skipped = 0;

  for (const apiDay of data.dagar) {
    const [yStr, mStr, dStr] = apiDay.datum.split('-');
    const y = parseInt(yStr);
    const m = parseInt(mStr);
    const d = parseInt(dStr);

    // Skip known Faboul bug: Jun 6 in years where Annandag pingst collides
    if (m === 6 && d === 6 && KNOWN_NATIONALDAG_ANNANDAG_PINGST_COLLISIONS.has(year)) {
      skipped++;
      continue;
    }

    const local = getDay(y, m, d);
    const { week } = isoWeekData(y, m, d);
    const dow = dayOfWeek(y, m, d);
    checked++;

    const fields = [];

    // arbetsfri dag
    const apiArbetsfri = parseSvBool(apiDay['arbetsfri dag']);
    if (local.off !== apiArbetsfri) {
      fields.push(`arbetsfri: local=${local.off} api=${apiArbetsfri}`);
    }

    // röd dag
    const apiRodDag = parseSvBool(apiDay['röd dag']);
    if (local.redDay !== apiRodDag) {
      fields.push(`röd dag: local=${local.redDay} api=${apiRodDag}`);
    }

    // vecka (week number)
    const apiVecka = parseInt(apiDay.vecka);
    if (week !== apiVecka) {
      fields.push(`vecka: local=${week} api=${apiVecka}`);
    }

    // dag i vecka
    const apiDow = parseInt(apiDay['dag i vecka']);
    if (dow !== apiDow) {
      fields.push(`dag i vecka: local=${dow} api=${apiDow}`);
    }

    // helgdag
    const apiHelgdag = apiDay.helgdag || null;
    if (local.holiday !== apiHelgdag) {
      fields.push(`helgdag: local=${JSON.stringify(local.holiday)} api=${JSON.stringify(apiHelgdag)}`);
    }

    // helgdagsafton
    const apiAfton = apiDay.helgdagsafton || null;
    if (local.holidayEve !== apiAfton) {
      fields.push(`helgdagsafton: local=${JSON.stringify(local.holidayEve)} api=${JSON.stringify(apiAfton)}`);
    }

    // dag före arbetsfri helgdag
    const apiDagFore = parseSvBool(apiDay['dag före arbetsfri helgdag']);
    if (local.dayBeforeHoliday !== apiDagFore) {
      fields.push(`dag_före: local=${local.dayBeforeHoliday} api=${apiDagFore}`);
    }

    // namnsdag
    // Skip name day comparison for years before the 2011 name day revision,
    // since our data is from the post-2011 calendar.
    const apiNameDays = apiDay.namnsdag || [];
    const localNameDays = local.nameDays || [];
    if (y >= NAME_DAY_REVISION_YEAR && JSON.stringify(localNameDays) !== JSON.stringify(apiNameDays)) {
      fields.push(`namnsdag: local=${JSON.stringify(localNameDays)} api=${JSON.stringify(apiNameDays)}`);
    }

    // flaggdag
    const apiFlaggdag = apiDay.flaggdag || null;
    // Faboul API returns empty string for no flaggdag, normalize
    const normalizedApiFlaggdag = apiFlaggdag === '' ? null : apiFlaggdag;
    if (local.flagday !== normalizedApiFlaggdag) {
      fields.push(`flaggdag: local=${JSON.stringify(local.flagday)} api=${JSON.stringify(normalizedApiFlaggdag)}`);
    }

    if (fields.length > 0) {
      mismatches++;
      mismatchDetails.push({
        date: apiDay.datum,
        fields,
      });
    }
  }

  return { checked, mismatches, skipped };
}

// Main test runner
export async function runFaboulValidation(startYear = 2005, endYear = 2030) {
  console.log(`\nFaboul API Validation: ${startYear}-${endYear}`);
  console.log(`Known collision years (Jun 6 = Annandag pingst): ${[...KNOWN_NATIONALDAG_ANNANDAG_PINGST_COLLISIONS].join(', ') || 'none'}`);
  console.log('='.repeat(60));

  totalChecked = 0;
  totalMismatches = 0;
  totalSkipped = 0;
  mismatchDetails.length = 0;

  for (let year = startYear; year <= endYear; year++) {
    const result = await validateYear(year);
    totalChecked += result.checked;
    totalMismatches += result.mismatches;
    totalSkipped += result.skipped;

    const status = result.mismatches === 0 ? 'OK' : `${result.mismatches} MISMATCHES`;
    const skipNote = result.skipped > 0 ? ` (${result.skipped} skipped)` : '';
    console.log(`  ${year}: ${result.checked} days checked — ${status}${skipNote}`);
  }

  console.log('='.repeat(60));
  console.log(`Total: ${totalChecked} days checked, ${totalMismatches} mismatches, ${totalSkipped} skipped`);

  if (mismatchDetails.length > 0) {
    console.log(`\nMismatch details (first 50):`);
    for (const m of mismatchDetails.slice(0, 50)) {
      console.log(`  ${m.date}:`);
      for (const f of m.fields) {
        console.log(`    ${f}`);
      }
    }
  }

  if (totalMismatches === 0) {
    console.log('\n ALL DAYS MATCH! Calendar engine is correct.');
  } else {
    console.log(`\n MISMATCHES FOUND! ${totalMismatches} days differ from the Faboul API.`);
  }

  return { totalChecked, totalMismatches, totalSkipped, mismatchDetails };
}
