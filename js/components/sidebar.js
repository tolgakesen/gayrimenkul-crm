import { TR } from '../i18n.js';
import { getCurrentUser, isAdmin } from '../auth.js';

const ROUTES = [
  { hash: '#/', icon: 'layout-dashboard', label: TR.nav.dashboard },
  { hash: '#/properties', icon: 'building-2', label: TR.nav.properties },
  { hash: '#/clients', icon: 'users', label: TR.nav.clients },
  { hash: '#/matching', icon: 'git-merge', label: TR.nav.matching },
  { hash: '#/reminders', icon: 'bell', label: TR.nav.reminders },
  { hash: '#/settings', icon: 'settings', label: TR.nav.settings },
  { hash: '#/users',        icon: 'user-cog',      label: 'Kullanıcılar',  adminOnly: true },
  { hash: '#/holidays',    icon: 'calendar-heart', label: 'Özel Günler',   adminOnly: true },
  { hash: '#/world-clocks',icon: 'clock-4',        label: 'Dünya Saati',   adminOnly: true },
];

export function renderSidebar() {
  const aside = document.getElementById('sidebar');
  if (!aside) return;

  const current = location.hash || '#/';
  const session = getCurrentUser();
  const admin = isAdmin();

  const routes = ROUTES.filter(r => !r.adminOnly || admin);

  aside.innerHTML = `
    <a href="#/" class="sidebar-brand">
      <i data-lucide="home" class="brand-icon"></i>
      <span class="brand-text">${TR.appName}</span>
    </a>
    <nav class="sidebar-nav">
      ${routes.map(r => `
        <a href="${r.hash}" class="nav-item ${isActive(r.hash, current) ? 'active' : ''}" data-hash="${r.hash}">
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
      ${session ? `
      <div class="sidebar-user">
        <div class="sidebar-user-avatar">${(session.fullName||'?').charAt(0).toUpperCase()}</div>
        <div class="sidebar-user-info">
          <div class="sidebar-user-name">${session.fullName}</div>
          <div class="sidebar-user-role">${session.role === 'admin' ? 'Yönetici' : 'Danışman'}</div>
        </div>
        <button id="btn-logout" class="btn-icon sidebar-logout" title="Çıkış Yap">
          <i data-lucide="log-out"></i>
        </button>
      </div>` : ''}
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();
}

function isActive(hash, current) {
  if (hash === '#/') return current === '#/' || current === '#' || current === '';
  return current.startsWith(hash);
}

export function updateSidebarActive() {
  const current = location.hash || '#/';
  document.querySelectorAll('.nav-item[data-hash]').forEach(a => {
    a.classList.toggle('active', isActive(a.getAttribute('data-hash'), current));
  });
}
