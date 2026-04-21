import { TR } from '../i18n.js';
import { getAll, saveAll, logActivity } from '../storage.js';
import { uuid, formatPrice, formatDate, truncate, showToast, confirm, ROOM_OPTIONS, FEATURE_OPTIONS, debounce, parseImportFile } from '../utils.js';
import { createModal, openModal, closeModal, showStep, buildStepIndicator } from '../components/modals.js';
import { hasPermission } from '../auth.js';

let searchQ = '';
let filterType = '';
let filterPriority = '';
let filterSegment = '';
let filterStage = '';
let filterSource = '';
let filterMonth = '';
let currentStep = 0;
let selectedClientIds = new Set();

const WA_TEMPLATES = [
  { id: 'greeting',     label: 'Genel Selamlama',    text: 'Merhaba {ad}, nasılsınız? Gayrimenkul konularında yardımcı olabileceğim bir şey var mı?' },
  { id: 'new_listing',  label: 'Yeni İlan Bildirimi', text: 'Merhaba {ad}, kriterlerinize uygun yeni bir ilan mevcut. Detayları paylaşmak ister misiniz?' },
  { id: 'meeting',      label: 'Görüşme Hatırlatma',  text: 'Merhaba {ad}, görüşmemizi hatırlatmak istedim. Uygun bir zaman belirleyebilir miyiz?' },
  { id: 'offer_follow', label: 'Teklif Takibi',       text: 'Merhaba {ad}, teklifimize dair düşüncelerinizi merak ettim. Sizi arayabilir miyim?' },
  { id: 'birthday',     label: 'Doğum Günü Tebriği',  text: 'Sayın {ad}, doğum gününüzü en içten dileklerimle kutlarım! 🎂' },
  { id: 'custom',       label: 'Özel Mesaj',          text: '' },
];

const STAGE_LABELS = { lead:'Potansiyel', contacted:'İlk Görüşme', offer:'Teklif', contract:'Sözleşme', closed:'Kapandı', lost:'Kaybedildi' };
const SOURCE_LABELS = { referral:'Referans', portal:'Portal', social:'Sosyal Medya', direct:'Doğrudan', other:'Diğer' };

export function renderClients(container) {
  // sessionStorage'dan grafik navigasyon filtrelerini al
  const navType    = sessionStorage.getItem('nav_client_type');
  const navSegment = sessionStorage.getItem('nav_client_segment');
  const navStage   = sessionStorage.getItem('nav_client_stage');
  const navSource  = sessionStorage.getItem('nav_client_source');
  const navMonth   = sessionStorage.getItem('nav_client_month');
  if (navType)    { filterType    = navType;    sessionStorage.removeItem('nav_client_type'); }
  if (navSegment) { filterSegment = navSegment; sessionStorage.removeItem('nav_client_segment'); }
  if (navStage)   { filterStage   = navStage;   sessionStorage.removeItem('nav_client_stage'); }
  if (navSource)  { filterSource  = navSource;  sessionStorage.removeItem('nav_client_source'); }
  if (navMonth)   { filterMonth   = navMonth;   sessionStorage.removeItem('nav_client_month'); }

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">${TR.client.title}</h1>
      <div class="page-header-actions">
        ${hasPermission('clients','add') ? `<button class="btn btn-outline" id="btn-import-clients"><i data-lucide="upload"></i> Excel'den Aktar</button>` : ''}
        ${hasPermission('clients','add') ? `<button class="btn btn-primary" id="btn-add-client"><i data-lucide="user-plus"></i> ${TR.client.add}</button>` : ''}
      </div>
    </div>
    <div class="toolbar">
      <div class="toolbar-item">
        <span class="toolbar-item-label">Ara</span>
        <input type="text" class="search-input" id="client-search" placeholder="${TR.client.searchPlaceholder}" value="${searchQ}">
      </div>
      <div class="toolbar-item">
        <span class="toolbar-item-label">Müşteri Tipi</span>
        <select class="select-input" id="client-filter-type">
          <option value="">${TR.common.all}</option>
          <option value="buyer">${TR.client.buyer}</option>
          <option value="seller">${TR.client.seller}</option>
          <option value="tenant">${TR.client.tenant}</option>
        </select>
      </div>
      <div class="toolbar-item">
        <span class="toolbar-item-label">Öncelik</span>
        <select class="select-input" id="client-filter-priority">
          <option value="">${TR.common.all}</option>
          <option value="urgent">${TR.client.urgent}</option>
          <option value="high">${TR.client.high}</option>
          <option value="medium">${TR.client.medium}</option>
          <option value="low">${TR.client.low}</option>
        </select>
      </div>
      <div class="toolbar-item">
        <span class="toolbar-item-label">Segment</span>
        <select class="select-input" id="client-filter-segment">
          <option value="">${TR.common.all}</option>
          <option value="hot">🔥 Sıcak</option>
          <option value="warm">🌤 Ilık</option>
          <option value="cold">❄️ Soğuk</option>
          <option value="lost">💤 Kaybedildi</option>
        </select>
      </div>
    </div>
    <div id="client-active-chips"></div>
    <div id="clients-list"></div>
  `;

  if (window.lucide) window.lucide.createIcons();
  document.getElementById('client-filter-type').value = filterType;
  document.getElementById('client-filter-priority').value = filterPriority;
  document.getElementById('client-filter-segment').value = filterSegment;

  document.getElementById('btn-add-client')?.addEventListener('click', () => openClientForm(null));
  document.getElementById('btn-import-clients')?.addEventListener('click', () => openClientImportModal());
  document.getElementById('client-search').addEventListener('input', debounce(e => { searchQ = e.target.value; renderList(); }, 250));
  document.getElementById('client-filter-type').addEventListener('change', e => { filterType = e.target.value; renderList(); });
  document.getElementById('client-filter-priority').addEventListener('change', e => { filterPriority = e.target.value; renderList(); });
  document.getElementById('client-filter-segment').addEventListener('change', e => { filterSegment = e.target.value; renderList(); });

  renderActiveChips();
  renderList();
}

function renderActiveChips() {
  const bar = document.getElementById('client-active-chips');
  if (!bar) return;
  const chips = [];
  if (filterStage)  chips.push({ key:'stage',  label: 'Aşama: ' + (STAGE_LABELS[filterStage]  || filterStage)  });
  if (filterSource) chips.push({ key:'source', label: 'Kaynak: ' + (SOURCE_LABELS[filterSource] || filterSource) });
  if (filterMonth)  chips.push({ key:'month',  label: 'Ay: ' + filterMonth });
  if (!chips.length) { bar.innerHTML = ''; return; }
  bar.innerHTML = `<div class="active-filter-chips">
    ${chips.map(c => `<span class="filter-chip" data-clear="${c.key}">${c.label} <button class="filter-chip-clear" data-clear="${c.key}">×</button></span>`).join('')}
    <button class="btn btn-ghost btn-sm filter-chip-clear-all">Filtreleri Temizle</button>
  </div>`;
  bar.querySelectorAll('[data-clear]').forEach(el => {
    el.addEventListener('click', () => {
      const k = el.dataset.clear;
      if (k === 'stage')  filterStage  = '';
      if (k === 'source') filterSource = '';
      if (k === 'month')  filterMonth  = '';
      renderActiveChips();
      renderList();
    });
  });
  bar.querySelector('.filter-chip-clear-all')?.addEventListener('click', () => {
    filterStage = ''; filterSource = ''; filterMonth = '';
    renderActiveChips(); renderList();
  });
}

function renderList() {
  let data = getAll('clients');
  if (searchQ) {
    const q = searchQ.toLowerCase();
    data = data.filter(c => (c.firstName+' '+c.lastName).toLowerCase().includes(q) || (c.phone||'').includes(q) || (c.email||'').toLowerCase().includes(q));
  }
  if (filterType)     data = data.filter(c => c.clientType === filterType);
  if (filterPriority) data = data.filter(c => c.priorityLevel === filterPriority);
  if (filterSegment)  data = data.filter(c => c.segment === filterSegment);
  if (filterStage)    data = data.filter(c => (c.pipelineStage || 'lead') === filterStage);
  if (filterSource)   data = data.filter(c => (c.source || 'other') === filterSource);
  if (filterMonth)    data = data.filter(c => (c.updatedAt || '').startsWith(filterMonth));

  const list = document.getElementById('clients-list');
  if (!list) return;

  if (!data.length) {
    list.innerHTML = `<div class="empty-state"><i data-lucide="users"></i><p>${TR.client.noData}</p></div>`;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  list.innerHTML = `<div class="table-wrapper"><table class="table"><thead><tr>
    <th class="col-check"><input type="checkbox" id="select-all-clients" title="Tümünü Seç"></th>
    <th>Ad Soyad</th><th>Telefon</th><th>Tip</th><th>Bütçe</th><th>Öncelik</th><th>Segment</th><th>Aşama</th><th>${TR.common.actions}</th>
  </tr></thead><tbody>
    ${data.map(c => `<tr>
      <td class="col-check"><input type="checkbox" class="client-checkbox" data-id="${c.id}"></td>
      <td><strong>${c.firstName} ${c.lastName}</strong></td>
      <td>${c.phone||'—'}</td>
      <td><span class="badge badge-outline">${typeLabel(c.clientType)}</span></td>
      <td>${c.budgetMin||c.budgetMax ? (c.budgetMin?formatPrice(c.budgetMin):'')+'–'+(c.budgetMax?formatPrice(c.budgetMax):'') : '—'}</td>
      <td>${priorityBadge(c.priorityLevel)}</td>
      <td>${segmentBadge(c.segment)}</td>
      <td>${pipelineStageBadge(c.pipelineStage)}</td>
      <td class="actions-cell">
        <button class="btn btn-sm btn-ghost btn-view" data-id="${c.id}"><i data-lucide="eye"></i></button>
        ${hasPermission('clients','edit') ? `<button class="btn btn-sm btn-ghost btn-edit" data-id="${c.id}"><i data-lucide="pencil"></i></button>` : ''}
        ${hasPermission('clients','delete') ? `<button class="btn btn-sm btn-ghost btn-delete" data-id="${c.id}"><i data-lucide="trash-2"></i></button>` : ''}
      </td>
    </tr>`).join('')}
  </tbody></table></div>`;

  if (window.lucide) window.lucide.createIcons();
  document.querySelectorAll('.btn-view').forEach(btn => btn.addEventListener('click', () => openClientDetail(btn.dataset.id)));
  document.querySelectorAll('.btn-edit').forEach(btn => btn.addEventListener('click', () => {
    const c = getAll('clients').find(x => x.id === btn.dataset.id);
    if (c) openClientForm(c);
  }));
  document.querySelectorAll('.btn-delete').forEach(btn => btn.addEventListener('click', () => deleteClient(btn.dataset.id)));

  // Checkbox setup
  const selectAllCb = list.querySelector('#select-all-clients');
  const rowCbs = [...list.querySelectorAll('.client-checkbox')];
  rowCbs.forEach(cb => { cb.checked = selectedClientIds.has(cb.dataset.id); });
  const syncSelectAll = () => {
    const checked = rowCbs.filter(cb => cb.checked).length;
    if (!selectAllCb) return;
    selectAllCb.checked = checked === rowCbs.length && rowCbs.length > 0;
    selectAllCb.indeterminate = checked > 0 && checked < rowCbs.length;
  };
  syncSelectAll();
  selectAllCb?.addEventListener('change', e => {
    rowCbs.forEach(cb => { cb.checked = e.target.checked; if (e.target.checked) selectedClientIds.add(cb.dataset.id); else selectedClientIds.delete(cb.dataset.id); });
    updateBulkBar();
  });
  rowCbs.forEach(cb => cb.addEventListener('change', () => {
    if (cb.checked) selectedClientIds.add(cb.dataset.id); else selectedClientIds.delete(cb.dataset.id);
    syncSelectAll(); updateBulkBar();
  }));
  updateBulkBar();
}

const typeLabel = t => ({ buyer: TR.client.buyer, seller: TR.client.seller, tenant: TR.client.tenant }[t] || t);
const stageLabel = s => ({ researching: 'Araştırıyor', deciding: 'Karar Aşamasında', urgent: 'Acil' }[s] || '—');
function priorityBadge(p) {
  const map = { low: 'secondary', medium: 'info', high: 'warning', urgent: 'danger' };
  const labels = { low: TR.client.low, medium: TR.client.medium, high: TR.client.high, urgent: TR.client.urgent };
  return `<span class="badge badge-${map[p]||'secondary'}">${labels[p]||p}</span>`;
}
function segmentBadge(s) {
  if (!s) return '<span class="badge badge-secondary">—</span>';
  const map = { hot: 'danger', warm: 'warning', cold: 'info', lost: 'secondary' };
  const icons = { hot: '🔥', warm: '🌤', cold: '❄️', lost: '💤' };
  return `<span class="badge badge-${map[s]||'secondary'}">${icons[s]||''} ${TR.segment?.[s]||s}</span>`;
}
function pipelineStageBadge(s) {
  if (!s) return '<span class="badge badge-secondary">Lead</span>';
  const map = { lead: 'secondary', contacted: 'info', offer: 'warning', contract: 'primary', closed: 'success', lost: 'danger' };
  return `<span class="badge badge-${map[s]||'secondary'}">${TR.pipeline?.[s]||s}</span>`;
}
const sourceLabel = s => ({ referral: 'Referans', portal: 'Portal', social: 'Sosyal Medya', direct: 'Direkt', other: 'Diğer' }[s] || '—');

function deleteClient(id) {
  if (!confirm(TR.client.deleteConfirm)) return;
  saveAll('clients', getAll('clients').filter(c => c.id !== id));
  logActivity('client_delete', 'Müşteri silindi', id);
  showToast('Müşteri silindi');
  renderList();
}

function openClientForm(client) {
  currentStep = 0;
  const isEdit = !!client;
  const steps = [TR.client.step1, TR.client.step2, TR.client.step3];

  const defaultWeights = client?.matchWeights || { budget: 40, location: 30, squareMeters: 15, roomCount: 10, features: 5 };

  const body = `
    ${buildStepIndicator(steps)}
    <form id="client-form" autocomplete="off">
      <div class="step-panel active">
        <div class="form-row">
          <div class="form-group"><label>${TR.client.firstName} <span class="required">*</span></label><input type="text" name="firstName" value="${client?.firstName||''}" class="input-field" required></div>
          <div class="form-group"><label>${TR.client.lastName}</label><input type="text" name="lastName" value="${client?.lastName||''}" class="input-field"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>${TR.client.phone}</label><input type="tel" name="phone" value="${client?.phone||''}" class="input-field"></div>
          <div class="form-group"><label>${TR.client.email}</label><input type="email" name="email" value="${client?.email||''}" class="input-field"></div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>${TR.client.clientType}</label>
            <select name="clientType" class="select-input">
              <option value="buyer" ${(!client||client.clientType==='buyer')?'selected':''}>${TR.client.buyer}</option>
              <option value="seller" ${client?.clientType==='seller'?'selected':''}>${TR.client.seller}</option>
              <option value="tenant" ${client?.clientType==='tenant'?'selected':''}>${TR.client.tenant}</option>
            </select>
          </div>
          <div class="form-group">
            <label>${TR.client.priorityLevel}</label>
            <select name="priorityLevel" class="select-input">
              <option value="low" ${(!client||client.priorityLevel==='low')?'selected':''}>${TR.client.low}</option>
              <option value="medium" ${client?.priorityLevel==='medium'?'selected':''}>${TR.client.medium}</option>
              <option value="high" ${client?.priorityLevel==='high'?'selected':''}>${TR.client.high}</option>
              <option value="urgent" ${client?.priorityLevel==='urgent'?'selected':''}>${TR.client.urgent}</option>
            </select>
          </div>
        </div>
        <div class="form-group"><label>${TR.client.firstMeetingDate}</label><input type="date" name="firstMeetingDate" value="${client?.firstMeetingDate||''}" class="input-field"></div>
        <div class="form-row">
          <div class="form-group">
            <label>Segment</label>
            <select name="segment" class="select-input">
              <option value="">Seçilmedi</option>
              <option value="hot" ${client?.segment==='hot'?'selected':''}>🔥 Sıcak</option>
              <option value="warm" ${(!client||client.segment==='warm'||!client.segment)?'selected':''}>🌤 Ilık</option>
              <option value="cold" ${client?.segment==='cold'?'selected':''}>❄️ Soğuk</option>
              <option value="lost" ${client?.segment==='lost'?'selected':''}>💤 Kaybedildi</option>
            </select>
          </div>
          <div class="form-group">
            <label>Kaynak</label>
            <select name="source" class="select-input">
              <option value="other" ${(!client||client.source==='other'||!client.source)?'selected':''}>Diğer</option>
              <option value="referral" ${client?.source==='referral'?'selected':''}>Referans</option>
              <option value="portal" ${client?.source==='portal'?'selected':''}>Portal</option>
              <option value="social" ${client?.source==='social'?'selected':''}>Sosyal Medya</option>
              <option value="direct" ${client?.source==='direct'?'selected':''}>Direkt</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Satış Aşaması</label>
            <select name="pipelineStage" class="select-input">
              <option value="lead" ${(!client||client.pipelineStage==='lead'||!client.pipelineStage)?'selected':''}>Potansiyel Lead</option>
              <option value="contacted" ${client?.pipelineStage==='contacted'?'selected':''}>İlk Görüşme</option>
              <option value="offer" ${client?.pipelineStage==='offer'?'selected':''}>Teklif Aşaması</option>
              <option value="contract" ${client?.pipelineStage==='contract'?'selected':''}>Sözleşme</option>
              <option value="closed" ${client?.pipelineStage==='closed'?'selected':''}>Kapandı</option>
              <option value="lost" ${client?.pipelineStage==='lost'?'selected':''}>Kaybedildi</option>
            </select>
          </div>
          <div class="form-group"><label>Meslek</label><input type="text" name="occupation" value="${client?.occupation||''}" class="input-field" placeholder="Örn: Mühendis"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Doğum Günü</label><input type="date" name="birthday" value="${client?.birthday||''}" class="input-field"></div>
        </div>
        <div class="form-group"><label>${TR.client.notes}</label><textarea name="notes" rows="2" class="textarea-input">${client?.notes||''}</textarea></div>
      </div>

      <div class="step-panel">
        <div class="form-row">
          <div class="form-group"><label>${TR.client.budgetMin}</label><input type="number" name="budgetMin" value="${client?.budgetMin||''}" class="input-field"></div>
          <div class="form-group"><label>${TR.client.budgetMax}</label><input type="number" name="budgetMax" value="${client?.budgetMax||''}" class="input-field"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>${TR.client.desiredMinM2}</label><input type="number" name="desiredMinM2" value="${client?.desiredMinM2||''}" class="input-field"></div>
          <div class="form-group"><label>${TR.client.desiredMaxM2}</label><input type="number" name="desiredMaxM2" value="${client?.desiredMaxM2||''}" class="input-field"></div>
        </div>
        <div class="form-group">
          <label>${TR.client.desiredRoomCounts}</label>
          <div class="checkbox-group">
            ${ROOM_OPTIONS.map(r => `<label class="checkbox-label"><input type="checkbox" name="desiredRoomCounts" value="${r}" ${(client?.desiredRoomCounts||[]).includes(r)?'checked':''}> ${r}</label>`).join('')}
          </div>
        </div>
        <div class="form-group"><label>${TR.client.preferredDistricts} (virgülle ayırın)</label><input type="text" name="preferredDistricts" value="${(client?.preferredDistricts||[]).join(', ')}" class="input-field" placeholder="Kadıköy, Üsküdar"></div>
        <div class="form-group"><label>${TR.client.preferredNeighborhoods} (virgülle ayırın)</label><input type="text" name="preferredNeighborhoods" value="${(client?.preferredNeighborhoods||[]).join(', ')}" class="input-field"></div>
        <div class="form-group">
          <label>${TR.client.desiredFeatures}</label>
          <div class="checkbox-group">
            ${FEATURE_OPTIONS.map(f => `<label class="checkbox-label"><input type="checkbox" name="desiredFeatures" value="${f.value}" ${(client?.desiredFeatures||[]).includes(f.value)?'checked':''}> ${f.label}</label>`).join('')}
          </div>
        </div>
        <div class="form-group">
          <label>${TR.client.listingTypePreference}</label>
          <select name="listingTypePreference" class="select-input">
            <option value="sale" ${(!client||client.listingTypePreference==='sale')?'selected':''}>${TR.property.sale}</option>
            <option value="rent" ${client?.listingTypePreference==='rent'?'selected':''}>${TR.property.rent}</option>
          </select>
        </div>
      </div>

      <div class="step-panel">
        <div class="form-row">
          <div class="form-group"><label>${TR.client.declaredIncome} (₺/ay)</label><input type="number" name="declaredIncome" value="${client?.declaredIncome||''}" class="input-field"></div>
          <div class="form-group">
            <label>${TR.client.creditStatus}</label>
            <select name="creditStatus" class="select-input">
              <option value="unknown" ${(!client||client.creditStatus==='unknown')?'selected':''}>Bilinmiyor</option>
              <option value="approved" ${client?.creditStatus==='approved'?'selected':''}>Onaylandı</option>
              <option value="pending" ${client?.creditStatus==='pending'?'selected':''}>Beklemede</option>
              <option value="rejected" ${client?.creditStatus==='rejected'?'selected':''}>Reddedildi</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>${TR.client.decisionStage}</label>
          <select name="decisionStage" class="select-input">
            <option value="researching" ${(!client||client.decisionStage==='researching')?'selected':''}>Araştırıyor</option>
            <option value="deciding" ${client?.decisionStage==='deciding'?'selected':''}>Karar Aşamasında</option>
            <option value="urgent" ${client?.decisionStage==='urgent'?'selected':''}>Acil</option>
          </select>
        </div>
        <div class="form-group">
          <label>${TR.client.matchWeights} <span class="form-hint">(Toplam 100 olmalı)</span></label>
          <div class="weights-editor" id="weights-editor">
            ${weightsHTML(defaultWeights)}
          </div>
        </div>
      </div>
    </form>
  `;

  const footer = `
    <button type="button" class="btn btn-ghost btn-prev" style="display:none"><i data-lucide="arrow-left"></i> ${TR.common.prev}</button>
    <button type="button" class="btn btn-primary btn-next">${TR.common.next} <i data-lucide="arrow-right"></i></button>
    <button type="button" class="btn btn-primary btn-save" style="display:none"><i data-lucide="save"></i> ${TR.common.save}</button>
  `;

  const modal = createModal('client-modal', isEdit ? TR.client.edit : TR.client.add, body, footer);
  openModal('client-modal');

  modal.querySelector('.btn-next')?.addEventListener('click', () => {
    if (currentStep < 2) { currentStep++; showStep(modal, currentStep, 3); if (window.lucide) window.lucide.createIcons(); }
  });
  modal.querySelector('.btn-prev')?.addEventListener('click', () => {
    if (currentStep > 0) { currentStep--; showStep(modal, currentStep, 3); if (window.lucide) window.lucide.createIcons(); }
  });
  modal.querySelector('.btn-save')?.addEventListener('click', () => saveClient(modal, client?.id));

  // Weight sliders live update
  modal.querySelectorAll('.weight-slider').forEach(slider => {
    slider.addEventListener('input', () => updateWeightTotal(modal));
  });
}

function weightsHTML(w) {
  const fields = [
    { key: 'budget', label: 'Bütçe' },
    { key: 'location', label: 'Konum' },
    { key: 'squareMeters', label: 'm²' },
    { key: 'roomCount', label: 'Oda' },
    { key: 'features', label: 'Özellikler' },
  ];
  return fields.map(f => `
    <div class="weight-row">
      <span class="weight-label">${f.label}</span>
      <input type="range" class="weight-slider" name="w_${f.key}" min="0" max="100" value="${w[f.key]||0}">
      <span class="weight-val" id="wv_${f.key}">${w[f.key]||0}</span>
    </div>
  `).join('') + `<div class="weight-total">Toplam: <strong id="weight-total-sum">${Object.values(w).reduce((a,b)=>a+b,0)}</strong>/100</div>`;
}

function updateWeightTotal(modal) {
  let sum = 0;
  modal.querySelectorAll('.weight-slider').forEach(s => {
    const key = s.name.replace('w_', '');
    const val = parseInt(s.value);
    sum += val;
    const vEl = modal.querySelector(`#wv_${key}`);
    if (vEl) vEl.textContent = val;
  });
  const total = modal.querySelector('#weight-total-sum');
  if (total) { total.textContent = sum; total.style.color = sum === 100 ? 'var(--color-success)' : 'var(--color-danger)'; }
}

function saveClient(modal, editId) {
  const form = modal.querySelector('#client-form');
  const fd = new FormData(form);
  const get = k => fd.get(k);

  const firstName = get('firstName')?.trim();
  if (!firstName) { showToast('Ad zorunlu', 'error'); return; }

  const desiredRoomCounts = [...form.querySelectorAll('input[name="desiredRoomCounts"]:checked')].map(i => i.value);
  const desiredFeatures = [...form.querySelectorAll('input[name="desiredFeatures"]:checked')].map(i => i.value);
  const preferredDistricts = get('preferredDistricts')?.split(',').map(s => s.trim()).filter(Boolean) || [];
  const preferredNeighborhoods = get('preferredNeighborhoods')?.split(',').map(s => s.trim()).filter(Boolean) || [];

  const weights = {};
  form.querySelectorAll('.weight-slider').forEach(s => { weights[s.name.replace('w_', '')] = parseInt(s.value); });

  const data = {
    id: editId || uuid(),
    createdAt: editId ? (getAll('clients').find(c=>c.id===editId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    firstName, lastName: get('lastName')?.trim()||'',
    phone: get('phone')?.trim(),
    email: get('email')?.trim(),
    notes: get('notes'),
    occupation: get('occupation')?.trim() || null,
    birthday: get('birthday') || null,
    segment: get('segment') || 'warm',
    source: get('source') || 'other',
    pipelineStage: get('pipelineStage') || 'lead',
    pipelineHistory: editId ? (getAll('clients').find(c=>c.id===editId)?.pipelineHistory||[]) : [],
    noteLog: editId ? (getAll('clients').find(c=>c.id===editId)?.noteLog||[]) : [],
    budgetMin: parseFloat(get('budgetMin')) || null,
    budgetMax: parseFloat(get('budgetMax')) || null,
    preferredDistricts, preferredNeighborhoods,
    desiredFeatures, desiredRoomCounts,
    desiredMinM2: parseFloat(get('desiredMinM2')) || null,
    desiredMaxM2: parseFloat(get('desiredMaxM2')) || null,
    clientType: get('clientType'),
    priorityLevel: get('priorityLevel'),
    firstMeetingDate: get('firstMeetingDate') || null,
    declaredIncome: parseFloat(get('declaredIncome')) || null,
    creditStatus: get('creditStatus'),
    decisionStage: get('decisionStage'),
    listingTypePreference: get('listingTypePreference'),
    matchWeights: weights,
    meetingHistory: editId ? (getAll('clients').find(c=>c.id===editId)?.meetingHistory||[]) : [],
    shownPropertyIds: editId ? (getAll('clients').find(c=>c.id===editId)?.shownPropertyIds||[]) : [],
  };

  let clients = getAll('clients');
  if (editId) {
    clients = clients.map(c => c.id === editId ? data : c);
    logActivity('client_edit', `Müşteri güncellendi: ${firstName}`, editId);
  } else {
    clients.unshift(data);
    logActivity('client_add', `Yeni müşteri: ${firstName} ${data.lastName}`, data.id);
  }
  saveAll('clients', clients);
  closeModal('client-modal');
  showToast(editId ? 'Müşteri güncellendi' : 'Müşteri eklendi');
  renderList();
}

export function openClientDetail(id) {
  const client = getAll('clients').find(x => x.id === id);
  if (!client) return;
  const properties = getAll('properties');

  import('../matching.js').then(({ computeMatch, scoreColor }) => {
    const matches = properties
      .filter(p => p.status === 'active' && p.listingType === (client.listingTypePreference || 'sale'))
      .map(p => ({ property: p, result: computeMatch(p, client) }))
      .filter(m => m.result.overallScore >= 40)
      .sort((a, b) => b.result.overallScore - a.result.overallScore)
      .slice(0, 8);

    const shownProperties = (client.shownPropertyIds||[]).map(pid => properties.find(p=>p.id===pid)).filter(Boolean);

    const body = `
      <div class="tabs">
        <button class="tab-btn active" data-tab="profile">Profil</button>
        <button class="tab-btn" data-tab="criteria">Arama Kriterleri</button>
        <button class="tab-btn" data-tab="matches">Eşleşen İlanlar ${matches.length ? `<span class="badge badge-primary">${matches.length}</span>` : ''}</button>
        <button class="tab-btn" data-tab="shown">Gösterilen İlanlar</button>
        <button class="tab-btn" data-tab="meetings">Görüşmeler</button>
      </div>
      <div class="tab-content">
        <div class="tab-panel active" id="tab-profile">
          <div class="detail-grid">
            ${dRow('Ad Soyad', client.firstName+' '+client.lastName)}
            ${dRow('Telefon', client.phone||'—')}
            ${dRow('E-posta', client.email||'—')}
            ${dRow('Müşteri Tipi', typeLabel(client.clientType))}
            ${dRow('Öncelik', client.priorityLevel)}
            ${dRow('Karar Aşaması', stageLabel(client.decisionStage))}
            ${dRow('İlk Görüşme', formatDate(client.firstMeetingDate))}
            ${dRow('Kredi Durumu', client.creditStatus||'—')}
            ${dRow('Beyan Gelir', client.declaredIncome ? formatPrice(client.declaredIncome)+'/ay' : '—')}
            ${dRow('Meslek', client.occupation||'—')}
            ${dRow('Doğum Günü', formatDate(client.birthday))}
            ${dRow('Segment', segmentBadge(client.segment))}
            ${dRow('Kaynak', sourceLabel(client.source))}
            ${dRow('Satış Aşaması', pipelineStageBadge(client.pipelineStage))}
          </div>
          ${client.notes ? `<div class="notes-box"><strong>Not:</strong> ${client.notes}</div>` : ''}
        </div>
        <div class="tab-panel" id="tab-criteria">
          <div class="detail-grid">
            ${dRow('Bütçe', [client.budgetMin?formatPrice(client.budgetMin):'', client.budgetMax?formatPrice(client.budgetMax):''].filter(Boolean).join(' – ') || '—')}
            ${dRow('m²', [client.desiredMinM2, client.desiredMaxM2].filter(Boolean).join(' – ') || '—')}
            ${dRow('Oda Sayısı', (client.desiredRoomCounts||[]).join(', ')||'—')}
            ${dRow('Tercih Edilen İlçe', (client.preferredDistricts||[]).join(', ')||'—')}
            ${dRow('Tercih Edilen Mahalle', (client.preferredNeighborhoods||[]).join(', ')||'—')}
            ${dRow('İstenen Özellikler', (client.desiredFeatures||[]).map(f => FEATURE_OPTIONS.find(o=>o.value===f)?.label||f).join(', ')||'—')}
            ${dRow('Tip Tercihi', client.listingTypePreference==='sale'?TR.property.sale:TR.property.rent)}
          </div>
          <h4 style="margin:1rem 0 .5rem">Eşleştirme Ağırlıkları</h4>
          <div class="weights-display">
            ${Object.entries(client.matchWeights||{}).map(([k,v]) => `
              <div class="weight-display-row">
                <span>${TR.matching[k]||k}</span>
                <div class="mini-bar"><div style="width:${v}%;background:var(--color-primary)"></div></div>
                <span>${v}%</span>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="tab-panel" id="tab-matches">
          ${matches.length ? matches.map(m => `
            <div class="match-item">
              <div class="match-score" style="color:${scoreColor(m.result.overallScore)}">
                <span class="score-num">${m.result.overallScore}</span><span class="score-pct">%</span>
              </div>
              <div class="match-info">
                <div class="match-name">${truncate(m.property.title, 35)}</div>
                <div class="match-phone">${m.property.district||''} · ${m.property.roomCount||''} · ${formatPrice(m.property.price)}</div>
                <div class="score-bars">
                  ${Object.entries(m.result.breakdown).map(([k,v]) => `
                    <div class="score-bar-row">
                      <span class="score-bar-label">${TR.matching[k]||k}</span>
                      <div class="score-bar-track"><div class="score-bar-fill" style="width:${v.score}%;background:${scoreColor(v.score)}"></div></div>
                      <span class="score-bar-val">${v.score}%</span>
                    </div>
                  `).join('')}
                </div>
              </div>
              <button class="btn btn-sm btn-outline mark-shown" data-pid="${m.property.id}" data-cid="${client.id}">Gösterildi</button>
            </div>
          `).join('') : '<p class="text-muted">Eşleşen aktif ilan bulunamadı</p>'}
        </div>
        <div class="tab-panel" id="tab-shown">
          ${shownProperties.length ? shownProperties.map(p => `
            <div class="shown-item">
              <div><strong>${truncate(p.title,35)}</strong></div>
              <div class="text-muted">${p.district||''} · ${formatPrice(p.price)}</div>
            </div>
          `).join('') : '<p class="text-muted">Henüz ilan gösterilmedi</p>'}
        </div>
        <div class="tab-panel" id="tab-meetings">
          <button class="btn btn-sm btn-primary" id="btn-add-meeting-client">+ Görüşme Ekle</button>
          <div id="meeting-list-client" class="meeting-list">
            ${(client.meetingHistory||[]).length ? (client.meetingHistory||[]).map(m => meetingRow(m)).join('') : '<p class="text-muted">Görüşme kaydı yok</p>'}
          </div>
        </div>
      </div>
    `;

    const modal = createModal('client-detail-modal', client.firstName+' '+client.lastName, body);
    openModal('client-detail-modal');

    modal.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        modal.querySelectorAll('.tab-panel').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        modal.querySelector('#tab-'+btn.dataset.tab)?.classList.add('active');
      });
    });

    modal.querySelectorAll('.mark-shown').forEach(btn => {
      btn.addEventListener('click', () => {
        const clients = getAll('clients');
        const idx = clients.findIndex(c => c.id === btn.dataset.cid);
        if (idx >= 0) {
          const shown = clients[idx].shownPropertyIds || [];
          if (!shown.includes(btn.dataset.pid)) {
            clients[idx].shownPropertyIds = [...shown, btn.dataset.pid];
            saveAll('clients', clients);
          }
        }
        btn.textContent = '✓ Gösterildi'; btn.disabled = true;
      });
    });

    modal.querySelector('#btn-add-meeting-client')?.addEventListener('click', () => addMeeting(id, 'meeting-list-client'));
  });
}

function dRow(label, value) {
  return `<div class="detail-row"><span class="detail-label">${label}</span><span class="detail-value">${value}</span></div>`;
}

function meetingRow(m) {
  const typeMap = { phone: 'Telefon', in_person: 'Yüz Yüze', online: 'Online', viewing: 'Gezi' };
  return `<div class="meeting-item"><div class="meeting-type">${typeMap[m.type]||m.type}</div><div class="meeting-date">${formatDate(m.date)}</div><div class="meeting-notes">${m.notes||''}</div></div>`;
}

function toIntlPhone(phone) {
  const c = (phone || '').replace(/\D/g, '');
  if (!c) return '';
  if (c.startsWith('90') && c.length >= 12) return c;
  if (c.startsWith('0')) return '90' + c.slice(1);
  return '90' + c;
}

function updateBulkBar() {
  let bar = document.getElementById('bulk-wa-bar');
  if (selectedClientIds.size === 0) { if (bar) bar.remove(); return; }
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'bulk-wa-bar';
    bar.className = 'bulk-wa-bar';
    document.getElementById('main-wrapper')?.appendChild(bar);
  }
  bar.innerHTML = `
    <span class="bulk-wa-count"><strong>${selectedClientIds.size}</strong> müşteri seçildi</span>
    <button class="btn btn-sm btn-ghost" id="btn-clear-sel">Seçimi Temizle</button>
    <button class="btn btn-sm btn-wa-green" id="btn-open-bulk-wa"><i data-lucide="message-circle"></i>&ensp;Toplu WhatsApp</button>
  `;
  if (window.lucide) window.lucide.createIcons();
  bar.querySelector('#btn-clear-sel').addEventListener('click', () => {
    selectedClientIds.clear();
    document.querySelectorAll('.client-checkbox').forEach(cb => { cb.checked = false; });
    const sa = document.getElementById('select-all-clients');
    if (sa) { sa.checked = false; sa.indeterminate = false; }
    updateBulkBar();
  });
  bar.querySelector('#btn-open-bulk-wa').addEventListener('click', openBulkWAModal);
}

function openBulkWAModal() {
  const clients = getAll('clients');
  const selected = [...selectedClientIds].map(id => clients.find(c => c.id === id)).filter(Boolean);
  if (!selected.length) { showToast('Seçili müşteri yok', 'error'); return; }

  const buildLinks = (msg) => selected.map(c => {
    const phone = toIntlPhone(c.phone);
    const personal = msg.replace(/\{ad\}/g, c.firstName);
    return { c, phone, href: phone ? `https://wa.me/${phone}?text=${encodeURIComponent(personal)}` : '' };
  });

  const body = `
    <div class="form-group">
      <label>Mesaj Şablonu</label>
      <select id="wa-tpl" class="select-input">
        ${WA_TEMPLATES.map(t => `<option value="${t.id}">${t.label}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Mesaj <span class="form-hint">({ad} yerine müşteri adı gelir)</span></label>
      <textarea id="wa-msg" rows="3" class="textarea-input">${WA_TEMPLATES[0].text}</textarea>
    </div>
    <div class="form-group">
      <label>Seçili Müşteriler (${selected.length})</label>
      <div class="wa-client-list" id="wa-client-list">
        ${selected.map(c => `
          <div class="wa-client-item" data-id="${c.id}">
            <div class="wa-client-info">
              <div class="wa-client-name">${c.firstName} ${c.lastName}</div>
              <div class="wa-client-phone">${c.phone || 'Telefon yok'}</div>
            </div>
            ${c.phone ? `<a href="#" class="btn-wa-send wa-ind-link" data-phone="${toIntlPhone(c.phone)}" data-name="${c.firstName}" target="_blank">Gönder</a>` : '<span class="text-muted" style="font-size:.75rem">Telefon yok</span>'}
          </div>`).join('')}
      </div>
    </div>
  `;
  const footer = `<button class="btn btn-wa-green" id="btn-send-all"><i data-lucide="send"></i>&ensp;Tümünü Gönder</button>`;
  const modal = createModal('bulk-wa-modal', 'Toplu WhatsApp Mesajı', body, footer);
  openModal('bulk-wa-modal');
  if (window.lucide) window.lucide.createIcons();

  const updateLinks = () => {
    const msg = modal.querySelector('#wa-msg').value;
    modal.querySelectorAll('.wa-ind-link').forEach(a => {
      const personal = msg.replace(/\{ad\}/g, a.dataset.name);
      a.href = `https://wa.me/${a.dataset.phone}?text=${encodeURIComponent(personal)}`;
      a.setAttribute('target', '_blank');
    });
  };
  updateLinks();

  modal.querySelector('#wa-tpl').addEventListener('change', e => {
    const tpl = WA_TEMPLATES.find(t => t.id === e.target.value);
    if (tpl) { modal.querySelector('#wa-msg').value = tpl.text; updateLinks(); }
  });
  modal.querySelector('#wa-msg').addEventListener('input', updateLinks);
  modal.querySelector('#btn-send-all').addEventListener('click', () => {
    const msg = modal.querySelector('#wa-msg').value;
    let delay = 0;
    buildLinks(msg).forEach(({ href }) => {
      if (href) { setTimeout(() => window.open(href, '_blank'), delay); delay += 400; }
    });
  });
}

function openClientImportModal() {
  const TEMPLATE = 'Ad,Soyad,Telefon,E-posta,Müşteri Tipi,Öncelik,Segment,Bütçe Min,Bütçe Max,Tercih İlçe,Meslek,Notlar\nAhmet,Yılmaz,05551234567,ahmet@mail.com,buyer,medium,warm,1000000,2000000,Kadıköy,Mühendis,\n';
  const body = `
    <div class="import-guide">
      <p>Şablonu indirip doldurun. Excel (.xlsx) veya CSV desteklenir.</p>
      <button class="btn btn-sm btn-outline" id="btn-dl-tpl"><i data-lucide="download"></i> Şablonu İndir</button>
    </div>
    <div class="form-group" style="margin-top:1rem">
      <label>Dosya Seçin (.xlsx veya .csv)</label>
      <input type="file" id="import-file" accept=".xlsx,.xls,.csv" class="file-input">
    </div>
    <div id="import-preview" style="margin-top:.75rem"></div>
    <div id="import-error" class="alert alert-danger" style="display:none;margin-top:.5rem"></div>
  `;
  const footer = `<button class="btn btn-primary" id="btn-do-import" disabled><i data-lucide="upload"></i> İçeri Aktar</button>`;
  const modal = createModal('import-modal', 'Müşteri İçe Aktarma (Excel/CSV)', body, footer);
  openModal('import-modal');
  if (window.lucide) window.lucide.createIcons();

  let parsedRows = [];
  modal.querySelector('#btn-dl-tpl').addEventListener('click', () => {
    const blob = new Blob(['\uFEFF' + TEMPLATE], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = 'musteri-sablonu.csv'; a.click(); URL.revokeObjectURL(url);
  });
  modal.querySelector('#import-file').addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    const errEl = modal.querySelector('#import-error');
    const preview = modal.querySelector('#import-preview');
    const importBtn = modal.querySelector('#btn-do-import');
    errEl.style.display = 'none'; preview.innerHTML = '';
    try {
      parsedRows = await parseImportFile(file);
      if (!parsedRows.length) { errEl.textContent = 'Dosyada veri bulunamadı'; errEl.style.display = ''; return; }
      const cols = Object.keys(parsedRows[0]);
      preview.innerHTML = `<p class="import-preview-info">${parsedRows.length} kayıt bulundu (ilk 5 satır önizleme):</p>
        <div class="table-wrapper" style="max-height:160px;overflow:auto">
          <table class="table table-sm"><thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
          <tbody>${parsedRows.slice(0,5).map(r => `<tr>${cols.map(c => `<td>${r[c]??''}</td>`).join('')}</tr>`).join('')}</tbody></table>
        </div>`;
      importBtn.disabled = false; importBtn.textContent = `İçeri Aktar (${parsedRows.length} müşteri)`;
    } catch(err) { errEl.textContent = 'Dosya okunamadı: ' + err.message; errEl.style.display = ''; }
  });
  modal.querySelector('#btn-do-import').addEventListener('click', () => {
    importClientsData(parsedRows); closeModal('import-modal');
  });
}

function importClientsData(rows) {
  const TYPE_MAP = { alıcı:'buyer', buyer:'buyer', satıcı:'seller', seller:'seller', kiracı:'tenant', tenant:'tenant' };
  const PRI_MAP = { düşük:'low', low:'low', orta:'medium', medium:'medium', yüksek:'high', high:'high', acil:'urgent', urgent:'urgent' };
  const SEG_MAP = { sıcak:'hot', hot:'hot', ılık:'warm', warm:'warm', soğuk:'cold', cold:'cold', kayıp:'lost', lost:'lost' };
  const existing = getAll('clients');
  const imported = rows.map(r => ({
    id: uuid(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    firstName: r['Ad'] || r['firstName'] || '',
    lastName: r['Soyad'] || r['lastName'] || '',
    phone: r['Telefon'] || r['phone'] || '',
    email: r['E-posta'] || r['email'] || '',
    clientType: TYPE_MAP[(r['Müşteri Tipi']||r['clientType']||'').toLowerCase()] || 'buyer',
    priorityLevel: PRI_MAP[(r['Öncelik']||r['priorityLevel']||'').toLowerCase()] || 'medium',
    segment: SEG_MAP[(r['Segment']||r['segment']||'').toLowerCase()] || 'warm',
    pipelineStage: 'lead', source: 'other',
    budgetMin: parseFloat(r['Bütçe Min']||r['budgetMin']) || null,
    budgetMax: parseFloat(r['Bütçe Max']||r['budgetMax']) || null,
    preferredDistricts: r['Tercih İlçe'] ? r['Tercih İlçe'].split(',').map(s=>s.trim()).filter(Boolean) : [],
    preferredNeighborhoods: [], desiredFeatures: [], desiredRoomCounts: [],
    occupation: r['Meslek'] || null, notes: r['Notlar'] || r['notes'] || '',
    matchWeights: { budget:40, location:30, squareMeters:15, roomCount:10, features:5 },
    meetingHistory: [], shownPropertyIds: [], pipelineHistory: [], noteLog: [],
  })).filter(c => c.firstName);
  saveAll('clients', [...imported, ...existing]);
  logActivity('client_add', `Excel'den ${imported.length} müşteri aktarıldı`);
  showToast(`${imported.length} müşteri aktarıldı`);
  renderList();
}

function addMeeting(clientId, listContainerId) {
  const html = `
    <div class="form-group"><label>Tür</label>
      <select id="m-type" class="select-input">
        <option value="phone">Telefon</option><option value="in_person">Yüz Yüze</option>
        <option value="online">Online</option><option value="viewing">Gezi</option>
      </select>
    </div>
    <div class="form-group"><label>Tarih</label><input type="date" id="m-date" class="input-field" value="${new Date().toISOString().split('T')[0]}"></div>
    <div class="form-group"><label>Not</label><textarea id="m-notes" rows="2" class="textarea-input"></textarea></div>
  `;
  const m = createModal('meeting-modal-c', 'Görüşme Ekle', html, `<button class="btn btn-primary" id="save-meeting-c">Kaydet</button>`);
  openModal('meeting-modal-c');

  m.querySelector('#save-meeting-c').addEventListener('click', () => {
    const entry = { id: uuid(), type: m.querySelector('#m-type').value, date: m.querySelector('#m-date').value, notes: m.querySelector('#m-notes').value };
    const clients = getAll('clients');
    const idx = clients.findIndex(x => x.id === clientId);
    if (idx >= 0) {
      clients[idx].meetingHistory = [...(clients[idx].meetingHistory||[]), entry];
      saveAll('clients', clients);
    }
    closeModal('meeting-modal-c');
    const list = document.getElementById(listContainerId);
    if (list) { const ex = list.querySelector('.text-muted'); if (ex) ex.remove(); list.insertAdjacentHTML('beforeend', meetingRow(entry)); }
  });
}
