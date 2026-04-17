import { hasAnyUser, login, setupAdmin } from '../auth.js';

export function renderLogin(container, onSuccess) {
  hasAnyUser() ? renderLoginForm(container, onSuccess) : renderSetup(container, onSuccess);
}

function renderLoginForm(container, onSuccess) {
  container.innerHTML = `
    <div class="login-card">
      <div class="login-logo">
        <i data-lucide="home" class="login-logo-icon"></i>
        <h1 class="login-app-title">GayriMenkul CRM</h1>
        <p class="login-subtitle">Hesabınıza giriş yapın</p>
      </div>
      <form id="login-form" class="login-form" autocomplete="on">
        <div class="form-group">
          <label>Kullanıcı Adı</label>
          <div class="input-icon-wrap">
            <i data-lucide="user" class="input-icon"></i>
            <input type="text" name="username" class="input-field input-with-icon" placeholder="Kullanıcı adınız" autocomplete="username" required>
          </div>
        </div>
        <div class="form-group">
          <label>Şifre</label>
          <div class="input-icon-wrap">
            <i data-lucide="lock" class="input-icon"></i>
            <input type="password" name="password" class="input-field input-with-icon" placeholder="••••••••" autocomplete="current-password" required>
          </div>
        </div>
        <div id="login-error" class="alert alert-danger" style="display:none"></div>
        <button type="submit" class="btn btn-primary btn-block" id="btn-login">
          <i data-lucide="log-in"></i> Giriş Yap
        </button>
      </form>
    </div>
  `;
  if (window.lucide) window.lucide.createIcons();

  container.querySelector('#login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = container.querySelector('#btn-login');
    const errEl = container.querySelector('#login-error');
    const fd = new FormData(e.target);
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader"></i> Giriş yapılıyor...';
    if (window.lucide) window.lucide.createIcons();
    errEl.style.display = 'none';

    const result = await login(fd.get('username'), fd.get('password'));
    if (result.success) {
      onSuccess();
    } else {
      errEl.textContent = result.error;
      errEl.style.display = '';
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="log-in"></i> Giriş Yap';
      if (window.lucide) window.lucide.createIcons();
    }
  });
}

function renderSetup(container, onSuccess) {
  container.innerHTML = `
    <div class="login-card">
      <div class="login-logo">
        <i data-lucide="home" class="login-logo-icon"></i>
        <h1 class="login-app-title">GayriMenkul CRM</h1>
        <p class="login-subtitle">İlk kurulum — Yönetici hesabı oluşturun</p>
      </div>
      <form id="setup-form" class="login-form" autocomplete="off">
        <div class="form-group">
          <label>Ad Soyad <span class="required">*</span></label>
          <input type="text" name="fullName" class="input-field" placeholder="Adınız Soyadınız" required>
        </div>
        <div class="form-group">
          <label>Kullanıcı Adı <span class="required">*</span></label>
          <input type="text" name="username" class="input-field" placeholder="admin" required>
        </div>
        <div class="form-group">
          <label>Şifre <span class="required">*</span> <span class="form-hint">(min. 6 karakter)</span></label>
          <input type="password" name="password" class="input-field" placeholder="••••••••" minlength="6" required>
        </div>
        <div class="form-group">
          <label>Şifre Tekrar <span class="required">*</span></label>
          <input type="password" name="password2" class="input-field" placeholder="••••••••" required>
        </div>
        <div id="setup-error" class="alert alert-danger" style="display:none"></div>
        <button type="submit" class="btn btn-primary btn-block" id="btn-setup">
          <i data-lucide="check-circle"></i> Yönetici Hesabı Oluştur
        </button>
      </form>
    </div>
  `;
  if (window.lucide) window.lucide.createIcons();

  container.querySelector('#setup-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = container.querySelector('#btn-setup');
    const errEl = container.querySelector('#setup-error');
    const fd = new FormData(e.target);
    const password = fd.get('password');
    const password2 = fd.get('password2');
    errEl.style.display = 'none';

    if (password !== password2) { errEl.textContent = 'Şifreler eşleşmiyor'; errEl.style.display = ''; return; }
    if (password.length < 6) { errEl.textContent = 'Şifre en az 6 karakter olmalı'; errEl.style.display = ''; return; }

    btn.disabled = true;
    btn.textContent = 'Oluşturuluyor...';

    const username = fd.get('username').trim();
    const fullName = fd.get('fullName').trim();
    await setupAdmin(username, fullName, password);
    const result = await login(username, password);
    if (result.success) onSuccess();
  });
}
