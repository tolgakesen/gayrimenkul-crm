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
            const in1h = new Date(now.getTime() + 60 * 60 * 1000);
            const urgent = !overdue && new Date(r.dueDate) <= in1h;
            return `<div class="activity-item activity-item-link${urgent ? ' reminder-alert-blink' : ''}" data-reminder-id="${r.id}">
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

  // Status pie
  const statusCounts = { active: 0, sold: 0, rented: 0, withdrawn: 0 };
  properties.forEach(p => { if (statusCounts[p.status] != null) statusCounts[p.status]++; });
  const statusLabels = ['Aktif', 'Satıldı', 'Kiralandı', 'Çekildi'];
  const ctx1 = document.getElementById('chart-status');
  if (ctx1 && window.Chart) {
    charts.status = new Chart(ctx1, {
      type: 'doughnut',
      data: {
        labels: statusLabels,
        datasets: [{ data: Object.values(statusCounts), backgroundColor: ['#3b82f6','#22c55e','#f59e0b','#6b7280'], borderWidth: 0 }]
      },
      options: { plugins: { legend: { position: 'right', labels: { color: getCssVar('--color-text') } } }, cutout: '60%' }
    });
  }

  // Price by district bar
  const districtMap = {};
  properties.filter(p => p.district && p.squareMeters && p.price).forEach(p => {
    if (!districtMap[p.district]) districtMap[p.district] = [];
    districtMap[p.district].push(p.price / p.squareMeters);
  });
  const districtLabels = Object.keys(districtMap).slice(0, 8);
  const districtAvg = districtLabels.map(d => Math.round(districtMap[d].reduce((a, b) => a + b, 0) / districtMap[d].length));
  const ctx2 = document.getElementById('chart-price');
  if (ctx2 && window.Chart) {
    charts.price = new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: districtLabels.length ? districtLabels : ['Veri Yok'],
        datasets: [{ label: '₺/m²', data: districtAvg.length ? districtAvg : [0], backgroundColor: '#3b82f6', borderRadius: 6 }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: getCssVar('--color-text-muted') }, grid: { color: getCssVar('--color-border') } },
          y: { ticks: { color: getCssVar('--color-text-muted') }, grid: { color: getCssVar('--color-border') } }
        }
      }
    });
  }

  // Client stats doughnut
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
      options: { plugins: { legend: { position: 'right', labels: { color: getCssVar('--color-text') } } } }
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
