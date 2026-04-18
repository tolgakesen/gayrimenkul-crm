import { TR } from '../i18n.js';
import { getAll } from '../storage.js';
import { formatDate } from '../utils.js';
import { hasPermission } from '../auth.js';

const MONTHS = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const DAYS = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];

let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();
let calContainer = null;

export function renderCalendar(container) {
  calContainer = container;

  if (!hasPermission('calendar','view')) {
    container.innerHTML = `<div class="error-state"><i data-lucide="shield-off"></i><p>Bu sayfaya erişim yetkiniz yok.</p></div>`;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  buildCalendarPage();
}

function buildCalendarPage() {
  const container = calContainer;
  const reminders = getAll('reminders');
  const now = new Date();
  const todayStr = toDateStr(now);

  const firstDay = new Date(calYear, calMonth, 1);
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const startDow = (firstDay.getDay() + 6) % 7; // Monday=0

  // Group reminders by date
  const byDate = {};
  reminders.forEach(r => {
    if (!r.dueDate) return;
    const d = r.dueDate.slice(0, 10);
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(r);
  });

  // Build grid cells
  let cells = '';
  let dayNum = 1;

  const totalCells = Math.ceil((startDow + daysInMonth) / 7) * 7;
  for (let i = 0; i < totalCells; i++) {
    if (i < startDow || dayNum > daysInMonth) {
      cells += `<div class="cal-day cal-day-other-month"></div>`;
      if (i >= startDow) dayNum++;
      continue;
    }
    const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
    const isToday = dateStr === todayStr;
    const isPast = dateStr < todayStr;
    const dayReminders = byDate[dateStr] || [];
    const hasEvents = dayReminders.length > 0;

    const MAX_VISIBLE = 3;
    const visible = dayReminders.slice(0, MAX_VISIBLE);
    const overflow = dayReminders.length - MAX_VISIBLE;

    cells += `
      <div class="cal-day${isToday?' cal-day-today':''}${isPast?' cal-day-past':''}${hasEvents?' cal-day-has-events':''}" data-date="${dateStr}">
        <div class="cal-day-num">${dayNum}</div>
        <div class="cal-events">
          ${visible.map(r => `
            <div class="cal-event cal-event-${r.status}" data-rid="${r.id}" title="${r.title}">
              ${r.title.length > 12 ? r.title.slice(0,12)+'…' : r.title}
            </div>
          `).join('')}
          ${overflow > 0 ? `<div class="cal-overflow">+${overflow} daha</div>` : ''}
        </div>
      </div>
    `;
    dayNum++;
  }

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">${TR.calendar.title}</h1>
      <button class="btn btn-primary" id="btn-cal-add"><i data-lucide="plus"></i> ${TR.calendar.newReminder}</button>
    </div>
    <div class="calendar-header">
      <div class="cal-month-nav">
        <button class="btn btn-ghost btn-icon" id="cal-prev"><i data-lucide="chevron-left"></i></button>
        <div class="cal-month-label">${MONTHS[calMonth]} ${calYear}</div>
        <button class="btn btn-ghost btn-icon" id="cal-next"><i data-lucide="chevron-right"></i></button>
        <button class="btn btn-ghost btn-sm" id="cal-today">Bugün</button>
      </div>
    </div>
    <div class="calendar-grid">
      ${DAYS.map(d => `<div class="cal-weekday">${d}</div>`).join('')}
      ${cells}
    </div>
    <div class="cal-legend">
      <span class="cal-legend-item"><span class="cal-event cal-event-pending" style="display:inline-block;width:12px;height:12px;border-radius:2px;margin-right:4px"></span>Bekleyen</span>
      <span class="cal-legend-item"><span class="cal-event cal-event-overdue" style="display:inline-block;width:12px;height:12px;border-radius:2px;margin-right:4px"></span>Gecikmiş</span>
      <span class="cal-legend-item"><span class="cal-event cal-event-completed" style="display:inline-block;width:12px;height:12px;border-radius:2px;margin-right:4px"></span>Tamamlandı</span>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();
  attachCalendarEvents();
}

function attachCalendarEvents() {
  document.getElementById('cal-prev')?.addEventListener('click', () => {
    calMonth--;
    if (calMonth < 0) { calMonth = 11; calYear--; }
    buildCalendarPage();
  });
  document.getElementById('cal-next')?.addEventListener('click', () => {
    calMonth++;
    if (calMonth > 11) { calMonth = 0; calYear++; }
    buildCalendarPage();
  });
  document.getElementById('cal-today')?.addEventListener('click', () => {
    const n = new Date();
    calYear = n.getFullYear();
    calMonth = n.getMonth();
    buildCalendarPage();
  });
  document.getElementById('btn-cal-add')?.addEventListener('click', async () => {
    const { openReminderForm } = await import('./reminders.js');
    openReminderForm(null, () => buildCalendarPage());
  });

  // Day click → add reminder with that date pre-filled
  document.querySelectorAll('.cal-day[data-date]').forEach(el => {
    el.addEventListener('click', async e => {
      if (e.target.closest('.cal-event')) return;
      const date = el.dataset.date;
      const { openReminderForm } = await import('./reminders.js');
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      openReminderForm({ dueDate: date + 'T' + timeStr }, () => buildCalendarPage());
    });
  });

  // Event click → open reminder detail
  document.querySelectorAll('.cal-event[data-rid]').forEach(el => {
    el.addEventListener('click', async e => {
      e.stopPropagation();
      const { openReminderDetail } = await import('./reminders.js');
      openReminderDetail(el.dataset.rid);
    });
  });
}

function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
