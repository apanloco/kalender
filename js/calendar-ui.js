// calendar-ui.js — DOM rendering, navigation, and URL routing.

import { getMonth } from './calendar-api.js';
import { VERSION } from './version.js';

const MONTHS = [
  'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
  'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December',
];

const DAYS_FULL = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'];
const DAYS_SHORT = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];
const DAYS_TINY = ['M', 'T', 'O', 'T', 'F', 'L', 'S'];

// Get current Swedish date (Europe/Stockholm timezone).
function getSwedishDate() {
  const now = new Date();
  const str = now.toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' });
  const [y, m, d] = str.split('-').map(Number);
  return { year: y, month: m, day: d };
}

// ============================================================
// Rendering
// ============================================================

export function renderCalendar(container, year, month) {
  const data = getMonth(year, month);
  const today = getSwedishDate();

  let html = '';

  // Month selector (desktop)
  html += '<table class="cal-month-selector"><thead><tr>';
  html += `<td class="cal-nav-arrow"><a href="#/${data.yearPrev}/${data.monthPrev}" data-nav="${data.yearPrev}/${data.monthPrev}">&lt;</a></td>`;

  for (let i = 0; i < 12; i++) {
    const isSelected = data.month === i + 1;
    const isNowMonth = data.year === today.year && today.month === i + 1;
    let cls = 'cal-month-cell';
    if (isSelected) cls += ' cal-month-current';
    if (isNowMonth) cls += ' cal-month-now';
    html += `<td class="${cls}">`;
    html += `<a href="#/${data.year}/${i + 1}" data-nav="${data.year}/${i + 1}">${MONTHS[i]}</a>`;
    html += '</td>';
  }

  html += `<td class="cal-nav-arrow"><a href="#/${data.yearNext}/${data.monthNext}" data-nav="${data.yearNext}/${data.monthNext}">&gt;</a></td>`;

  const isToday = data.year === today.year && data.month === today.month;
  html += `<td class="cal-nav-arrow cal-today-btn${isToday ? ' cal-today-btn-disabled' : ''}" title="Idag"><a href="#/${today.year}/${today.month}" data-nav="${today.year}/${today.month}">&#x27F2;</a></td>`;

  html += '</tr></thead></table>';

  // Month selector (mobile)
  html += '<div class="cal-month-selector-mobile">';
  html += `<span class="cal-mobile-month">${MONTHS[data.month - 1]} ${data.year}</span>`;
  html += '<span class="cal-mobile-nav">';
  html += `<a href="#/${data.yearPrev}/${data.monthPrev}" data-nav="${data.yearPrev}/${data.monthPrev}" class="cal-mobile-arrow">&lt;</a>`;
  html += `<a href="#/${data.yearNext}/${data.monthNext}" data-nav="${data.yearNext}/${data.monthNext}" class="cal-mobile-arrow">&gt;</a>`;
  html += `<a href="#/${today.year}/${today.month}" data-nav="${today.year}/${today.month}" class="cal-mobile-arrow cal-today-btn${isToday ? ' cal-today-btn-disabled' : ''}">&#x27F2;</a>`;
  html += '</span>';
  html += '</div>';

  // Calendar grid
  html += '<table class="cal-grid"><thead><tr class="cal-day-header">';
  html += '<td class="cal-week-col"><span class="cal-day-full">Vecka</span><span class="cal-day-short">V</span></td>';
  for (let i = 0; i < 7; i++) {
    html += `<td class="cal-day-col"><span class="cal-day-full">${DAYS_FULL[i]}</span><span class="cal-day-short">${DAYS_TINY[i]}</span></td>`;
  }
  html += '</tr></thead><tbody>';

  for (const week of data.weeks) {
    html += '<tr>';
    html += `<td class="cal-week-col">${week.week}</td>`;

    for (const day of week.days) {
      const isSameMonth = day.date.month === data.month;
      const isToday = day.date.year === today.year && day.date.month === today.month && day.date.day === today.day;
      const isFirst = day.date.day === 1;

      let cellClass = 'cal-day-cell';
      if (!isSameMonth) cellClass += ' cal-other-month';
      if (day.off && isSameMonth) cellClass += ' cal-off';
      if (day.off && !isSameMonth) cellClass += ' cal-off-other';
      if (!day.off && !isSameMonth) cellClass += ' cal-working-other';

      html += `<td class="${cellClass}">`;

      // Top row: day number + flag
      html += '<div class="cal-day-top">';
      html += `<span class="cal-day-num${isToday ? ' cal-today' : ''}">`;
      html += isFirst ? MONTHS[day.date.month - 1] : day.date.day;
      html += '</span>';
      if (day.flagday) {
        html += `<span class="cal-flag" title="${day.flagday}">\u{1F1F8}\u{1F1EA}</span>`;
      }
      html += '</div>';

      // Holiday name
      html += '<div class="cal-holiday">';
      html += day.name ? `<span>${day.name}</span>` : '&nbsp;';
      html += '</div>';

      // Spacers (hidden on mobile via CSS)
      html += '<div class="cal-spacer"></div>';

      // Name days
      html += '<div class="cal-namedays">';
      html += day.nameDays.length > 0 ? `<span>${day.nameDays.join(', ')}</span>` : '&nbsp;';
      html += '</div>';

      html += '</td>';
    }

    html += '</tr>';
  }

  html += '</tbody></table>';

  // Footer
  html += '<div class="cal-footer">';
  html += '<a href="https://github.com/apanloco/kalender">Daniel &Aring;kerud</a>';
  html += ' &middot; <a href="https://paypal.me/apanloco">&#9749; Donera</a>';
  html += ` &middot; <a href="https://github.com/apanloco/kalender/commit/${VERSION}">${VERSION}</a>`;
  html += '</div>';

  container.innerHTML = html;

  // Update page title
  document.title = `${MONTHS[month - 1]} ${year} — Kalender`;
}

// ============================================================
// Navigation
// ============================================================

let currentYear, currentMonth;
let appContainer;

// Touch tracking for swipe navigation
let touchStartX = 0;
let touchStartY = 0;

export function initApp(container) {
  appContainer = container;

  // Parse initial URL
  const { year, month } = parseUrl();
  currentYear = year;
  currentMonth = month;

  // Always set the hash so the year/month is visible in the URL
  if (!window.location.hash) {
    window.location.hash = `#/${year}/${month}`;
  }

  // Render
  renderCalendar(appContainer, currentYear, currentMonth);

  // Navigation via clicks on data-nav links
  appContainer.addEventListener('click', (e) => {
    const link = e.target.closest('[data-nav]');
    if (link) {
      e.preventDefault();
      const [y, m] = link.dataset.nav.split('/').map(Number);
      navigateTo(y, m);
    }
  });

  // Browser back/forward
  window.addEventListener('hashchange', () => {
    const { year, month } = parseUrl();
    currentYear = year;
    currentMonth = month;
    renderCalendar(appContainer, currentYear, currentMonth);
  });

  // Keyboard navigation (plain arrows only, not Alt/Ctrl/Meta)
  document.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      navigatePrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      navigateNext();
    }
  });

  // Swipe navigation
  document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;

    // Only trigger if horizontal swipe is dominant and long enough
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx > 0) {
        navigatePrev();
      } else {
        navigateNext();
      }
    }
  }, { passive: true });
}

function parseUrl() {
  const hash = window.location.hash;
  const match = hash.match(/^#\/(\d+)\/(\d+)$/);
  if (match) {
    return { year: parseInt(match[1]), month: parseInt(match[2]) };
  }
  // Default to current Swedish date
  return getSwedishDate();
}

function navigateTo(year, month) {
  currentYear = year;
  currentMonth = month;
  window.location.hash = `#/${year}/${month}`;
  renderCalendar(appContainer, year, month);
}

function navigatePrev() {
  let y = currentYear;
  let m = currentMonth - 1;
  if (m < 1) { m = 12; y--; }
  navigateTo(y, m);
}

function navigateNext() {
  let y = currentYear;
  let m = currentMonth + 1;
  if (m > 12) { m = 1; y++; }
  navigateTo(y, m);
}
