import { isAdmin } from '../auth.js';

const MONTHS = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const DAYS   = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];

const TYPE = {
  official: { label: 'Resmi Tatil',       cls: 'badge-danger'   },
  religious:{ label: 'Dini Bayram',        cls: 'badge-success'  },
  kandil:   { label: 'Kandil / Dini Gün', cls: 'badge-primary'  },
  special:  { label: 'Özel Gün',           cls: 'badge-info'     },
};

const DAYS_2026 = [
  { date:'2026-01-01', name:'Yılbaşı',                                      type:'official'  },
  { date:'2026-01-22', name:'Regaip Kandili',                                type:'kandil',  note:'Tahmini' },
  { date:'2026-02-14', name:'Sevgililer Günü',                               type:'special'  },
  { date:'2026-02-19', name:'Miraç Kandili',                                 type:'kandil',  note:'Tahmini' },
  { date:'2026-03-03', name:'Berat Kandili',                                 type:'kandil',  note:'Tahmini' },
  { date:'2026-03-08', name:'Dünya Kadınlar Günü',                           type:'special'  },
  { date:'2026-03-16', name:'Kadir Gecesi',                                  type:'kandil',  note:'Tahmini' },
  { date:'2026-03-19', name:'Ramazan Bayramı Arefe',                         type:'religious',note:'Tahmini'},
  { date:'2026-03-20', name:'Ramazan Bayramı 1. Günü',                       type:'official', note:'Tahmini'},
  { date:'2026-03-21', name:'Ramazan Bayramı 2. Günü',                       type:'official', note:'Tahmini'},
  { date:'2026-03-22', name:'Ramazan Bayramı 3. Günü',                       type:'official', note:'Tahmini'},
  { date:'2026-04-23', name:'Ulusal Egemenlik ve Çocuk Bayramı',             type:'official' },
  { date:'2026-05-01', name:'Emek ve Dayanışma Günü',                        type:'official' },
  { date:'2026-05-10', name:'Anneler Günü',                                  type:'special'  },
  { date:'2026-05-19', name:"Atatürk'ü Anma, Gençlik ve Spor Bayramı",      type:'official' },
  { date:'2026-05-26', name:'Kurban Bayramı Arefe',                          type:'religious',note:'Tahmini'},
  { date:'2026-05-27', name:'Kurban Bayramı 1. Günü',                        type:'official', note:'Tahmini'},
  { date:'2026-05-28', name:'Kurban Bayramı 2. Günü',                        type:'official', note:'Tahmini'},
  { date:'2026-05-29', name:'Kurban Bayramı 3. Günü',                        type:'official', note:'Tahmini'},
  { date:'2026-05-30', name:'Kurban Bayramı 4. Günü',                        type:'official', note:'Tahmini'},
  { date:'2026-06-01', name:'Dünya Çocuk Günü',                              type:'special'  },
  { date:'2026-06-05', name:'Dünya Çevre Günü',                              type:'special'  },
  { date:'2026-06-21', name:'Babalar Günü',                                  type:'special'  },
  { date:'2026-07-14', name:'Aşure Günü',                                    type:'kandil',  note:'Tahmini' },
  { date:'2026-07-15', name:'Demokrasi ve Milli Birlik Günü',                type:'official' },
  { date:'2026-08-30', name:'Zafer Bayramı',                                 type:'official' },
  { date:'2026-09-03', name:'Mevlid Kandili',                                type:'kandil',  note:'Tahmini' },
  { date:'2026-10-05', name:'Dünya Öğretmenler Günü',                        type:'special'  },
  { date:'2026-10-28', name:'Cumhuriyet Bayramı (Akşamı - Yarım Gün)',       type:'official' },
  { date:'2026-10-29', name:'Cumhuriyet Bayramı',                            type:'official' },
  { date:'2026-11-10', name:"Atatürk'ü Anma Günü (Saat 09:05)",             type:'special'  },
  { date:'2026-11-20', name:'Dünya Çocuk Hakları Günü',                      type:'special'  },
  { date:'2026-11-24', name:'Öğretmenler Günü',                              type:'special'  },
  { date:'2026-12-01', name:'Dünya AIDS Günü',                               type:'special'  },
  { date:'2026-12-25', name:'Noel',                                          type:'special'  },
  { date:'2026-12-31', name:'Yılsonu',                                       type:'special'  },
];

export function renderHolidays(container) {
  if (!isAdmin()) {
    container.innerHTML = `<div class="error-state"><i data-lucide="shield-off"></i><p>Bu sayfaya erişim yetkiniz yok.</p></div>`;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  const year = new Date().getFullYear();
  const today = new Date().toISOString().slice(0, 10);
  const list = year === 2026 ? DAYS_2026 : [];

  const byMonth = {};
  list.forEach(h => {
    const m = parseInt(h.date.split('-')[1]) - 1;
    if (!byMonth[m]) byMonth[m] = [];
    byMonth[m].push(h);
  });

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">${year} Yılı — Bayram, Tatil ve Özel Günler</h1>
    </div>
    <div class="holidays-legend card">
      ${Object.values(TYPE).map(t => `<span class="badge ${t.cls}">${t.label}</span>`).join('')}
      <span class="holidays-legend-note">* Dini günler tahmini olup hilale göre 1 gün farklılık gösterebilir.</span>
    </div>
    <div class="holidays-list">
      ${Object.entries(byMonth).map(([mi, days]) => `
        <div class="holidays-month-group card">
          <div class="holidays-month-header">${MONTHS[mi]}</div>
          ${days.map(h => {
            const d = new Date(h.date + 'T12:00:00');
            const isPast   = h.date < today;
            const isToday  = h.date === today;
            const t = TYPE[h.type];
            return `<div class="holiday-row holiday-type-${h.type}${isPast ? ' holiday-past' : ''}${isToday ? ' holiday-today' : ''}">
              <div class="holiday-date-col">
                <span class="holiday-num">${d.getDate()}</span>
                <span class="holiday-day">${DAYS[d.getDay()]}</span>
              </div>
              <div class="holiday-name-col">
                <span class="holiday-name">${h.name}</span>
                ${h.note ? `<span class="holiday-note">${h.note}</span>` : ''}
              </div>
              <span class="badge ${t.cls} holiday-type-badge">${t.label}</span>
            </div>`;
          }).join('')}
        </div>
      `).join('')}
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();
}
