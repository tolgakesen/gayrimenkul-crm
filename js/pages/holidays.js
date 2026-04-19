import { isAdmin } from '../auth.js';
import { getAll } from '../storage.js';

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

// ── Client matching ──────────────────────────────────────────────────────────

const TEACHER_KEYWORDS = ['öğretmen','öğrt','akademisyen','eğitimci','okutman','profesör','doçent','pedagog'];
const DOCTOR_KEYWORDS  = ['doktor','hekim','uzman','cerrah','eczacı','hemşire','fizyoterapist'];
const ENGINEER_KEYWORDS= ['mühendis','müh.','tekniker','mimar'];

function occMatch(occ, keywords) {
  if (!occ) return false;
  const o = occ.toLowerCase();
  return keywords.some(k => o.includes(k));
}

function toWaPhone(raw) {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('90')) return digits;
  if (digits.startsWith('0'))  return '9' + digits;
  return '90' + digits;
}

function waLink(phone, message) {
  const p = toWaPhone(phone);
  if (!p) return null;
  return `https://wa.me/${p}?text=${encodeURIComponent(message)}`;
}

function greetingText(client, holidayName, type) {
  const name = [client.firstName, client.lastName].filter(Boolean).join(' ');
  if (type === 'birthday') {
    return `Sayın ${name}, doğum gününüz kutlu olsun! 🎂 Sağlık, mutluluk ve başarı dolu bir yıl dileriz.`;
  }
  if (type === 'official' || type === 'religious') {
    return `Sayın ${name}, ${holidayName} kutlu olsun! 🎉 İyi bayramlar dileriz.`;
  }
  return `Sayın ${name}, ${holidayName} kutlu olsun! 🌸`;
}

function segmentIcon(s) {
  return { hot: '🔥', warm: '🌤', cold: '❄️', lost: '💤' }[s] || '';
}
function segmentCls(s) {
  return { hot: 'badge-danger', warm: 'badge-warning', cold: 'badge-info', lost: 'badge-secondary' }[s] || 'badge-secondary';
}
function stageCls(s) {
  return { lead:'secondary', contacted:'info', offer:'warning', contract:'primary', closed:'success', lost:'danger' }[s] || 'secondary';
}
function stageLabel(s) {
  return { lead:'Potansiyel', contacted:'Görüşme', offer:'Teklif', contract:'Sözleşme', closed:'Kapandı', lost:'Kaybedildi' }[s] || s;
}

function findRelatedClients(h, clients) {
  const [, mm, dd] = h.date.split('-');
  const monthDay = `${mm}-${dd}`;
  const groups = [];

  // 1. Doğum günü eşleşmesi
  const bday = clients.filter(c => c.birthday && c.birthday.slice(5) === monthDay);
  if (bday.length) {
    groups.push({ icon: '🎂', title: 'Bugün Doğum Günü Olanlar', clients: bday, type: 'birthday' });
  }

  const activePipeline = clients.filter(c =>
    c.pipelineStage !== 'lost' && ['hot','warm'].includes(c.segment)
  );

  // 2. Bayram / resmi tatil / kandil → tebrik listesi
  if (['official','religious','kandil'].includes(h.type)) {
    if (activePipeline.length) {
      const sorted = [...activePipeline].sort((a, b) => {
        const so = { hot: 0, warm: 1, cold: 2 };
        return (so[a.segment] ?? 3) - (so[b.segment] ?? 3);
      });
      groups.push({ icon: '🎉', title: 'Bayram Tebriği Gönderilebilir (Aktif Müşteriler)', clients: sorted, type: h.type });
    }
  }

  // 3. Özel günler — kural tabanlı
  const nl = h.name.toLowerCase();

  if (nl.includes('öğretmen')) {
    const matched = clients.filter(c => occMatch(c.occupation, TEACHER_KEYWORDS));
    if (matched.length) groups.push({ icon: '🏫', title: 'Öğretmen / Akademisyen Müşteriler', clients: matched, type: h.type });
  }

  if (nl.includes('anneler')) {
    // Aktif müşterilerin tümüne annesine hediye ev önerisi :)
    const active = clients.filter(c => c.pipelineStage !== 'lost');
    if (active.length) groups.push({ icon: '💐', title: 'Tüm Aktif Müşteriler — Anneler Günü Kampanyası', clients: active, type: h.type });
  }

  if (nl.includes('babalar')) {
    const active = clients.filter(c => c.pipelineStage !== 'lost');
    if (active.length) groups.push({ icon: '👔', title: 'Tüm Aktif Müşteriler — Babalar Günü Kampanyası', clients: active, type: h.type });
  }

  if (nl.includes('sevgililer')) {
    const active = clients.filter(c => c.pipelineStage !== 'lost');
    if (active.length) groups.push({ icon: '💝', title: 'Tüm Aktif Müşteriler — Sevgililer Günü Kampanyası', clients: active, type: h.type });
  }

  if (nl.includes('kadınlar')) {
    const active = clients.filter(c => c.pipelineStage !== 'lost');
    if (active.length) groups.push({ icon: '🌹', title: 'Tüm Aktif Müşteriler — Dünya Kadınlar Günü', clients: active, type: h.type });
  }

  if (nl.includes('yılbaşı') || nl.includes('yılsonu')) {
    const active = clients.filter(c => c.pipelineStage !== 'lost');
    if (active.length) groups.push({ icon: '🎆', title: 'Tüm Aktif Müşteriler — Yeni Yıl Tebriği', clients: active, type: h.type });
  }

  if (nl.includes('doktor') || nl.includes('tıp') || nl.includes('sağlık')) {
    const matched = clients.filter(c => occMatch(c.occupation, DOCTOR_KEYWORDS));
    if (matched.length) groups.push({ icon: '🏥', title: 'Sağlık Sektörü Müşteriler', clients: matched, type: h.type });
  }

  return groups;
}

// ── Render ───────────────────────────────────────────────────────────────────

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
    <p class="holidays-click-hint"><i data-lucide="mouse-pointer-click" style="width:14px;height:14px;vertical-align:middle;margin-right:4px"></i>Bir güne tıklayarak ilgili müşterileri görüntüleyebilirsiniz.</p>
    <div class="holidays-list">
      ${Object.entries(byMonth).map(([mi, days]) => `
        <div class="holidays-month-group card">
          <div class="holidays-month-header">${MONTHS[mi]}</div>
          ${days.map(h => {
            const d = new Date(h.date + 'T12:00:00');
            const isPast  = h.date < today;
            const isToday = h.date === today;
            const t = TYPE[h.type];
            return `<div class="holiday-row holiday-type-${h.type}${isPast ? ' holiday-past' : ''}${isToday ? ' holiday-today' : ''} holiday-row-clickable"
              data-date="${h.date}" data-name="${h.name}" data-type="${h.type}">
              <div class="holiday-date-col">
                <span class="holiday-num">${d.getDate()}</span>
                <span class="holiday-day">${DAYS[d.getDay()]}</span>
              </div>
              <div class="holiday-name-col">
                <span class="holiday-name">${h.name}</span>
                ${h.note ? `<span class="holiday-note">${h.note}</span>` : ''}
              </div>
              <span class="badge ${t.cls} holiday-type-badge">${t.label}</span>
              <span class="holiday-clients-icon" title="İlgili müşterileri gör"><i data-lucide="users" style="width:15px;height:15px"></i></span>
            </div>`;
          }).join('')}
        </div>
      `).join('')}
    </div>

    <!-- Side panel -->
    <div id="holiday-panel-overlay" class="holiday-panel-overlay" style="display:none"></div>
    <div id="holiday-panel" class="holiday-panel" style="display:none">
      <div class="holiday-panel-header">
        <div>
          <div class="holiday-panel-title" id="hp-title"></div>
          <div class="holiday-panel-date" id="hp-date"></div>
        </div>
        <button class="btn btn-ghost btn-icon" id="hp-close"><i data-lucide="x"></i></button>
      </div>
      <div id="hp-body" class="holiday-panel-body"></div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();
  attachHolidayEvents(list);
}

function attachHolidayEvents(list) {
  document.querySelectorAll('.holiday-row-clickable').forEach(row => {
    row.addEventListener('click', () => {
      const date = row.dataset.date;
      const name = row.dataset.name;
      const type = row.dataset.type;
      const h = list.find(x => x.date === date) || { date, name, type };
      openHolidayPanel(h);
    });
  });

  document.getElementById('hp-close')?.addEventListener('click', closeHolidayPanel);
  document.getElementById('holiday-panel-overlay')?.addEventListener('click', closeHolidayPanel);
}

function openHolidayPanel(h) {
  const clients = getAll('clients');
  const groups  = findRelatedClients(h, clients);

  const d = new Date(h.date + 'T12:00:00');
  document.getElementById('hp-title').textContent = h.name;
  document.getElementById('hp-date').textContent =
    `${d.getDate()} ${['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'][d.getMonth()]} ${d.getFullYear()}`;

  const body = document.getElementById('hp-body');

  if (!groups.length) {
    body.innerHTML = `<div class="empty-state" style="padding:2rem 1rem">
      <i data-lucide="user-x" style="width:36px;height:36px;opacity:.4"></i>
      <p style="margin:.75rem 0 .25rem;font-weight:500">İlgili müşteri bulunamadı</p>
      <p class="text-muted" style="font-size:.82rem">Bu güne özel doğum günü veya eşleşen profil yok.</p>
    </div>`;
    if (window.lucide) window.lucide.createIcons();
    showPanel();
    return;
  }

  body.innerHTML = groups.map(g => `
    <div class="hp-group">
      <div class="hp-group-title">${g.icon} ${g.title} <span class="badge badge-secondary" style="font-size:.7rem">${g.clients.length}</span></div>
      <div class="hp-clients-list">
        ${g.clients.map(c => clientCard(c, h, g.type)).join('')}
      </div>
    </div>
  `).join('');

  if (window.lucide) window.lucide.createIcons();
  showPanel();
}

function clientCard(c, h, gtype) {
  const fullName = [c.firstName, c.lastName].filter(Boolean).join(' ');
  const msg = greetingText(c, h.name, gtype);
  const wa  = c.phone ? waLink(c.phone, msg) : null;
  const detailHref = `#/clients/${c.id}`;

  return `<div class="hp-client-card">
    <div class="hp-client-info">
      <div class="hp-client-name">${fullName}</div>
      <div class="hp-client-meta">
        ${c.phone ? `<span style="font-size:.8rem;color:var(--color-text-muted)">${c.phone}</span>` : ''}
        ${c.occupation ? `<span class="text-muted" style="font-size:.78rem">· ${c.occupation}</span>` : ''}
      </div>
      <div style="margin-top:.3rem;display:flex;gap:.35rem;flex-wrap:wrap">
        <span class="badge ${segmentCls(c.segment)}" style="font-size:.7rem">${segmentIcon(c.segment)} ${c.segment||'—'}</span>
        <span class="badge badge-${stageCls(c.pipelineStage)}" style="font-size:.7rem">${stageLabel(c.pipelineStage)}</span>
        ${c.birthday && c.birthday.slice(5) === h.date.slice(5) ? `<span class="badge badge-warning" style="font-size:.7rem">🎂 Doğum Günü</span>` : ''}
      </div>
    </div>
    <div class="hp-client-actions">
      ${wa ? `<a href="${wa}" target="_blank" rel="noopener" class="btn btn-sm hp-wa-btn" title="WhatsApp tebrik mesajı gönder">
        <svg viewBox="0 0 24 24" fill="currentColor" style="width:15px;height:15px;margin-right:4px"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.37 5.07L2 22l5.09-1.35A9.93 9.93 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm4.64 13.57c-.2.55-1.16 1.06-1.6 1.1-.4.04-.79.18-2.65-.55-2.23-.88-3.66-3.15-3.77-3.3-.11-.14-.88-1.18-.88-2.25 0-1.07.56-1.59.76-1.81.2-.22.44-.27.58-.27l.42.01c.14.01.32-.05.5.38.18.46.63 1.53.68 1.64.06.11.1.25.02.39-.08.15-.11.24-.22.37-.11.13-.23.28-.33.38-.11.11-.22.23-.09.45.13.22.56.93 1.21 1.51.84.74 1.54.98 1.76 1.08.22.11.35.09.48-.05.13-.15.54-.64.68-.86.15-.22.29-.18.49-.11.2.07 1.28.6 1.5.71.22.11.37.16.42.26.06.09.06.52-.14 1.07z"/></svg>
        WhatsApp
      </a>` : ''}
      <a href="${detailHref}" class="btn btn-sm btn-ghost" title="Müşteri detayı"><i data-lucide="eye" style="width:14px;height:14px"></i></a>
    </div>
  </div>`;
}

function showPanel() {
  document.getElementById('holiday-panel-overlay').style.display = 'block';
  document.getElementById('holiday-panel').style.display = 'flex';
  requestAnimationFrame(() => {
    document.getElementById('holiday-panel').classList.add('holiday-panel-open');
  });
}

function closeHolidayPanel() {
  const panel = document.getElementById('holiday-panel');
  panel.classList.remove('holiday-panel-open');
  panel.addEventListener('transitionend', () => {
    panel.style.display = 'none';
    document.getElementById('holiday-panel-overlay').style.display = 'none';
  }, { once: true });
}
