import { TR } from '../i18n.js';
import { getAll, saveAll, logActivity, getSettings } from '../storage.js';
import { uuid, formatDateTime, formatDate, showToast, confirm, isOverdue } from '../utils.js';
import { createModal, openModal, closeModal } from '../components/modals.js';
import { hasPermission, getCurrentUser } from '../auth.js';

let filterStatus = '';

export function renderReminders(container) {
  const pendingFilter = sessionStorage.getItem('dashboard_filter_status');
  if (pendingFilter !== null) { filterStatus = pendingFilter; sessionStorage.removeItem('dashboard_filter_status'); }

  const reminders = getAll('reminders');
  const now = new Date();

  // Auto-mark overdue
  let changed = false;
  const updated = reminders.map(r => {
    if (r.status === 'pending' && isOverdue(r.dueDate)) { changed = true; return { ...r, status: 'overdue' }; }
    return r;
  });
  if (changed) saveAll('reminders', updated);

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">${TR.reminder.title}</h1>
      ${hasPermission('reminders','add') ? `<button class="btn btn-primary" id="btn-add-reminder"><i data-lucide="plus"></i> ${TR.reminder.add}</button>` : ''}
    </div>
    <div class="toolbar">
      <div class="filter-tabs">
        ${[['', TR.reminder.filterAll], ['pending', TR.reminder.filterPending], ['overdue', TR.reminder.filterOverdue], ['completed', TR.reminder.filterCompleted]].map(([val, label]) =>
          `<button class="filter-tab ${filterStatus===val?'active':''}" data-status="${val}">${label}</button>`
        ).join('')}
      </div>
    </div>
    <div id="reminders-list"></div>
  `;

  if (window.lucide) window.lucide.createIcons();
  document.getElementById('btn-add-reminder')?.addEventListener('click', () => openReminderForm(null));
  document.querySelectorAll('.filter-tab').forEach(btn => {
    btn.addEventListener('click', () => { filterStatus = btn.dataset.status; renderReminders(container); });
  });
  renderList();
}

function renderList() {
  let data = getAll('reminders');
  if (filterStatus) data = data.filter(r => r.status === filterStatus);
  data.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  const list = document.getElementById('reminders-list');
  if (!list) return;

  const clients = getAll('clients');
  const properties = getAll('properties');

  if (!data.length) {
    list.innerHTML = `<div class="empty-state"><i data-lucide="bell-off"></i><p>${TR.reminder.noData}</p></div>`;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  list.innerHTML = `<div class="reminders-grid">
    ${data.map(r => {
      const client = r.clientId ? clients.find(c=>c.id===r.clientId) : null;
      const property = r.propertyId ? properties.find(p=>p.id===r.propertyId) : null;
      const overdue = r.status === 'overdue';
      const completed = r.status === 'completed';
      return `
        <div class="reminder-card card ${overdue?'reminder-overdue':''} ${completed?'reminder-done':''}">
          <div class="reminder-card-header">
            <div class="reminder-type-icon"><i data-lucide="${typeIcon(r.type)}"></i></div>
            <div class="reminder-info">
              <div class="reminder-title">${r.title}</div>
              <div class="reminder-datetime text-muted">${formatDateTime(r.dueDate)}</div>
            </div>
            ${statusBadge(r.status)}
          </div>
          <div class="reminder-meta-block">
            ${client ? `<div class="reminder-meta-row"><i data-lucide="user"></i><span class="meta-label">Müşteri:</span><span>${client.firstName} ${client.lastName}</span></div>` : ''}
            ${property ? `<div class="reminder-meta-row"><i data-lucide="building-2"></i><span class="meta-label">İlan:</span><span>${property.title}</span></div>` : ''}
            <div class="reminder-meta-row"><i data-lucide="file-text"></i><span class="meta-label">Notlar:</span><span>${r.notes || '<em class="notes-empty">—</em>'}</span></div>
          </div>
          <div class="reminder-actions">
            ${r.status !== 'completed' && hasPermission('reminders','edit') ? `<button class="btn btn-sm btn-success btn-complete" data-id="${r.id}"><i data-lucide="check"></i> ${TR.reminder.markComplete}</button>` : ''}
            <button class="btn btn-sm btn-ghost btn-detail-rem" data-id="${r.id}" title="Detay / Not Geçmişi"><i data-lucide="message-square"></i></button>
            ${hasPermission('reminders','edit') ? `<button class="btn btn-sm btn-ghost btn-edit-rem" data-id="${r.id}"><i data-lucide="pencil"></i></button>` : ''}
            ${hasPermission('reminders','delete') ? `<button class="btn btn-sm btn-ghost btn-delete-rem" data-id="${r.id}"><i data-lucide="trash-2"></i></button>` : ''}
          </div>
        </div>
      `;
    }).join('')}
  </div>`;

  if (window.lucide) window.lucide.createIcons();

  document.querySelectorAll('.btn-complete').forEach(btn => btn.addEventListener('click', () => markComplete(btn.dataset.id)));
  document.querySelectorAll('.btn-detail-rem').forEach(btn => btn.addEventListener('click', () => openReminderDetail(btn.dataset.id)));
  document.querySelectorAll('.btn-edit-rem').forEach(btn => btn.addEventListener('click', () => {
    const r = getAll('reminders').find(x=>x.id===btn.dataset.id);
    if (r) openReminderForm(r);
  }));
  document.querySelectorAll('.btn-delete-rem').forEach(btn => btn.addEventListener('click', () => deleteReminder(btn.dataset.id)));
}

function typeIcon(type) {
  return { call:'phone', meeting:'calendar', follow_up:'repeat', viewing:'map-pin', other:'bell' }[type] || 'bell';
}

function statusBadge(s) {
  const map = { pending: 'warning', completed: 'success', overdue: 'danger' };
  const labels = { pending: TR.reminder.pending, completed: TR.reminder.completed, overdue: TR.reminder.overdue };
  return `<span class="badge badge-${map[s]||'secondary'}">${labels[s]||s}</span>`;
}

function markComplete(id) {
  const reminders = getAll('reminders').map(r => r.id === id ? { ...r, status: 'completed' } : r);
  saveAll('reminders', reminders);
  showToast('Tamamlandı olarak işaretlendi');
  document.getElementById('reminders-list') && renderList();
}

function deleteReminder(id) {
  if (!confirm(TR.reminder.deleteConfirm)) return;
  saveAll('reminders', getAll('reminders').filter(r => r.id !== id));
  showToast('Hatırlatıcı silindi');
  renderList();
}

export function openReminderForm(reminder) {
  const clients = getAll('clients');
  const properties = getAll('properties');
  const isEdit = !!reminder;

  const defaultDate = reminder?.dueDate
    ? new Date(reminder.dueDate).toISOString().slice(0,16)
    : new Date(Date.now() + 3600000).toISOString().slice(0,16);

  const body = `
    <form id="reminder-form">
      <div class="form-group"><label>${TR.reminder.reminderTitle} <span class="required">*</span></label>
        <input type="text" name="title" value="${reminder?.title||''}" class="input-field" required></div>
      <div class="form-row">
        <div class="form-group"><label>${TR.reminder.type}</label>
          <select name="type" class="select-input">
            ${[['call',TR.reminder.call],['meeting',TR.reminder.meeting],['follow_up',TR.reminder.followUp],['viewing',TR.reminder.viewing],['other',TR.reminder.other]]
              .map(([v,l]) => `<option value="${v}" ${reminder?.type===v?'selected':''}>${l}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>${TR.reminder.dueDate}</label>
          <input type="datetime-local" name="dueDate" value="${defaultDate}" class="input-field" required></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>${TR.reminder.linkedClient}</label>
          <select name="clientId" class="select-input">
            <option value="">— Yok —</option>
            ${clients.map(c => `<option value="${c.id}" ${reminder?.clientId===c.id?'selected':''}>${c.firstName} ${c.lastName}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>${TR.reminder.linkedProperty}</label>
          <select name="propertyId" class="select-input">
            <option value="">— Yok —</option>
            ${properties.map(p => `<option value="${p.id}" ${reminder?.propertyId===p.id?'selected':''}>${p.title}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group"><label>${TR.reminder.notes}</label>
        <textarea name="notes" rows="2" class="textarea-input">${reminder?.notes||''}</textarea></div>
    </form>
  `;

  const modal = createModal('reminder-modal', isEdit ? TR.reminder.edit : TR.reminder.add, body,
    `<button class="btn btn-primary" id="save-reminder"><i data-lucide="save"></i> ${TR.common.save}</button>`);
  openModal('reminder-modal');

  modal.querySelector('#save-reminder').addEventListener('click', () => {
    const form = modal.querySelector('#reminder-form');
    const fd = new FormData(form);
    const title = fd.get('title')?.trim();
    if (!title) { showToast('Başlık zorunlu', 'error'); return; }

    const data = {
      id: reminder?.id || uuid(),
      createdAt: reminder?.createdAt || new Date().toISOString(),
      title,
      type: fd.get('type'),
      dueDate: fd.get('dueDate'),
      clientId: fd.get('clientId') || null,
      propertyId: fd.get('propertyId') || null,
      notes: fd.get('notes'),
      status: reminder?.status || 'pending',
      notified: false,
    };

    let reminders = getAll('reminders');
    if (reminder?.id) reminders = reminders.map(r => r.id === reminder.id ? data : r);
    else reminders.unshift(data);
    saveAll('reminders', reminders);
    logActivity('reminder_add', `Hatırlatıcı: ${title}`, data.id);
    closeModal('reminder-modal');
    showToast(isEdit ? 'Hatırlatıcı güncellendi' : 'Hatırlatıcı eklendi');
    renderList();
  });
}

function noteLogItemHTML(n) {
  return `<div class="note-log-item">
    <div class="note-log-meta">
      <i data-lucide="user-circle"></i>
      <span class="note-log-author">${n.createdBy}</span>
      <span class="note-log-time">${formatDateTime(n.createdAt)}</span>
    </div>
    <div class="note-log-text">${n.text}</div>
  </div>`;
}

export function openReminderDetail(id) {
  const reminder = getAll('reminders').find(r => r.id === id);
  if (!reminder) return;

  const session = getCurrentUser();
  const settings = getSettings();
  const userName = session?.fullName || settings.userName || 'Danışman';
  const clients = getAll('clients');
  const properties = getAll('properties');
  const client = reminder.clientId ? clients.find(c => c.id === reminder.clientId) : null;
  const property = reminder.propertyId ? properties.find(p => p.id === reminder.propertyId) : null;
  const typeLabels = { call: TR.reminder.call, meeting: TR.reminder.meeting, follow_up: TR.reminder.followUp, viewing: TR.reminder.viewing, other: TR.reminder.other };
  const noteLog = reminder.noteLog || [];

  const body = `
    <div class="detail-reminder">
      <div class="reminder-detail-row"><span class="detail-label">Başlık</span><span class="detail-value">${reminder.title}</span></div>
      <div class="reminder-detail-row"><span class="detail-label">Tür</span><span class="detail-value">${typeLabels[reminder.type] || reminder.type}</span></div>
      <div class="reminder-detail-row"><span class="detail-label">Tarih/Saat</span><span class="detail-value">${formatDateTime(reminder.dueDate)}</span></div>
      <div class="reminder-detail-row"><span class="detail-label">Durum</span><span class="detail-value">${statusBadge(reminder.status)}</span></div>
      ${client ? `<div class="reminder-detail-row"><span class="detail-label">Müşteri</span><span class="detail-value">${client.firstName} ${client.lastName}</span></div>` : ''}
      ${property ? `<div class="reminder-detail-row"><span class="detail-label">İlan</span><span class="detail-value">${property.title}</span></div>` : ''}
      ${reminder.notes ? `<div class="reminder-detail-row"><span class="detail-label">Not</span><span class="detail-value">${reminder.notes}</span></div>` : ''}
    </div>

    <div class="note-log-section">
      <div class="note-log-header"><i data-lucide="message-square"></i> Not Geçmişi</div>
      <div id="note-log-list" class="note-log-list">
        ${noteLog.length ? noteLog.map(n => noteLogItemHTML(n)).join('') : '<p class="text-muted note-log-empty">Henüz ek not eklenmemiş.</p>'}
      </div>
    </div>

    <div class="add-note-section">
      <div class="add-note-header"><i data-lucide="plus-circle"></i> Yeni Not Ekle</div>
      <textarea id="new-note-text" rows="3" class="textarea-input" placeholder="Notunuzu buraya yazın..."></textarea>
    </div>
  `;

  const footer = `
    <button class="btn btn-primary" id="btn-save-note"><i data-lucide="save"></i> Notu Kaydet</button>
    ${reminder.status !== 'completed' ? `<button class="btn btn-success" id="detail-complete"><i data-lucide="check"></i> Tamamlandı</button>` : ''}
  `;

  const modal = createModal('reminder-detail-modal', reminder.title, body, footer);
  openModal('reminder-detail-modal');
  if (window.lucide) window.lucide.createIcons();

  modal.querySelector('#btn-save-note').addEventListener('click', () => {
    const text = modal.querySelector('#new-note-text').value.trim();
    if (!text) { showToast('Lütfen bir not girin', 'error'); return; }

    const entry = { id: uuid(), text, createdAt: new Date().toISOString(), createdBy: userName };
    const reminders = getAll('reminders');
    const idx = reminders.findIndex(r => r.id === id);
    if (idx >= 0) {
      if (!reminders[idx].noteLog) reminders[idx].noteLog = [];
      reminders[idx].noteLog.push(entry);
      saveAll('reminders', reminders);
    }

    modal.querySelector('#new-note-text').value = '';
    const logList = modal.querySelector('#note-log-list');
    const emptyMsg = logList.querySelector('.note-log-empty');
    if (emptyMsg) emptyMsg.remove();
    logList.insertAdjacentHTML('beforeend', noteLogItemHTML(entry));
    if (window.lucide) window.lucide.createIcons();
    logList.scrollTop = logList.scrollHeight;
    showToast('Not eklendi');
  });

  modal.querySelector('#detail-complete')?.addEventListener('click', () => {
    const all = getAll('reminders').map(r => r.id === id ? { ...r, status: 'completed' } : r);
    saveAll('reminders', all);
    closeModal('reminder-detail-modal');
    showToast('Tamamlandı olarak işaretlendi');
    if (document.getElementById('reminders-list')) renderList();
  });
}

// Browser notification checker (called from app.js)
export function checkReminders() {
  if (!('Notification' in window)) return;
  const reminders = getAll('reminders');
  const now = new Date();
  let changed = false;

  reminders.forEach(r => {
    if (r.status === 'pending' && !r.notified && new Date(r.dueDate) <= now) {
      if (Notification.permission === 'granted') {
        new Notification('Hatırlatıcı: ' + r.title, { body: formatDateTime(r.dueDate), icon: '/favicon.ico' });
      }
      r.notified = true;
      r.status = 'overdue';
      changed = true;
    }
  });

  if (changed) saveAll('reminders', reminders);
}
