# Swedish Calendar — Client-Side Application Spec

**This file is the single source of truth for how this system works.**
All architecture, rules, data contracts, and design decisions are documented here.
When the code and this spec disagree, update whichever is wrong.

A fully client-side Swedish calendar application. No backend, no external API dependencies.
Vanilla JS (ES modules) + vanilla CSS. No frameworks, no build tools, no npm.

Hosted at: kalender.akerud.se

## Architecture

```
index.html                  Single page entry point
css/calendar.css            Hand-written vanilla CSS
favicon.ico                 Site icon
js/
  calendar-engine.js        Pure computation (no DOM): Easter, holidays, week numbers, flag days
  namedays.js               Static name day data (~619 names, ~8KB)
  calendar-api.js           Public API: getMonth(), getDay(), getYear(), getWeek()
  calendar-ui.js            DOM rendering, navigation, URL routing (hash-based)
  app.js                    Bootstrap
test/
  test.html                 Browser test runner
  test-engine.js            Unit tests for calendar-engine
  test-api.js               Tests for public API
  test-against-faboul.js    Validates every day 2005-2030 against Faboul API
legacy/                     Previous Rust/Axum backend (archived)
```

## Module Responsibilities

### calendar-engine.js — Pure Computation

Zero DOM access. Pure functions only. All date math uses integer arithmetic.

**Date primitives:**
- `isLeapYear(year)` — Gregorian rules
- `daysInMonth(year, month)` — 1-12, handles leap February
- `dayOfWeek(year, month, day)` — returns 1=Mon..7=Sun (ISO)

**ISO 8601 week numbers:**
- `isoWeekData(year, month, day)` — returns `{ week, isoYear }`

**Easter (Computus):**
- `easterSunday(year)` — returns `{ month, day }`, Anonymous Gregorian algorithm

**Moveable holidays** (each in its own clearly separated function):
- `computeEasterBasedHolidays(year)` — all holidays offset from Easter Sunday
- `computeMidsommar(year)` — Midsommarafton (Fri Jun 19-25) + Midsommardagen (Sat Jun 20-26)
- `computeAllaHelgonsDag(year)` — Alla helgons dag (Sat Oct 31-Nov 6) + Allhelgonaafton

**Holiday assembly:**
- `getHolidaysForYear(year)` — returns Map<"MM-DD", HolidayInfo> combining all fixed + moveable holidays
- `computeDay(year, month, day, holidayMap)` — assembles complete day data

### namedays.js — Static Data

Nested array: `NAMEDAYS[month][day]` → `string[]`
- Extracted from Faboul API data (2023). Constant across all years.
- Includes Feb 29 (used only in leap years).
- 6 days have no name days: Jan 1, Feb 2, Mar 25, Jun 24, Nov 1, Dec 25.

### calendar-api.js — Public API

All functions are synchronous (pure computation). Holiday maps are cached per year.

**`getMonth(year, month)`** → `CalendarData`
```
{ weeks, year, yearPrev, yearNext, month, monthPrev, monthNext }
```
Includes padding days from adjacent months to fill complete Mon-Sun weeks.

**`getDay(year, month, day)`** → `CalendarDay`
```
{ date: {year, month, day}, dayOfWeek, week, off, redDay, name,
  flagday, nameDays, holiday, holidayEve, dayBeforeHoliday }
```

**`getYear(year)`** → `CalendarData[12]`

**`getWeek(year, weekNumber)`** → `{ week, days: CalendarDay[7] }`

### calendar-ui.js — Rendering

Builds HTML strings, sets `innerHTML` on `#app` container.
Uses hash-based routing (`#/2024/3`). Supports keyboard arrows and swipe navigation.

### app.js — Bootstrap

Parses URL hash, calls `getMonth()`, renders, sets up event listeners.

## Swedish Calendar Rules

### Visual Rule

**Red background = arbetsfri (off work).** Not traditional röda dagar.
This means Saturdays, Julafton, Nyårsafton, Påskafton, Midsommarafton all display red.

### Röd dag holidays (always röd dag + arbetsfri)

| Holiday | Date | Notes |
|---------|------|-------|
| Nyårsdagen | Jan 1 | Fixed |
| Trettondedag jul | Jan 6 | Fixed |
| Långfredagen | Easter-2 | Always Friday |
| Påskdagen | Easter+0 | Always Sunday |
| Annandag påsk | Easter+1 | Always Monday |
| Första Maj | May 1 | Fixed |
| Kristi himmelsfärdsdag | Easter+39 | Always Thursday |
| Pingstdagen | Easter+49 | Always Sunday |
| Sveriges nationaldag | Jun 6 | Fixed, röd dag since 2005 |
| Midsommardagen | Sat Jun 20-26 | Moveable |
| Alla helgons dag | Sat Oct 31-Nov 6 | Moveable |
| Juldagen | Dec 25 | Fixed |
| Annandag jul | Dec 26 | Fixed |

### Arbetsfri-only holidays (NOT röd dag, but displayed as red)

| Holiday | Date |
|---------|------|
| Påskafton | Easter-1 (always Saturday) |
| Midsommarafton | Fri Jun 19-25 |
| Julafton | Dec 24 |
| Nyårsafton | Dec 31 |

### Named-only (neither arbetsfri nor röd dag)

| Holiday | Date |
|---------|------|
| Annandag pingst | Easter+50 (not a public holiday since 2005) |

### Holiday eves (helgdagsafton, NOT arbetsfri)

| Eve | Date |
|-----|------|
| Trettondagsafton | Jan 5 |
| Skärtorsdagen | Easter-3 (always Thursday) |
| Valborgsmässoafton | Apr 30 |
| Pingstafton | Easter+48 (always Saturday) |
| Allhelgonaafton | Day before Alla helgons dag (always Friday) |

### Automatic weekend rules

- All Sundays → röd dag + arbetsfri
- All Saturdays → arbetsfri only (NOT röd dag)

### dag_före_arbetsfri_helgdag

Any Mon-Fri that is not itself arbetsfri, where the next day IS an arbetsfri helgdag.
Days that are already off (weekends) are not marked — the flag is only meaningful for workdays.

### Flag days (17 fixed + 3 moveable + 1 periodic)

| Date | Description |
|------|-------------|
| Jan 1 | Nyårsdagen |
| Jan 28 | Kung Carl XVI Gustafs namnsdag |
| Mar 12 | Kronprinsessan Victorias namnsdag |
| Apr 30 | Kung Carl XVI Gustafs födelsedag |
| May 1 | Första maj |
| May 29 | Veterandagen |
| Jun 6 | Sveriges nationaldag och svenska flaggans dag |
| Jul 14 | Kronprinsessan Victorias födelsedag |
| Aug 8 | Drottning Silvias namnsdag |
| Oct 24 | FN-dagen |
| Nov 6 | Gustav Adolfsdagen |
| Dec 10 | Nobeldagen |
| Dec 23 | Drottning Silvias födelsedag |
| Dec 25 | Juldagen |
| Easter Sunday | Påskdagen |
| Easter+49 | Pingstdagen |
| Midsommardagen | Midsommardagen |
| 2nd Sunday of Sep (every 4 years) | Val till Sveriges riksdag (1994, 1998, 2002, ...) |

### The `name` field

If a day has `helgdagsafton`, that takes precedence over `helgdag` for the display `name` field.
(Both `holiday` and `holidayEve` are still available as separate fields in the API.)

### Holiday name collisions

When two holidays fall on the same day (e.g., Kristi himmelsfärdsdag + Första Maj in 2008),
names are concatenated with ", ". Easter-based holidays are listed first.

## Important Nuances

1. Julafton/Nyårsafton are NOT röd dag — only arbetsfri. They appear röd dag only when falling on Sunday (because Sunday is always röd dag).
2. Påskafton is NOT röd dag — arbetsfri only (always Saturday).
3. Regular Saturdays are NOT röd dag — only arbetsfri. Only Midsommardagen and Alla helgons dag are Saturdays with röd dag.
4. Sveriges nationaldag (Jun 6) became röd dag in 2005. The Faboul API has a bug where Jun 6 shows as "Annandag pingst" when they coincide (2022, 2033, 2044) — our engine handles this correctly by giving Sveriges nationaldag priority.
5. Annandag pingst is still listed as a helgdag name but is NOT arbetsfri/röd dag since 2005.
6. Swedish parliamentary elections ("Val till Sveriges riksdag") are a flag day every 4 years on the 2nd Sunday of September (since 1994).
7. Sweden revised its name day calendar in 2011. Our data is from 2023 (post-revision). Name days for pre-2011 years will differ.

## Development

Start a local server (ES modules require HTTP, they won't work via `file://`):

```
python3 -m http.server 8888
```

Then open:
- http://localhost:8888 — the calendar
- http://localhost:8888/test/test.html — the test suite (browser-based)

Unit tests can also run directly in Node:

```
node test/test-engine.js
node test/test-api.js
```

The Faboul API validation (2005-2030, ~9,500 days) runs in the browser via the test page,
or via Node:

```
node -e "import { runFaboulValidation } from './test/test-against-faboul.js'; await runFaboulValidation();"
```

## Testing

- **93 engine unit tests** — date primitives, Easter, moveable holidays, flag days, dag_fore
- **209 API tests** — grid structure, padding, week numbers, all endpoints
- **9,495 days validated against Faboul API** (2005-2030) — field-by-field comparison
- Must achieve 100% match (excluding documented Faboul API bugs)

## UI Design

### Desktop (>= 768px)
- 83.33% width table, centered
- Full day names (Måndag, Tisdag, ...)
- Full month selector bar with all 12 months
- Day cells: day number | flag emoji / holiday name (normal weight) / spacer / name days (italic)
- Striped diagonal patterns for out-of-month days
- Today highlighted in blue

### Mobile (< 768px)
- Full width
- Single-letter day names (M, T, O, T, F, L, S), "V" for Vecka
- Compact month selector: arrows + current month name
- Compact day cells with no spacer, smaller fonts
- Text truncated with ellipsis
- Swipe left/right to navigate months

## Deployment

Static files hosted on Render.com. Hash-based routing (`#/2026/3`) — no server rewrite rules needed.

## Future Ideas

- **npm package** — Publish `calendar-engine.js` + `namedays.js` + `calendar-api.js` as a standalone npm package (e.g., `swedish-calendar`). The engine has zero DOM dependencies and works in any JS environment (browser, Node, Deno, Bun).
- **Serverless JSON API** — A Cloudflare Worker or Deno Deploy function wrapping the engine to serve calendar data as JSON. Essentially a bug-free replacement for the Faboul API, with sub-millisecond response times.
- **Embeddable widget** — A `<script type="module">` snippet that lets anyone embed a Swedish calendar on their own site.
- **Port to other languages** — The algorithms and data are all documented here. The engine could be ported to Python, Go, Rust, etc.
