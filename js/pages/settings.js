import { TR } from '../i18n.js';
import { getAll, saveAll, getSettings, saveSettings, exportBackup, importBackup, getStorageUsagePct } from '../storage.js';
import { downloadJSON, downloadCSV, showToast, confirm } from '../utils.js';
import { hasPermission } from '../auth.js';

export function renderSettings(container) {
  if (!hasPermission('settings', 'view')) {
    container.innerHTML = `<div class="error-state"><i data-lucide="shield-off"></i><p>Bu sayfaya erişim yetkiniz yok.</p></div>`;
    if (window.lucide) window.lucide.createIcons();
    return;
  }
  const settings = getSettings();
  const usagePct = getStorageUsagePct();
  const w = settings.defaultWeights || { budget: 40, location: 30, squareMeters: 15, roomCount: 10, features: 5 };

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">${TR.settings.title}</h1>
    </div>

    <div class="settings-grid">
      <div class="card">
        <div class="card-header"><h3>Danışman Bilgileri</h3></div>
        <div class="card-body">
          <div class="form-group">
            <label>Danışman Adı <span class="form-hint">(Not geçmişinde görünür)</span></label>
            <div style="display:flex;gap:.75rem;align-items:center">
              <input type="text" id="user-name-input" class="input-field" value="${settings.userName||''}" placeholder="Adınızı girin" style="max-width:300px">
              <button class="btn btn-primary" id="btn-save-username"><i data-lucide="save"></i> Kaydet</button>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h3>${TR.settings.storageUsage}</h3></div>
        <div class="card-body">
          <div class="storage-bar">
            <div class="storage-fill ${usagePct>80?'danger':usagePct>60?'warning':''}" style="width:${Math.min(usagePct,100)}%"></div>
          </div>
          <div class="storage-label">${usagePct}% kullanıldı (tahmini 5MB limit)</div>
          ${usagePct > 80 ? `<div class="alert alert-warning">${TR.settings.storageWarning}</div>` : ''}
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h3>${TR.settings.exportData}</h3></div>
        <div class="card-body settings-btns">
          <button class="btn btn-primary" id="btn-export-json"><i data-lucide="download"></i> ${TR.settings.exportJSON}</button>
          <button class="btn btn-outline" id="btn-export-csv"><i data-lucide="file-spreadsheet"></i> CSV Olarak İndir</button>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h3>${TR.settings.importData}</h3></div>
        <div class="card-body">
          <div class="alert alert-warning">${TR.settings.importWarning}</div>
          <input type="file" id="import-file" accept=".json" class="file-input">
          <button class="btn btn-primary" id="btn-import-json"><i data-lucide="upload"></i> ${TR.settings.importJSON}</button>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h3>${TR.settings.defaultWeights} <span class="form-hint">(Toplam 100 olmalı)</span></h3></div>
        <div class="card-body">
          <div id="default-weights">
            ${weightRow('budget','Bütçe', w.budget)}
            ${weightRow('location','Konum', w.location)}
            ${weightRow('squareMeters','m²', w.squareMeters)}
            ${weightRow('roomCount','Oda', w.roomCount)}
            ${weightRow('features','Özellikler', w.features)}
          </div>
          <div class="weight-total">Toplam: <strong id="default-weight-sum">${Object.values(w).reduce((a,b)=>a+b,0)}</strong>/100</div>
          <button class="btn btn-primary" id="btn-save-weights"><i data-lucide="save"></i> Kaydet</button>
        </div>
      </div>

      <div class="card card-danger">
        <div class="card-header"><h3>${TR.settings.dangerZone}</h3></div>
        <div class="card-body">
          <p class="text-muted">Tüm portföy, müşteri ve hatırlatıcı verilerini kalıcı olarak siler.</p>
          <button class="btn btn-danger" id="btn-clear-all"><i data-lucide="trash-2"></i> ${TR.settings.clearAllData}</button>
        </div>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  document.getElementById('btn-save-username').addEventListener('click', () => {
    const name = document.getElementById('user-name-input').value.trim();
    if (!name) { showToast('Lütfen bir ad girin', 'error'); return; }
    const s = getSettings();
    s.userName = name;
    saveSettings(s);
    showToast('Danışman adı kaydedildi');
  });

  document.querySelectorAll('.default-weight-slider').forEach(s => {
    s.addEventListener('input', () => {
      const key = s.dataset.key;
      document.querySelector(`#dwv_${key}`).textContent = s.value;
      let sum = 0;
      document.querySelectorAll('.default-weight-slider').forEach(x => sum += parseInt(x.value));
      const el = document.getElementById('default-weight-sum');
      el.textContent = sum; el.style.color = sum===100 ? 'var(--color-success)' : 'var(--color-danger)';
    });
  });

  document.getElementById('btn-export-json').addEventListener('click', () => {
    downloadJSON(exportBackup(), `gm-crm-backup-${new Date().toISOString().split('T')[0]}.json`);
    showToast(TR.settings.exportSuccess);
  });

  document.getElementById('btn-export-csv').addEventListener('click', () => {
    const props = getAll('properties').map(p => ({
      Başlık: p.title, Fiyat: p.price, 'm²': p.squareMeters, Oda: p.roomCount,
      İlçe: p.district, Mahalle: p.neighborhood, Tip: p.listingType, Durum: p.status,
      'Mal Sahibi': p.owner?.name, Telefon: p.owner?.phone
    }));
    downloadCSV(props, `portfoy-${new Date().toISOString().split('T')[0]}.csv`);
    const clients = getAll('clients').map(c => ({
      Ad: c.firstName, Soyad: c.lastName, Telefon: c.phone, 'E-posta': c.email,
      Tip: c.clientType, Öncelik: c.priorityLevel, 'Min Bütçe': c.budgetMin, 'Max Bütçe': c.budgetMax
    }));
    downloadCSV(clients, `musteriler-${new Date().toISOString().split('T')[0]}.csv`);
    showToast('CSV dosyaları indirildi');
  });

  document.getElementById('btn-import-json').addEventListener('click', () => {
    const file = document.getElementById('import-file').files[0];
    if (!file) { showToast('Lütfen bir dosya seçin', 'error'); return; }
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        importBackup(data);
        showToast(TR.settings.importSuccess);
        renderSettings(container);
      } catch { showToast(TR.settings.importError, 'error'); }
    };
    reader.readAsText(file);
  });

  document.getElementById('btn-save-weights').addEventListener('click', () => {
    const weights = {};
    document.querySelectorAll('.default-weight-slider').forEach(s => { weights[s.dataset.key] = parseInt(s.value); });
    const sum = Object.values(weights).reduce((a,b)=>a+b,0);
    if (sum !== 100) { showToast('Ağırlıklar toplamı 100 olmalı', 'error'); return; }
    const s = getSettings();
    s.defaultWeights = weights;
    saveSettings(s);
    showToast('Ağırlıklar kaydedildi');
  });

  document.getElementById('btn-clear-all').addEventListener('click', () => {
    if (!confirm(TR.settings.clearConfirm)) return;
    saveAll('properties', []);
    saveAll('clients', []);
    saveAll('reminders', []);
    saveAll('activity', []);
    showToast('Tüm veriler silindi');
    renderSettings(container);
  });
}

function weightRow(key, label, value) {
  return `<div class="weight-row">
    <span class="weight-label">${label}</span>
    <input type="range" class="default-weight-slider" data-key="${key}" min="0" max="100" value="${value}">
    <span class="weight-val" id="dwv_${key}">${value}</span>
  </div>`;
}
