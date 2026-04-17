import { getUsers, createUser, updateUser, deleteUser, changePassword, defaultPermissions, PERMISSION_LABELS, isAdmin } from '../auth.js';
import { createModal, openModal, closeModal } from '../components/modals.js';
import { showToast, confirm } from '../utils.js';
import { formatDate } from '../utils.js';

export function renderUsers(container) {
  if (!isAdmin()) {
    container.innerHTML = `<div class="error-state"><i data-lucide="shield-off"></i><p>Bu sayfaya erişim yetkiniz yok.</p></div>`;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  const users = getUsers();

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Kullanıcı Yönetimi</h1>
      <button class="btn btn-primary" id="btn-add-user"><i data-lucide="user-plus"></i> Yeni Kullanıcı</button>
    </div>
    <div class="card users-card">
      <div class="users-table-wrap">
        <table class="users-table">
          <thead>
            <tr>
              <th>Ad Soyad</th>
              <th>Kullanıcı Adı</th>
              <th>Rol</th>
              <th>Durum</th>
              <th>Oluşturulma</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${users.map(u => `
              <tr class="${u.isActive === false ? 'user-row-inactive' : ''}">
                <td><strong>${u.fullName}</strong></td>
                <td><code class="user-code">${u.username}</code></td>
                <td>${u.role === 'admin'
                  ? '<span class="badge badge-danger">Yönetici</span>'
                  : '<span class="badge badge-info">Danışman</span>'}</td>
                <td>${u.isActive !== false
                  ? '<span class="badge badge-success">Aktif</span>'
                  : '<span class="badge badge-secondary">Pasif</span>'}</td>
                <td class="text-muted">${formatDate(u.createdAt)}</td>
                <td class="user-actions">
                  <button class="btn btn-sm btn-ghost btn-edit-user" data-id="${u.id}" title="Düzenle"><i data-lucide="pencil"></i></button>
                  <button class="btn btn-sm btn-ghost btn-pwd-user" data-id="${u.id}" title="Şifre Değiştir"><i data-lucide="key"></i></button>
                  ${u.role !== 'admin' ? `<button class="btn btn-sm btn-ghost btn-delete-user" data-id="${u.id}" title="Sil"><i data-lucide="trash-2"></i></button>` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  container.querySelector('#btn-add-user').addEventListener('click', () => openUserForm(null, () => renderUsers(container)));

  container.querySelectorAll('.btn-edit-user').forEach(btn => {
    btn.addEventListener('click', () => {
      const user = getUsers().find(u => u.id === btn.dataset.id);
      if (user) openUserForm(user, () => renderUsers(container));
    });
  });

  container.querySelectorAll('.btn-pwd-user').forEach(btn => {
    btn.addEventListener('click', () => openPasswordForm(btn.dataset.id));
  });

  container.querySelectorAll('.btn-delete-user').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) return;
      deleteUser(btn.dataset.id);
      showToast('Kullanıcı silindi');
      renderUsers(container);
    });
  });
}

function permissionGrid(permissions) {
  return Object.entries(PERMISSION_LABELS).map(([mod, { label, actions }]) => `
    <div class="perm-module">
      <div class="perm-module-label">${label}</div>
      <div class="perm-actions">
        ${Object.entries(actions).map(([act, actLabel]) => `
          <label class="perm-check">
            <input type="checkbox" name="perm_${mod}_${act}" ${permissions?.[mod]?.[act] ? 'checked' : ''}>
            <span>${actLabel}</span>
          </label>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function collectPermissions(form) {
  const permissions = {};
  Object.entries(PERMISSION_LABELS).forEach(([mod, { actions }]) => {
    permissions[mod] = {};
    Object.keys(actions).forEach(act => {
      permissions[mod][act] = !!(form.querySelector(`[name="perm_${mod}_${act}"]`)?.checked);
    });
  });
  return permissions;
}

function openUserForm(user, onSave) {
  const isEdit = !!user;
  const isEditingAdmin = user?.role === 'admin';
  const perms = user?.permissions || defaultPermissions();

  const body = `
    <form id="user-form">
      <div class="form-row">
        <div class="form-group">
          <label>Ad Soyad <span class="required">*</span></label>
          <input type="text" name="fullName" value="${user?.fullName || ''}" class="input-field" required>
        </div>
        <div class="form-group">
          <label>Kullanıcı Adı <span class="required">*</span></label>
          <input type="text" name="username" value="${user?.username || ''}" class="input-field" ${isEdit ? 'readonly style="opacity:.7"' : ''} required>
        </div>
      </div>
      ${!isEdit ? `
      <div class="form-group">
        <label>Şifre <span class="required">*</span> <span class="form-hint">(min. 6 karakter)</span></label>
        <input type="password" name="password" class="input-field" minlength="6" required>
      </div>` : ''}
      <div class="form-row">
        <div class="form-group">
          <label>Rol</label>
          <select name="role" class="select-input" ${isEditingAdmin ? 'disabled' : ''}>
            <option value="consultant" ${user?.role !== 'admin' ? 'selected' : ''}>Danışman</option>
            <option value="admin" ${user?.role === 'admin' ? 'selected' : ''}>Yönetici</option>
          </select>
        </div>
        ${isEdit ? `
        <div class="form-group">
          <label>Durum</label>
          <select name="isActive" class="select-input" ${isEditingAdmin ? 'disabled' : ''}>
            <option value="true" ${user?.isActive !== false ? 'selected' : ''}>Aktif</option>
            <option value="false" ${user?.isActive === false ? 'selected' : ''}>Pasif</option>
          </select>
        </div>` : ''}
      </div>
      ${!isEditingAdmin ? `
      <div class="perm-section">
        <div class="perm-section-title"><i data-lucide="shield"></i> Yetki Ayarları</div>
        <div class="perm-grid">${permissionGrid(perms)}</div>
      </div>` : `<p class="text-muted" style="margin-top:.75rem">Yönetici hesabı tüm yetkilere sahiptir.</p>`}
    </form>
  `;

  const modal = createModal('user-modal', isEdit ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı', body,
    `<button class="btn btn-primary" id="save-user"><i data-lucide="save"></i> Kaydet</button>`);
  openModal('user-modal');
  if (window.lucide) window.lucide.createIcons();

  modal.querySelector('#save-user').addEventListener('click', async () => {
    const form = modal.querySelector('#user-form');
    const fd = new FormData(form);
    const fullName = fd.get('fullName')?.trim();
    const username = fd.get('username')?.trim();
    if (!fullName || !username) { showToast('Ad soyad ve kullanıcı adı zorunlu', 'error'); return; }

    const role = isEditingAdmin ? 'admin' : fd.get('role');
    const isActive = isEditingAdmin ? true : fd.get('isActive') !== 'false';
    const permissions = isEditingAdmin ? {} : collectPermissions(form);

    if (isEdit) {
      const result = await updateUser(user.id, { fullName, role, permissions, isActive });
      if (result.success) { closeModal('user-modal'); showToast('Kullanıcı güncellendi'); onSave(); }
      else showToast(result.error, 'error');
    } else {
      const password = fd.get('password');
      if (!password || password.length < 6) { showToast('Şifre en az 6 karakter olmalı', 'error'); return; }
      const result = await createUser({ username, fullName, password, role, permissions });
      if (result.success) { closeModal('user-modal'); showToast('Kullanıcı oluşturuldu'); onSave(); }
      else showToast(result.error, 'error');
    }
  });
}

function openPasswordForm(userId) {
  const body = `
    <form id="pwd-form">
      <div class="form-group">
        <label>Yeni Şifre <span class="required">*</span></label>
        <input type="password" name="password" class="input-field" minlength="6" placeholder="••••••••" required>
      </div>
      <div class="form-group">
        <label>Şifre Tekrar <span class="required">*</span></label>
        <input type="password" name="password2" class="input-field" placeholder="••••••••" required>
      </div>
    </form>
  `;
  const modal = createModal('pwd-modal', 'Şifre Değiştir', body,
    `<button class="btn btn-primary" id="save-pwd"><i data-lucide="key"></i> Güncelle</button>`);
  openModal('pwd-modal');
  if (window.lucide) window.lucide.createIcons();

  modal.querySelector('#save-pwd').addEventListener('click', async () => {
    const fd = new FormData(modal.querySelector('#pwd-form'));
    const password = fd.get('password');
    if (password !== fd.get('password2')) { showToast('Şifreler eşleşmiyor', 'error'); return; }
    if (password.length < 6) { showToast('Şifre en az 6 karakter olmalı', 'error'); return; }
    await changePassword(userId, password);
    closeModal('pwd-modal');
    showToast('Şifre güncellendi');
  });
}
