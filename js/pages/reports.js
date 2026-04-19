import { TR } from '../i18n.js';
import { getAll } from '../storage.js';
import { formatPrice } from '../utils.js';
import { hasPermission } from '../auth.js';

let charts = {};

export function renderReports(container) {
  if (!hasPermission('reports','view')) {
    container.innerHTML = `<div class="error-state"><i data-lucide="shield-off"></i><p>Bu sayfaya erişim yetkiniz yok. Yönetici ile iletişime geçin.</p></div>`;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  const clients = getAll('clients');
  const properties = getAll('properties');
  const reminders = getAll('reminders');

  // KPI hesapları
  const soldRented = properties.filter(p => p.status === 'sold' || p.status === 'rented');
  const totalRevenue = soldRented.reduce((s, p) => s + (p.price || 0), 0);
  const closedClients = clients.filter(c => c.pipelineStage === 'closed').length;
  const convRate = clients.length ? Math.round((closedClients / clients.length) * 100) : 0;
  const budgets = clients.filter(c => c.budgetMax).map(c => c.budgetMax);
  const avgBudget = budgets.length ? Math.round(budgets.reduce((a,b)=>a+b,0)/budgets.length) : 0;
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const closedThisMonth = clients.filter(c => c.pipelineStage === 'closed' && c.updatedAt?.startsWith(thisMonth)).length;

  destroyCharts();

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">${TR.reports.title}</h1>
    </div>

    <div class="reports-stat-grid">
      <div class="stat-card">
        <div class="stat-icon" style="background:var(--color-success-soft)"><i data-lucide="trending-up" style="color:var(--color-success)"></i></div>
        <div class="stat-info">
          <div class="stat-value">${formatPrice(totalRevenue)}</div>
          <div class="stat-label">${TR.reports.totalRevenue}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:var(--color-primary-soft)"><i data-lucide="percent" style="color:var(--color-primary)"></i></div>
        <div class="stat-info">
          <div class="stat-value">%${convRate}</div>
          <div class="stat-label">${TR.reports.conversionRate}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:var(--color-info-soft)"><i data-lucide="wallet" style="color:var(--color-info)"></i></div>
        <div class="stat-info">
          <div class="stat-value">${avgBudget ? formatPrice(avgBudget) : '—'}</div>
          <div class="stat-label">${TR.reports.avgBudget}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:var(--color-warning-soft)"><i data-lucide="check-circle" style="color:var(--color-warning)"></i></div>
        <div class="stat-info">
          <div class="stat-value">${closedThisMonth}</div>
          <div class="stat-label">${TR.reports.closedThisMonth}</div>
        </div>
      </div>
    </div>

    <div class="reports-grid">
      <div class="card report-card">
        <div class="card-header"><h3>${TR.reports.conversionFunnel}</h3></div>
        <div class="card-body report-chart-container"><canvas id="rpt-funnel"></canvas></div>
      </div>
      <div class="card report-card">
        <div class="card-header"><h3>${TR.reports.clientSources}</h3></div>
        <div class="card-body report-chart-container"><canvas id="rpt-sources"></canvas></div>
      </div>
      <div class="card report-card">
        <div class="card-header"><h3>${TR.reports.segmentDist}</h3></div>
        <div class="card-body report-chart-container"><canvas id="rpt-segments"></canvas></div>
      </div>
      <div class="card report-card">
        <div class="card-header"><h3>${TR.reports.portfolioAge}</h3></div>
        <div class="card-body report-chart-container"><canvas id="rpt-age"></canvas></div>
      </div>
      <div class="card report-card" style="grid-column:1/-1">
        <div class="card-header"><h3>${TR.reports.monthlyDeals}</h3></div>
        <div class="card-body report-chart-container" style="height:280px"><canvas id="rpt-monthly"></canvas></div>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();
  renderCharts(clients, properties);
}

function renderCharts(clients, properties) {
  const now         = new Date();
  const textColor   = getCssVar('--color-text');
  const mutedColor  = getCssVar('--color-text-muted');
  const borderColor = getCssVar('--color-border');
  const legend      = { labels: { color: textColor, font: { family: 'Inter' } } };
  const hover       = (e, els) => { e.native.target.style.cursor = els.length ? 'pointer' : 'default'; };

  // 1. Dönüşüm Hunisi (pipeline stage dağılımı — yatay bar)
  const STAGE_KEYS = ['lead','contacted','offer','contract','closed','lost'];
  const stageCounts = STAGE_KEYS.map(s => clients.filter(c => (c.pipelineStage||'lead') === s).length);
  const stageBg = ['#6b7280','#0ea5e9','#f59e0b','#3b82f6','#22c55e','#ef4444'];
  const ctx1 = document.getElementById('rpt-funnel');
  if (ctx1 && window.Chart) {
    charts.funnel = new Chart(ctx1, {
      type: 'bar',
      data: {
        labels: STAGE_KEYS.map(s => TR.pipeline[s]),
        datasets: [{ data: stageCounts, backgroundColor: stageBg, borderRadius: 6, borderSkipped: false }]
      },
      options: {
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: mutedColor }, grid: { color: borderColor } },
          y: { ticks: { color: textColor }, grid: { display: false } }
        },
        onClick: (_, elements) => {
          if (!elements.length) return;
          sessionStorage.setItem('nav_client_stage', STAGE_KEYS[elements[0].index]);
          window.location.hash = '#/clients';
        },
        onHover: hover
      }
    });
  }

  // 2. Müşteri Kaynakları (doughnut)
  const SOURCE_KEYS = ['referral','portal','social','direct','other'];
  const srcCounts = SOURCE_KEYS.map(s => clients.filter(c => (c.source||'other') === s).length);
  const ctx2 = document.getElementById('rpt-sources');
  if (ctx2 && window.Chart) {
    charts.sources = new Chart(ctx2, {
      type: 'doughnut',
      data: {
        labels: SOURCE_KEYS.map(s => TR.source[s]),
        datasets: [{ data: srcCounts, backgroundColor: ['#22c55e','#3b82f6','#f59e0b','#8b5cf6','#6b7280'], borderWidth: 0 }]
      },
      options: {
        plugins: { legend },
        cutout: '60%',
        onClick: (_, elements) => {
          if (!elements.length) return;
          sessionStorage.setItem('nav_client_source', SOURCE_KEYS[elements[0].index]);
          window.location.hash = '#/clients';
        },
        onHover: hover
      }
    });
  }

  // 3. Segment Dağılımı (pie)
  const SEG_KEYS = ['hot','warm','cold','lost'];
  const segCounts = SEG_KEYS.map(s => clients.filter(c => (c.segment||'warm') === s).length);
  const ctx3 = document.getElementById('rpt-segments');
  if (ctx3 && window.Chart) {
    charts.segments = new Chart(ctx3, {
      type: 'pie',
      data: {
        labels: ['🔥 Sıcak','🌤 Ilık','❄️ Soğuk','💤 Kayıp'],
        datasets: [{ data: segCounts, backgroundColor: ['#ef4444','#f59e0b','#0ea5e9','#6b7280'], borderWidth: 0 }]
      },
      options: {
        plugins: { legend },
        onClick: (_, elements) => {
          if (!elements.length) return;
          sessionStorage.setItem('nav_client_segment', SEG_KEYS[elements[0].index]);
          window.location.hash = '#/clients';
        },
        onHover: hover
      }
    });
  }

  // 4. Portföy Bina Yaşı Analizi (tüm ilanlar)
  const AGE_KEYS = ['0-5','6-10','11-20','21-30','30+'];
  const ageBuckets = { '0-5':0, '6-10':0, '11-20':0, '21-30':0, '30+':0 };
  properties.forEach(p => {
    const a = p.buildingAge;
    if (a == null) return;
    if (a <= 5) ageBuckets['0-5']++;
    else if (a <= 10) ageBuckets['6-10']++;
    else if (a <= 20) ageBuckets['11-20']++;
    else if (a <= 30) ageBuckets['21-30']++;
    else ageBuckets['30+']++;
  });
  const ctx4 = document.getElementById('rpt-age');
  if (ctx4 && window.Chart) {
    charts.age = new Chart(ctx4, {
      type: 'bar',
      data: {
        labels: AGE_KEYS.map(k => k + ' yıl'),
        datasets: [{ label: 'İlan Sayısı', data: Object.values(ageBuckets), backgroundColor: '#8b5cf6', borderRadius: 6 }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: mutedColor }, grid: { display: false } },
          y: { ticks: { color: mutedColor }, grid: { color: borderColor }, beginAtZero: true }
        },
        onClick: (_, elements) => {
          if (!elements.length) return;
          sessionStorage.setItem('nav_prop_age', AGE_KEYS[elements[0].index]);
          window.location.hash = '#/properties';
        },
        onHover: hover
      }
    });
  }

  // 5. Aylık Kapanan Anlaşmalar — son 12 ay (pipelineStage=closed, updatedAt baz alınır)
  const MONTHS_TR = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
  const monthKeys   = [];
  const monthLabels = [];
  const monthData   = [];
  for (let i = 11; i >= 0; i--) {
    const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    monthKeys.push(key);
    monthLabels.push(MONTHS_TR[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2));
    monthData.push(clients.filter(c => c.pipelineStage === 'closed' && (c.updatedAt||'').startsWith(key)).length);
  }
  const ctx5 = document.getElementById('rpt-monthly');
  if (ctx5 && window.Chart) {
    charts.monthly = new Chart(ctx5, {
      type: 'bar',
      data: {
        labels: monthLabels,
        datasets: [{ label: 'Kapanan Müşteri', data: monthData, backgroundColor: '#3b82f6', borderRadius: 6 }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: mutedColor, maxRotation: 45 }, grid: { display: false } },
          y: { ticks: { color: mutedColor }, grid: { color: borderColor }, beginAtZero: true }
        },
        onClick: (_, elements) => {
          if (!elements.length) return;
          sessionStorage.setItem('nav_client_stage', 'closed');
          sessionStorage.setItem('nav_client_month', monthKeys[elements[0].index]);
          window.location.hash = '#/clients';
        },
        onHover: hover
      }
    });
  }
}

function destroyCharts() {
  Object.values(charts).forEach(c => { try { c.destroy(); } catch {} });
  charts = {};
}

function getCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
