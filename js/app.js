import { renderSidebar, updateSidebarActive } from './components/sidebar.js';
import { getSettings, saveSettings, getAll } from './storage.js';
import { checkReminders } from './pages/reminders.js';

async function loadPage(hash) {
  const main = document.getElementById('main-content');
  if (!main) return;

  // Show loading
  main.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';

  try {
    if (hash === '' || hash === '#' || hash === '#/') {
      const { renderDashboard } = await import('./pages/dashboard.js');
      renderDashboard(main);
    } else if (hash.startsWith('#/properties')) {
      const id = hash.split('/')[2];
      const { renderProperties, openPropertyDetail } = await import('./pages/properties.js');
      renderProperties(main);
      if (id) openPropertyDetail(id);
    } else if (hash.startsWith('#/clients')) {
      const id = hash.split('/')[2];
      const { renderClients, openClientDetail } = await import('./pages/clients.js');
      renderClients(main);
      if (id) openClientDetail(id);
    } else if (hash.startsWith('#/matching')) {
      const { renderMatching } = await import('./pages/matching-page.js');
      renderMatching(main);
    } else if (hash.startsWith('#/reminders')) {
      const { renderReminders } = await import('./pages/reminders.js');
      renderReminders(main);
    } else if (hash.startsWith('#/settings')) {
      const { renderSettings } = await import('./pages/settings.js');
      renderSettings(main);
    } else {
      const { renderDashboard } = await import('./pages/dashboard.js');
      renderDashboard(main);
    }
  } catch (err) {
    console.error(err);
    main.innerHTML = `<div class="error-state"><p>Sayfa yüklenemedi: ${err.message}</p></div>`;
  }

  updateSidebarActive();
  updateNotificationBadge();
}

function updateNotificationBadge() {
  const pending = getAll('reminders').filter(r => r.status === 'pending' || r.status === 'overdue').length;
  const badge = document.getElementById('notif-badge');
  if (badge) {
    badge.textContent = pending;
    badge.style.display = pending ? '' : 'none';
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

function initTheme() {
  const settings = getSettings();
  applyTheme(settings.theme || 'dark');
}

function initNotifications() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function initSidebar() {
  renderSidebar();

  document.addEventListener('click', e => {
    const toggle = e.target.closest('#theme-toggle');
    if (toggle) {
      const settings = getSettings();
      const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
      settings.theme = newTheme;
      saveSettings(settings);
      applyTheme(newTheme);
    }

    const menuToggle = e.target.closest('#sidebar-toggle');
    if (menuToggle) {
      document.getElementById('sidebar').classList.toggle('open');
      document.getElementById('sidebar-overlay').classList.toggle('open');
    }

    const overlay = e.target.closest('#sidebar-overlay');
    if (overlay) {
      document.getElementById('sidebar').classList.remove('open');
      overlay.classList.remove('open');
    }
  });
}

function init() {
  initTheme();
  initSidebar();
  initNotifications();

  // Route on hash change
  window.addEventListener('hashchange', () => loadPage(location.hash));

  // Initial load
  loadPage(location.hash);

  // Check reminders every 60 seconds
  setInterval(checkReminders, 60000);

  // Badge update every 30 seconds
  setInterval(updateNotificationBadge, 30000);
}

init();
