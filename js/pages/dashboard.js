import { TR } from '../i18n.js';
import { getAll, getAll as getActivity } from '../storage.js';
import { formatPrice, formatDate, timeAgo } from '../utils.js';
import { isAdmin } from '../auth.js';

let charts = {};

export function renderDashboard(container) {
  const admin = isAdmin();
  const allProperties = getAll('properties');
  const properties = admin ? allProperties : allProperties.filter(p => p.status === 'active');
  const clients = getAll('clients');
  const reminders = getAll('reminders');
  const activity = getAll('activity');

  const active = admin ? properties.filter(p => p.status === 'active').length : properties.length;
  const pending = reminders.filter(r => r.status === 'pending').length;
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const upcoming = reminders
    .filter(r => r.status === 'pending' && new Date(r.dueDate) <= in24h)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 5);

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">${TR.dashboard.title}</h1>
    </div>

    <div class="stat-grid">
      <a href="#/properties" class="stat-card stat-card-link">
        <div class="stat-icon" style="background:var(--color-primary-soft)"><i data-lucide="building-2" style="color:var(--color-primary)"></i></div>
        <div class="stat-info">
          <div class="stat-value">${admin ? properties.length : active}</div>
          <div class="stat-label">${admin ? TR.dashboard.totalProperties : TR.dashboard.activeProperties}</div>
        </div>
        <i data-lucide="chevron-right" class="stat-arrow"></i>
      </a>
      ${admin ? `
      <a href="#/properties" class="stat-card stat-card-link" data-filter-status="active">
        <div class="stat-icon" style="background:var(--color-success-soft)"><i data-lucide="check-circle" style="color:var(--color-success)"></i></div>
        <div class="stat-info">
          <div class="stat-value">${active}</div>
          <div class="stat-label">${TR.dashboard.activeProperties}</div>
        </div>
        <i data-lucide="chevron-right" class="stat-arrow"></i>
      </a>` : ''}
      <a href="#/clients" class="stat-card stat-card-link">
        <div class="stat-icon" style="background:var(--color-info-soft)"><i data-lucide="users" style="color:var(--color-info)"></i></div>
        <div class="stat-info">
          <div class="stat-value">${clients.length}</div>
          <div class="stat-label">${TR.dashboard.totalClients}</div>
        </div>
        <i data-lucide="chevron-right" class="stat-arrow"></i>
      </a>
      <a href="#/reminders" class="stat-card stat-card-link" data-filter-status="pending">
        <div class="stat-icon" style="background:var(--color-warning-soft)"><i data-lucide="bell" style="color:var(--color-warning)"></i></div>
        <div class="stat-info">
          <div class="stat-value">${pending}</div>
          <div class="stat-label">${TR.dashboard.pendingReminders}</div>
        </div>
        <i data-lucide="chevron-right" class="stat-arrow"></i>
      </a>
    </div>

    <div class="dashboard-grid">
      <div class="card chart-card">
        <div class="card-header"><h3>${TR.dashboard.portfolioStatus}</h3></div>
        <div class="card-body"><canvas id="chart-status" height="220"></canvas></div>
      </div>
      <div class="card chart-card">
        <div class="card-header"><h3>${TR.dashboard.priceByDistrict}</h3></div>
        <div class="card-body"><canvas id="chart-price" height="220"></canvas></div>
      </div>
      <div class="card chart-card">
        <div class="card-header"><h3>${TR.dashboard.clientStats}</h3></div>
        <div class="card-body"><canvas id="chart-clients" height="220"></canvas></div>
      </div>

      <div class="card">
        <div class="card-header"><h3>${TR.dashboard.upcomingReminders}</h3></div>
        <div class="card-body">
          ${upcoming.length ? upcoming.map(r => {
            const c = r.clientId ? clients.find(x => x.id === r.clientId) : null;
            const overdue = new Date(r.dueDate) < now;
            return `<div class="activity-item activity-item-link${!overdue ? ' reminder-alert-blink' : ''}" data-reminder-id="${r.id}">
              <div class="activity-icon overdue"><i data-lucide="bell"></i></div>
              <div class="activity-content">
                <div class="activity-title">${r.title}</div>
                <div class="activity-meta">${formatDate(r.dueDate)} ${c ? '· ' + c.firstName + ' ' + c.lastName : ''}</div>
              </div>
              ${overdue ? '<span class="badge badge-danger">Gecikti</span>' : '<i data-lucide="chevron-right" class="activity-arrow"></i>'}
            </div>`;
          }).join('') : `<p class="text-muted">${TR.dashboard.noReminders}</p>`}
        </div>
      </div>

      ${admin ? `<div class="card">
        <div class="card-header"><h3>${TR.dashboard.recentActivity}</h3></div>
        <div class="card-body">
          ${activity.length ? activity.slice(0,8).map(a => `
            <div class="activity-item">
              <div class="activity-icon"><i data-lucide="${activityIcon(a.type)}"></i></div>
              <div class="activity-content">
                <div class="activity-title">${a.title}</div>
                <div class="activity-meta">${timeAgo(a.date)}</div>
              </div>
            </div>
          `).join('') : `<p class="text-muted">${TR.dashboard.noActivity}</p>`}
        </div>
      </div>` : ''}
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();
  renderCharts(properties, clients);

  // Stat card filtre aktarımı
  container.querySelectorAll('.stat-card-link[data-filter-status]').forEach(el => {
    el.addEventListener('click', e => {
      sessionStorage.setItem('dashboard_filter_status', el.dataset.filterStatus);
    });
  });

  container.querySelectorAll('[data-reminder-id]').forEach(el => {
    el.addEventListener('click', async () => {
      const { openReminderDetail } = await import('./reminders.js');
      openReminderDetail(el.dataset.reminderId);
    });
  });
}

function activityIcon(type) {
  const map = { property_add: 'plus', property_edit: 'pencil', property_delete: 'trash-2', client_add: 'user-plus', client_edit: 'user', reminder_add: 'bell', status_change: 'refresh-cw' };
  return map[type] || 'activity';
}

function renderCharts(properties, clients) {
  destroyCharts();

  const textColor   = getCssVar('--color-text');
  const mutedColor  = getCssVar('--color-text-muted');
  const borderColor = getCssVar('--color-border');

  // 1. Portföy durumu — doughnut (tüm portföyler)
  const STATUS_KEYS = ['active', 'sold', 'rented', 'withdrawn'];
  const statusCounts = { active: 0, sold: 0, rented: 0, withdrawn: 0 };
  properties.forEach(p => { if (statusCounts[p.status] != null) statusCounts[p.status]++; });
  const ctx1 = document.getElementById('chart-status');
  if (ctx1 && window.Chart) {
    charts.status = new Chart(ctx1, {
      type: 'doughnut',
      data: {
        labels: ['Aktif', 'Satıldı', 'Kiralandı', 'Çekildi'],
        datasets: [{ data: Object.values(statusCounts), backgroundColor: ['#3b82f6','#22c55e','#f59e0b','#6b7280'], borderWidth: 0 }]
      },
      options: {
        plugins: { legend: { position: 'right', labels: { color: textColor } } },
        cutout: '60%',
        onClick: (_, elements) => {
          if (!elements.length) return;
          sessionStorage.setItem('dashboard_filter_status', STATUS_KEYS[elements[0].index]);
          window.location.hash = '#/properties';
        },
        onHover: (e, elements) => { e.native.target.style.cursor = elements.length ? 'pointer' : 'default'; }
      }
    });
  }

  // 2. İlçe bazlı ort. ₺/m² — satılık ve kiralık ayrı ayrı, m² yoksa ortalama fiyat göster
  const saleMap = {};
  const rentMap = {};
  properties.filter(p => p.district && p.price > 0).forEach(p => {
    const map = p.listingType === 'rent' ? rentMap : saleMap;
    if (!map[p.district]) map[p.district] = { pricePerM2: [], price: [] };
    const sqm = Number(p.squareMeters);
    if (sqm > 0) map[p.district].pricePerM2.push(p.price / sqm);
    map[p.district].price.push(p.price);
  });

  const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
  const districtSet = new Set([...Object.keys(saleMap), ...Object.keys(rentMap)]);
  const districtEntries = [...districtSet].map(d => {
    const sVals = saleMap[d]?.pricePerM2.length ? saleMap[d].pricePerM2 : saleMap[d]?.price || [];
    const sortVal = avg(sVals) ?? avg(rentMap[d]?.pricePerM2 || rentMap[d]?.price || []) ?? 0;
    return [d, sortVal];
  }).sort((a, b) => b[1] - a[1]).slice(0, 8);

  const districtLabels = districtEntries.map(([d]) => d);
  const saleData = districtLabels.map(d => {
    const vals = saleMap[d];
    return vals ? (avg(vals.pricePerM2) ?? avg(vals.price)) : null;
  });
  const rentData = districtLabels.map(d => {
    const vals = rentMap[d];
    return vals ? (avg(vals.pricePerM2) ?? avg(vals.price)) : null;
  });

  const hasSale = saleData.some(v => v !== null);
  const hasRent = rentData.some(v => v !== null);
  const datasets = [];
  if (hasSale) datasets.push({ label: 'Satılık ₺/m²', data: saleData, backgroundColor: '#3b82f6', borderRadius: 4 });
  if (hasRent) datasets.push({ label: 'Kiralık ₺/m²', data: rentData, backgroundColor: '#22c55e', borderRadius: 4 });

  const ctx2 = document.getElementById('chart-price');
  if (ctx2 && window.Chart) {
    charts.price = new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: districtLabels.length ? districtLabels : ['Veri Yok'],
        datasets: datasets.length ? datasets : [{ label: 'Veri Yok', data: [0], backgroundColor: '#6b7280', borderRadius: 4 }],
      },
      options: {
        plugins: {
          legend: { display: datasets.length > 1, labels: { color: textColor, boxWidth: 12 } },
          tooltip: { callbacks: { label: ctx => ' ₺' + (ctx.parsed.y ?? 0).toLocaleString('tr-TR') + '/m²' } },
        },
        scales: {
          x: { ticks: { color: mutedColor }, grid: { color: borderColor } },
          y: { ticks: { color: mutedColor, callback: v => '₺' + (v / 1000).toFixed(0) + 'K' }, grid: { color: borderColor } },
        },
        onClick: (_, elements) => {
          if (!elements.length || !districtLabels.length) return;
          sessionStorage.setItem('nav_prop_search', districtLabels[elements[0].index]);
          window.location.hash = '#/properties';
        },
        onHover: (e, elements) => { e.native.target.style.cursor = elements.length ? 'pointer' : 'default'; },
      },
    });
  }

  // 3. Müşteri tipi dağılımı — pie
  const TYPE_KEYS = ['buyer', 'seller', 'tenant'];
  const typeCounts = { buyer: 0, seller: 0, tenant: 0 };
  clients.forEach(c => { if (typeCounts[c.clientType] != null) typeCounts[c.clientType]++; });
  const ctx3 = document.getElementById('chart-clients');
  if (ctx3 && window.Chart) {
    charts.clients = new Chart(ctx3, {
      type: 'pie',
      data: {
        labels: ['Alıcı', 'Satıcı', 'Kiracı'],
        datasets: [{ data: Object.values(typeCounts), backgroundColor: ['#3b82f6','#22c55e','#f59e0b'], borderWidth: 0 }]
      },
      options: {
        plugins: { legend: { position: 'right', labels: { color: textColor } } },
        onClick: (_, elements) => {
          if (!elements.length) return;
          sessionStorage.setItem('nav_client_type', TYPE_KEYS[elements[0].index]);
          window.location.hash = '#/clients';
        },
        onHover: (e, elements) => { e.native.target.style.cursor = elements.length ? 'pointer' : 'default'; }
      }
    });
  }
}

function destroyCharts() {
  Object.values(charts).forEach(c => c.destroy());
  charts = {};
}

function getCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
