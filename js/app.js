import { renderSidebar, updateSidebarActive } from './components/sidebar.js';
import { getSettings, saveSettings, getAll } from './storage.js';
import { checkReminders } from './pages/reminders.js';
import { isLoggedIn, isGuest, isAdmin, logout, startGuestSession, cleanupNonAdminUsers } from './auth.js';

async function loadPage(hash) {
  if (!isLoggedIn()) { startGuestSession(); }

  const main = document.getElementById('main-content');
  if (!main) return;
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
      const id = hash.split('/')[2];
      const { renderReminders, openReminderForm } = await import('./pages/reminders.js');
      renderReminders(main);
      if (id) {
        const reminder = getAll('reminders').find(r => r.id === id);
        if (reminder) openReminderForm(reminder);
      }
    } else if (hash.startsWith('#/pipeline')) {
      const { renderPipeline } = await import('./pages/pipeline.js');
      renderPipeline(main);
    } else if (hash.startsWith('#/calendar')) {
      const { renderCalendar } = await import('./pages/calendar.js');
      renderCalendar(main);
    } else if (hash.startsWith('#/map')) {
      const { renderMapView } = await import('./pages/map-view.js');
      renderMapView(main);
    } else if (hash.startsWith('#/reports')) {
      const { renderReports } = await import('./pages/reports.js');
      renderReports(main);
    } else if (hash.startsWith('#/settings')) {
      const { renderSettings } = await import('./pages/settings.js');
      renderSettings(main);
    } else if (hash.startsWith('#/users')) {
      const { renderUsers } = await import('./pages/users.js');
      renderUsers(main);
    } else if (hash.startsWith('#/holidays')) {
      const { renderHolidays } = await import('./pages/holidays.js');
      renderHolidays(main);
    } else if (hash.startsWith('#/world-clocks')) {
      const { renderWorldClocks } = await import('./pages/world-clocks.js');
      renderWorldClocks(main);
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
  if (badge) { badge.textContent = pending; badge.style.display = pending ? '' : 'none'; }
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

function initTheme() {
  applyTheme(getSettings().theme || 'dark');
}

function initNotifications() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

async function showAdminLoginModal() {
  const { createModal, openModal, closeModal } = await import('./components/modals.js');
  const { renderLogin } = await import('./pages/login.js');

  const modal = createModal('admin-login-modal', 'Yönetici Girişi',
    '<div id="admin-login-content"></div>');
  openModal('admin-login-modal');

  renderLogin(document.getElementById('admin-login-content'), () => {
    closeModal('admin-login-modal');
    renderSidebar();
    attachSidebarEvents();
    updateAdminBtn();
    loadPage(location.hash);
  });
}

function updateAdminBtn() {
  const btn = document.getElementById('btn-admin-login');
  if (!btn) return;
  btn.style.display = isGuest() ? '' : 'none';
}

function attachSidebarEvents() {
  document.getElementById('sidebar').addEventListener('click', e => {
    const logoutBtn = e.target.closest('#btn-logout');
    if (logoutBtn) {
      logout();
      startGuestSession();
      renderSidebar();
      attachSidebarEvents();
      updateAdminBtn();
      loadPage(location.hash);
      return;
    }

    const overlay = document.getElementById('sidebar-overlay');
    const sidebar = document.getElementById('sidebar');
    if (sidebar.classList.contains('open')) {
      const isInsideSidebar = sidebar.contains(e.target);
      if (!isInsideSidebar) { sidebar.classList.remove('open'); overlay?.classList.remove('open'); }
    }
  });
}

function initApp() {
  initTheme();
  initNotifications();

  document.addEventListener('click', e => {
    const adminLoginBtn = e.target.closest('#btn-admin-login');
    if (adminLoginBtn) { showAdminLoginModal(); return; }

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

  window.addEventListener('hashchange', () => loadPage(location.hash));

  cleanupNonAdminUsers();

  if (!isLoggedIn()) startGuestSession();

  document.getElementById('app-shell').style.display = '';
  document.getElementById('login-screen').style.display = 'none';
  renderSidebar();
  attachSidebarEvents();
  updateAdminBtn();
  loadPage(location.hash);
  setInterval(checkReminders, 60000);
  setInterval(updateNotificationBadge, 30000);
}

initApp();
