import { TR } from '../i18n.js';

const ROUTES = [
  { hash: '#/', icon: 'layout-dashboard', label: TR.nav.dashboard },
  { hash: '#/properties', icon: 'building-2', label: TR.nav.properties },
  { hash: '#/clients', icon: 'users', label: TR.nav.clients },
  { hash: '#/matching', icon: 'git-merge', label: TR.nav.matching },
  { hash: '#/reminders', icon: 'bell', label: TR.nav.reminders },
  { hash: '#/settings', icon: 'settings', label: TR.nav.settings },
];

export function renderSidebar() {
  const aside = document.getElementById('sidebar');
  if (!aside) return;

  const current = location.hash || '#/';

  aside.innerHTML = `
    <a href="#/" class="sidebar-brand">
      <i data-lucide="home" class="brand-icon"></i>
      <span class="brand-text">${TR.appName}</span>
    </a>
    <nav class="sidebar-nav">
      ${ROUTES.map(r => `
        <a href="${r.hash}" class="nav-item ${current.startsWith(r.hash === '#/' ? '#/' : r.hash) && (r.hash === '#/' ? current === '#/' || current === '#' : true) ? 'active' : ''}" data-hash="${r.hash}">
          <i data-lucide="${r.icon}"></i>
          <span>${r.label}</span>
        </a>
      `).join('')}
    </nav>
    <div class="sidebar-footer">
      <button id="theme-toggle" class="nav-item" title="Tema Değiştir">
        <i data-lucide="sun-moon"></i>
        <span>Tema</span>
      </button>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();
}

export function updateSidebarActive() {
  const current = location.hash || '#/';
  document.querySelectorAll('.nav-item[data-hash]').forEach(a => {
    const h = a.getAttribute('data-hash');
    const isActive = h === '#/'
      ? (current === '#/' || current === '#' || current === '')
      : current.startsWith(h);
    a.classList.toggle('active', isActive);
  });
}
