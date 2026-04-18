import { isAdmin } from '../auth.js';

let clockInterval = null;

const COUNTRIES = [
  { id:'al', name:'Arnavutluk',    flag:'🇦🇱', tz:'Europe/Tirane'     },
  { id:'ad', name:'Andorra',       flag:'🇦🇩', tz:'Europe/Andorra'    },
  { id:'at', name:'Avusturya',     flag:'🇦🇹', tz:'Europe/Vienna'     },
  { id:'by', name:'Belarus',       flag:'🇧🇾', tz:'Europe/Minsk'      },
  { id:'be', name:'Belçika',       flag:'🇧🇪', tz:'Europe/Brussels'   },
  { id:'ba', name:'Bosna Hersek',  flag:'🇧🇦', tz:'Europe/Sarajevo'   },
  { id:'bg', name:'Bulgaristan',   flag:'🇧🇬', tz:'Europe/Sofia'      },
  { id:'hr', name:'Hırvatistan',   flag:'🇭🇷', tz:'Europe/Zagreb'     },
  { id:'cy', name:'Kıbrıs',        flag:'🇨🇾', tz:'Asia/Nicosia'      },
  { id:'cz', name:'Çekya',         flag:'🇨🇿', tz:'Europe/Prague'     },
  { id:'dk', name:'Danimarka',     flag:'🇩🇰', tz:'Europe/Copenhagen' },
  { id:'ee', name:'Estonya',       flag:'🇪🇪', tz:'Europe/Tallinn'    },
  { id:'fi', name:'Finlandiya',    flag:'🇫🇮', tz:'Europe/Helsinki'   },
  { id:'fr', name:'Fransa',        flag:'🇫🇷', tz:'Europe/Paris'      },
  { id:'de', name:'Almanya',       flag:'🇩🇪', tz:'Europe/Berlin'     },
  { id:'gr', name:'Yunanistan',    flag:'🇬🇷', tz:'Europe/Athens'     },
  { id:'hu', name:'Macaristan',    flag:'🇭🇺', tz:'Europe/Budapest'   },
  { id:'is', name:'İzlanda',       flag:'🇮🇸', tz:'Atlantic/Reykjavik'},
  { id:'ie', name:'İrlanda',       flag:'🇮🇪', tz:'Europe/Dublin'     },
  { id:'it', name:'İtalya',        flag:'🇮🇹', tz:'Europe/Rome'       },
  { id:'xk', name:'Kosova',        flag:'🇽🇰', tz:'Europe/Belgrade'   },
  { id:'lv', name:'Letonya',       flag:'🇱🇻', tz:'Europe/Riga'       },
  { id:'li', name:'Lihtenştayn',   flag:'🇱🇮', tz:'Europe/Vaduz'      },
  { id:'lt', name:'Litvanya',      flag:'🇱🇹', tz:'Europe/Vilnius'    },
  { id:'lu', name:'Lüksemburg',    flag:'🇱🇺', tz:'Europe/Luxembourg' },
  { id:'mt', name:'Malta',         flag:'🇲🇹', tz:'Europe/Malta'      },
  { id:'md', name:'Moldova',       flag:'🇲🇩', tz:'Europe/Chisinau'   },
  { id:'mc', name:'Monako',        flag:'🇲🇨', tz:'Europe/Monaco'     },
  { id:'me', name:'Karadağ',       flag:'🇲🇪', tz:'Europe/Podgorica'  },
  { id:'nl', name:'Hollanda',      flag:'🇳🇱', tz:'Europe/Amsterdam'  },
  { id:'mk', name:'K. Makedonya',  flag:'🇲🇰', tz:'Europe/Skopje'     },
  { id:'no', name:'Norveç',        flag:'🇳🇴', tz:'Europe/Oslo'       },
  { id:'pl', name:'Polonya',       flag:'🇵🇱', tz:'Europe/Warsaw'     },
  { id:'pt', name:'Portekiz',      flag:'🇵🇹', tz:'Europe/Lisbon'     },
  { id:'ro', name:'Romanya',       flag:'🇷🇴', tz:'Europe/Bucharest'  },
  { id:'ru', name:'Rusya',         flag:'🇷🇺', tz:'Europe/Moscow'     },
  { id:'sm', name:'San Marino',    flag:'🇸🇲', tz:'Europe/San_Marino' },
  { id:'rs', name:'Sırbistan',     flag:'🇷🇸', tz:'Europe/Belgrade'   },
  { id:'sk', name:'Slovakya',      flag:'🇸🇰', tz:'Europe/Bratislava' },
  { id:'si', name:'Slovenya',      flag:'🇸🇮', tz:'Europe/Ljubljana'  },
  { id:'es', name:'İspanya',       flag:'🇪🇸', tz:'Europe/Madrid'     },
  { id:'se', name:'İsveç',         flag:'🇸🇪', tz:'Europe/Stockholm'  },
  { id:'ch', name:'İsviçre',       flag:'🇨🇭', tz:'Europe/Zurich'     },
  { id:'tr', name:'Türkiye',       flag:'🇹🇷', tz:'Europe/Istanbul'   },
  { id:'ua', name:'Ukrayna',       flag:'🇺🇦', tz:'Europe/Kyiv'       },
  { id:'gb', name:'İngiltere',     flag:'🇬🇧', tz:'Europe/London'     },
  { id:'va', name:'Vatikan',       flag:'🇻🇦', tz:'Europe/Vatican'    },
];

function makeClock(id) {
  const ticks = [];
  for (let i = 0; i < 60; i++) {
    const a = i * 6 * Math.PI / 180;
    const major = i % 5 === 0;
    const r1 = major ? 36 : 41;
    const x1 = (50 + r1 * Math.sin(a)).toFixed(2);
    const y1 = (50 - r1 * Math.cos(a)).toFixed(2);
    const x2 = (50 + 45 * Math.sin(a)).toFixed(2);
    const y2 = (50 - 45 * Math.cos(a)).toFixed(2);
    ticks.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="ck-tick${major ? ' ck-tick-h' : ''}"/>`);
  }
  return `<svg viewBox="0 0 100 100" class="ck-svg" id="ck-${id}">
    <circle cx="50" cy="50" r="49" class="ck-bg"/>
    <circle cx="50" cy="50" r="48" class="ck-ring"/>
    ${ticks.join('')}
    <line id="ck-${id}-h" x1="50" y1="50" x2="50" y2="27" class="ck-hand-h" transform="rotate(0 50 50)"/>
    <line id="ck-${id}-m" x1="50" y1="53" x2="50" y2="14" class="ck-hand-m" transform="rotate(0 50 50)"/>
    <line id="ck-${id}-s" x1="50" y1="58" x2="50" y2="10" class="ck-hand-s" transform="rotate(0 50 50)"/>
    <circle cx="50" cy="50" r="2.5" class="ck-dot"/>
  </svg>`;
}

function getOffset(tz) {
  try {
    return new Intl.DateTimeFormat('en', { timeZone: tz, timeZoneName: 'shortOffset' })
      .formatToParts(new Date()).find(p => p.type === 'timeZoneName')?.value || '';
  } catch { return ''; }
}

function getHMS(tz) {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    }).formatToParts(new Date());
    const get = t => parseInt(parts.find(p => p.type === t)?.value ?? '0');
    return { h: get('hour'), m: get('minute'), s: get('second') };
  } catch { return { h: 0, m: 0, s: 0 }; }
}

function tick() {
  if (!document.getElementById('world-clocks-grid')) {
    clearInterval(clockInterval);
    clockInterval = null;
    return;
  }
  COUNTRIES.forEach(c => {
    const hEl = document.getElementById(`ck-${c.id}-h`);
    if (!hEl) return;
    const { h, m, s } = getHMS(c.tz);
    const ha = ((h % 12) + m / 60 + s / 3600) * 30;
    const ma = m * 6 + s * 0.1;
    const sa = s * 6;
    hEl.setAttribute('transform', `rotate(${ha.toFixed(1)} 50 50)`);
    document.getElementById(`ck-${c.id}-m`).setAttribute('transform', `rotate(${ma.toFixed(1)} 50 50)`);
    document.getElementById(`ck-${c.id}-s`).setAttribute('transform', `rotate(${sa.toFixed(1)} 50 50)`);
    const timeEl = document.getElementById(`ck-${c.id}-time`);
    if (timeEl) timeEl.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  });
}

export function renderWorldClocks(container) {
  if (!isAdmin()) {
    container.innerHTML = `<div class="error-state"><i data-lucide="shield-off"></i><p>Bu sayfaya erişim yetkiniz yok.</p></div>`;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  if (clockInterval) { clearInterval(clockInterval); clockInterval = null; }

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Avrupa Dünya Saati</h1>
    </div>
    <div class="clocks-grid" id="world-clocks-grid">
      ${COUNTRIES.map(c => `
        <div class="clock-card card">
          <div class="ck-flag">${c.flag}</div>
          <div class="ck-name">${c.name}</div>
          ${makeClock(c.id)}
          <div class="ck-time" id="ck-${c.id}-time">--:--:--</div>
          <div class="ck-offset">${getOffset(c.tz)}</div>
        </div>
      `).join('')}
    </div>
  `;

  tick();
  clockInterval = setInterval(tick, 1000);
}
