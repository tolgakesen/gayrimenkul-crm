import { TR } from '../i18n.js';
import { getAll, saveAll, logActivity } from '../storage.js';
import { uuid, formatPrice, formatDate, truncate, showToast, confirm, ROOM_OPTIONS, FEATURE_OPTIONS, debounce, parseImportFile, exportToExcel } from '../utils.js';
import { createModal, openModal, closeModal, showStep, buildStepIndicator } from '../components/modals.js';
import { hasPermission, isAdmin, isOwnOnly, hasFieldPermission, getCurrentUser } from '../auth.js';

let viewMode = 'grid';
let searchQ = '';
let filterStatus = '';
let filterType = '';
let filterAge = '';
let currentProperty = null;
let currentStep = 0;
let lastFilteredProperties = [];

const AGE_BUCKET_LABELS = { '0-5':'0-5 yıl', '6-10':'6-10 yıl', '11-20':'11-20 yıl', '21-30':'21-30 yıl', '30+':'30+ yıl' };

export function renderProperties(container) {
  const admin = isAdmin();
  const pendingFilter = sessionStorage.getItem('dashboard_filter_status');
  if (pendingFilter !== null) { filterStatus = pendingFilter; sessionStorage.removeItem('dashboard_filter_status'); }
  const navSearch = sessionStorage.getItem('nav_prop_search');
  if (navSearch !== null) { searchQ = navSearch; sessionStorage.removeItem('nav_prop_search'); }
  const navAge = sessionStorage.getItem('nav_prop_age');
  if (navAge !== null) { filterAge = navAge; sessionStorage.removeItem('nav_prop_age'); }
  if (!admin && filterStatus !== 'active') filterStatus = 'active';

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">${TR.property.title}</h1>
      <div class="page-header-actions">
        ${isAdmin() ? `<button class="btn btn-outline" id="btn-export-props"><i data-lucide="download"></i> Excel'e Aktar</button>` : ''}
        ${hasPermission('properties','add') ? `<button class="btn btn-outline" id="btn-import-props"><i data-lucide="upload"></i> Excel'den Aktar</button>` : ''}
        ${hasPermission('properties','add') ? `<button class="btn btn-primary" id="btn-add-property"><i data-lucide="plus"></i> ${TR.property.add}</button>` : ''}
      </div>
    </div>
    <div class="toolbar">
      <div class="toolbar-item">
        <span class="toolbar-item-label">Ara</span>
        <input type="text" class="search-input" id="prop-search" placeholder="${TR.property.searchPlaceholder}" value="${searchQ}">
      </div>
      ${admin ? `
      <div class="toolbar-item">
        <span class="toolbar-item-label">Durum</span>
        <select class="select-input" id="prop-filter-status">
          <option value="">${TR.property.filterAll}</option>
          <option value="active">${TR.property.active}</option>
          <option value="sold">${TR.property.sold}</option>
          <option value="rented">${TR.property.rented}</option>
          <option value="withdrawn">${TR.property.withdrawn}</option>
        </select>
      </div>` : ''}
      <div class="toolbar-item">
        <span class="toolbar-item-label">İlan Tipi</span>
        <select class="select-input" id="prop-filter-type">
          <option value="">${TR.property.filterAll}</option>
          <option value="sale">${TR.property.sale}</option>
          <option value="rent">${TR.property.rent}</option>
        </select>
      </div>
      <div class="toolbar-item toolbar-item-view">
        <span class="toolbar-item-label">Görünüm</span>
        <div class="view-toggle">
          <button class="btn-icon ${viewMode==='grid'?'active':''}" id="btn-grid" title="${TR.property.viewGrid}"><i data-lucide="layout-grid"></i></button>
          <button class="btn-icon ${viewMode==='table'?'active':''}" id="btn-table" title="${TR.property.viewTable}"><i data-lucide="list"></i></button>
        </div>
      </div>
    </div>
    <div id="prop-active-chips"></div>
    <div id="properties-list"></div>
  `;

  if (window.lucide) window.lucide.createIcons();

  if (admin) {
    document.getElementById('prop-filter-status').value = filterStatus;
    document.getElementById('prop-filter-status').addEventListener('change', e => { filterStatus = e.target.value; renderList(); });
  }
  document.getElementById('prop-filter-type').value = filterType;

  document.getElementById('btn-add-property')?.addEventListener('click', () => openPropertyForm(null));
  document.getElementById('btn-import-props')?.addEventListener('click', () => openPropertyImportModal());
  document.getElementById('btn-export-props')?.addEventListener('click', () => exportProperties());
  document.getElementById('btn-grid').addEventListener('click', () => { viewMode = 'grid'; renderProperties(container); });
  document.getElementById('btn-table').addEventListener('click', () => { viewMode = 'table'; renderProperties(container); });

  const searchInput = document.getElementById('prop-search');
  searchInput.addEventListener('input', debounce(e => { searchQ = e.target.value; renderList(); }, 250));

  document.getElementById('prop-filter-type').addEventListener('change', e => { filterType = e.target.value; renderList(); });

  renderPropActiveChips(container);
  renderList();
}

function renderPropActiveChips(container) {
  const bar = document.getElementById('prop-active-chips');
  if (!bar) return;
  const chips = [];
  if (filterAge) chips.push({ key:'age', label: 'Bina Yaşı: ' + (AGE_BUCKET_LABELS[filterAge] || filterAge) });
  if (!chips.length) { bar.innerHTML = ''; return; }
  bar.innerHTML = `<div class="active-filter-chips">
    ${chips.map(c => `<span class="filter-chip" data-clear="${c.key}">${c.label} <button class="filter-chip-clear" data-clear="${c.key}">×</button></span>`).join('')}
    <button class="btn btn-ghost btn-sm filter-chip-clear-all">Filtreyi Temizle</button>
  </div>`;
  bar.querySelectorAll('[data-clear]').forEach(el => {
    el.addEventListener('click', () => {
      if (el.dataset.clear === 'age') filterAge = '';
      renderPropActiveChips(container);
      renderList();
    });
  });
  bar.querySelector('.filter-chip-clear-all')?.addEventListener('click', () => {
    filterAge = '';
    renderPropActiveChips(container);
    renderList();
  });
}

function renderList() {
  let data = getAll('properties');
  if (isOwnOnly('properties')) {
    const uid = getCurrentUser()?.userId;
    data = data.filter(p => p.createdBy === uid);
  }
  const effectiveStatus = isAdmin() ? filterStatus : 'active';
  if (searchQ) {
    const q = searchQ.toLowerCase();
    data = data.filter(p => (p.title||'').toLowerCase().includes(q) || (p.district||'').toLowerCase().includes(q) || (p.neighborhood||'').toLowerCase().includes(q));
  }
  if (effectiveStatus) data = data.filter(p => p.status === effectiveStatus);
  if (filterType) data = data.filter(p => p.listingType === filterType);
  if (filterAge) {
    data = data.filter(p => {
      const a = p.buildingAge;
      if (a == null) return false;
      if (filterAge === '0-5')   return a <= 5;
      if (filterAge === '6-10')  return a >= 6  && a <= 10;
      if (filterAge === '11-20') return a >= 11 && a <= 20;
      if (filterAge === '21-30') return a >= 21 && a <= 30;
      if (filterAge === '30+')   return a > 30;
      return true;
    });
  }

  lastFilteredProperties = data;
  const list = document.getElementById('properties-list');
  if (!list) return;

  if (!data.length) {
    list.innerHTML = `<div class="empty-state"><i data-lucide="building-2"></i><p>${TR.property.noData}</p></div>`;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  if (viewMode === 'grid') {
    list.innerHTML = `<div class="card-grid">${data.map(p => propertyCard(p)).join('')}</div>`;
  } else {
    list.innerHTML = propertyTable(data);
  }

  if (window.lucide) window.lucide.createIcons();
  attachListeners();
}

function statusBadge(s) {
  const map = { active: 'success', sold: 'info', rented: 'warning', withdrawn: 'secondary' };
  const labels = { active: TR.property.active, sold: TR.property.sold, rented: TR.property.rented, withdrawn: TR.property.withdrawn };
  return `<span class="badge badge-${map[s]||'secondary'}">${labels[s]||s}</span>`;
}

function propertyCard(p) {
  return `
    <div class="property-card card" data-id="${p.id}">
      <div class="property-card-img">
        ${p.floorPlanPhoto ? `<img src="${p.floorPlanPhoto}" alt="Kat Planı">` : `<div class="no-img"><i data-lucide="image-off"></i></div>`}
        <div class="property-card-badges">
          ${statusBadge(p.status)}
          <span class="badge badge-outline">${p.listingType === 'sale' ? TR.property.sale : TR.property.rent}</span>
        </div>
      </div>
      <div class="property-card-body">
        <h4 class="property-title">${truncate(p.title, 35)}</h4>
        ${hasFieldPermission('properties','price') ? `<div class="property-price">${formatPrice(p.price)}</div>` : ''}
        <div class="property-meta">
          <span><i data-lucide="map-pin"></i> ${p.district||'—'}${p.neighborhood ? ', '+p.neighborhood : ''}</span>
          <span><i data-lucide="maximize-2"></i> ${p.squareMeters||'—'} m²</span>
          <span><i data-lucide="layout"></i> ${p.roomCount||'—'}</span>
          <span><i data-lucide="building"></i> ${p.floor||'—'}. kat</span>
        </div>
      </div>
      <div class="property-card-actions">
        <button class="btn btn-sm btn-ghost btn-view" data-id="${p.id}" title="${TR.common.details}"><i data-lucide="eye"></i></button>
        ${hasPermission('properties','edit') ? `<button class="btn btn-sm btn-ghost btn-edit" data-id="${p.id}" title="${TR.common.edit}"><i data-lucide="pencil"></i></button>` : ''}
        ${hasPermission('properties','delete') ? `<button class="btn btn-sm btn-ghost btn-delete" data-id="${p.id}" title="${TR.common.delete}"><i data-lucide="trash-2"></i></button>` : ''}
      </div>
    </div>
  `;
}

function propertyTable(data) {
  const showPrice = hasFieldPermission('properties', 'price');
  return `
    <div class="table-wrapper">
      <table class="table">
        <thead><tr>
          <th>Başlık</th>${showPrice ? '<th>Fiyat</th>' : ''}<th>m²</th><th>Oda</th><th>İlçe</th><th>Tip</th><th>Durum</th><th>${TR.common.actions}</th>
        </tr></thead>
        <tbody>
          ${data.map(p => `<tr>
            <td>${truncate(p.title,30)}</td>
            ${showPrice ? `<td>${formatPrice(p.price)}</td>` : ''}
            <td>${p.squareMeters||'—'}</td>
            <td>${p.roomCount||'—'}</td>
            <td>${p.district||'—'}</td>
            <td>${p.listingType==='sale'?TR.property.sale:TR.property.rent}</td>
            <td>${statusBadge(p.status)}</td>
            <td class="actions-cell">
              <button class="btn btn-sm btn-ghost btn-view" data-id="${p.id}"><i data-lucide="eye"></i></button>
              ${hasPermission('properties','edit') ? `<button class="btn btn-sm btn-ghost btn-edit" data-id="${p.id}"><i data-lucide="pencil"></i></button>` : ''}
              ${hasPermission('properties','delete') ? `<button class="btn btn-sm btn-ghost btn-delete" data-id="${p.id}"><i data-lucide="trash-2"></i></button>` : ''}
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function attachListeners() {
  document.querySelectorAll('.btn-view').forEach(btn => btn.addEventListener('click', () => openPropertyDetail(btn.dataset.id)));
  document.querySelectorAll('.btn-edit').forEach(btn => btn.addEventListener('click', () => {
    const p = getAll('properties').find(x => x.id === btn.dataset.id);
    if (p) openPropertyForm(p);
  }));
  document.querySelectorAll('.btn-delete').forEach(btn => btn.addEventListener('click', () => deleteProperty(btn.dataset.id)));
}

function deleteProperty(id) {
  if (!confirm(TR.property.deleteConfirm)) return;
  const data = getAll('properties').filter(p => p.id !== id);
  saveAll('properties', data);
  logActivity('property_delete', 'İlan silindi', id);
  showToast('İlan silindi');
  renderList();
}

// ---- FORM ----
function openPropertyForm(property) {
  currentProperty = property;
  currentStep = 0;
  const isEdit = !!property;

  const steps = [TR.property.step1, TR.property.step2, TR.property.step3];

  const body = `
    ${buildStepIndicator(steps)}
    <form id="property-form" autocomplete="off">
      <div class="step-panel active">
        ${field('text', 'title', TR.property.listingTitle, property?.title, true)}
        <div class="form-row">
          ${field('number', 'price', TR.property.price, property?.price, true)}
          ${field('number', 'squareMeters', TR.property.squareMeters, property?.squareMeters, true)}
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>${TR.property.roomCount}</label>
            <select name="roomCount" class="select-input">
              <option value="">Seçin</option>
              ${ROOM_OPTIONS.map(r => `<option value="${r}" ${property?.roomCount===r?'selected':''}>${r}</option>`).join('')}
            </select>
          </div>
          ${field('number', 'floor', TR.property.floor, property?.floor)}
          ${field('number', 'totalFloors', TR.property.totalFloors, property?.totalFloors)}
        </div>
        <div class="form-row">
          ${field('text', 'district', TR.property.district, property?.district)}
          ${field('text', 'neighborhood', TR.property.neighborhood, property?.neighborhood)}
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Enlem (Lat) <small class="form-hint"><a href="https://maps.google.com" target="_blank" rel="noopener">Google Maps'ten al</a></small></label>
            <input type="number" step="any" name="lat" value="${property?.lat||''}" class="input-field" placeholder="41.0082">
          </div>
          <div class="form-group">
            <label>Boylam (Lon)</label>
            <input type="number" step="any" name="lon" value="${property?.lon||''}" class="input-field" placeholder="28.9784">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>${TR.property.listingType}</label>
            <select name="listingType" class="select-input">
              <option value="sale" ${(!property||property.listingType==='sale')?'selected':''}>${TR.property.sale}</option>
              <option value="rent" ${property?.listingType==='rent'?'selected':''}>${TR.property.rent}</option>
            </select>
          </div>
          <div class="form-group">
            <label>${TR.property.status}</label>
            <select name="status" class="select-input">
              <option value="active" ${(!property||property.status==='active')?'selected':''}>${TR.property.active}</option>
              <option value="sold" ${property?.status==='sold'?'selected':''}>${TR.property.sold}</option>
              <option value="rented" ${property?.status==='rented'?'selected':''}>${TR.property.rented}</option>
              <option value="withdrawn" ${property?.status==='withdrawn'?'selected':''}>${TR.property.withdrawn}</option>
            </select>
          </div>
        </div>
      </div>

      <div class="step-panel">
        <div class="form-row">
          ${field('number', 'buildingAge', TR.property.buildingAge, property?.buildingAge)}
          <div class="form-group">
            <label>${TR.property.heatingType}</label>
            <select name="heatingType" class="select-input">
              ${[['central',TR.property.central],['individual',TR.property.individual],['floor',TR.property.floorHeating],['ac',TR.property.ac],['stove',TR.property.stove],['none',TR.property.noHeating]]
                .map(([v,l]) => `<option value="${v}" ${property?.heatingType===v?'selected':''}>${l}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>${TR.property.furnishing}</label>
            <select name="furnishing" class="select-input">
              <option value="unfurnished" ${(!property||property.furnishing==='unfurnished')?'selected':''}>${TR.property.unfurnished}</option>
              <option value="furnished" ${property?.furnishing==='furnished'?'selected':''}>${TR.property.furnished}</option>
              <option value="semi" ${property?.furnishing==='semi'?'selected':''}>${TR.property.semi}</option>
            </select>
          </div>
          <div class="form-group">
            <label>${TR.property.facadeDirection}</label>
            <select name="facadeDirection" class="select-input">
              ${[['north',TR.property.north],['south',TR.property.south],['east',TR.property.east],['west',TR.property.west],
                 ['northeast',TR.property.northeast],['northwest',TR.property.northwest],['southeast',TR.property.southeast],['southwest',TR.property.southwest]]
                .map(([v,l]) => `<option value="${v}" ${property?.facadeDirection===v?'selected':''}>${l}</option>`).join('')}
            </select>
          </div>
        </div>
        ${field('number', 'monthlyDues', TR.property.monthlyDues, property?.monthlyDues)}
        <div class="form-row checkboxes">
          ${checkbox('hasBalcony', TR.property.hasBalcony, property?.hasBalcony)}
          ${checkbox('hasParking', TR.property.hasParking, property?.hasParking)}
          ${checkbox('hasElevator', TR.property.hasElevator, property?.hasElevator)}
          ${checkbox('isGatedCommunity', TR.property.isGatedCommunity, property?.isGatedCommunity)}
        </div>
        <div class="form-group">
          <label>${TR.property.notes}</label>
          <textarea name="notes" rows="3" class="textarea-input">${property?.notes||''}</textarea>
        </div>
        <div class="form-group">
          <label>${TR.property.floorPlanPhoto}</label>
          <input type="file" name="floorPlanPhotoFile" accept="image/*" class="file-input" id="photo-input">
          ${property?.floorPlanPhoto ? `<div class="photo-preview"><img src="${property.floorPlanPhoto}" alt="Kat Planı"><button type="button" id="remove-photo" class="btn btn-sm btn-danger">Sil</button></div>` : ''}
          <div id="photo-warning" class="form-hint text-warning" style="display:none">Resim boyutu büyük, depolama alanı hızlı dolabilir.</div>
        </div>
        <div class="form-group">
          <label>Özellikler</label>
          <div class="checkbox-group">
            ${FEATURE_OPTIONS.map(f => `<label class="checkbox-label"><input type="checkbox" name="features" value="${f.value}" ${(property?.features||[]).includes(f.value)?'checked':''}> ${f.label}</label>`).join('')}
          </div>
        </div>
      </div>

      <div class="step-panel">
        <div class="form-row">
          <div class="form-group">
            <label>${TR.property.deedStatus}</label>
            <select name="deedStatus" class="select-input">
              ${[['kat_irtifaki',TR.property.katIrtifaki],['kat_mulkiyeti',TR.property.katMulkiyeti],['hisseli',TR.property.hisseli],['musterek',TR.property.musterek]]
                .map(([v,l]) => `<option value="${v}" ${property?.deedStatus===v?'selected':''}>${l}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>${TR.property.zoningStatus}</label>
            <select name="zoningStatus" class="select-input">
              <option value="residential" ${(!property||property.zoningStatus==='residential')?'selected':''}>${TR.property.residential}</option>
              <option value="commercial" ${property?.zoningStatus==='commercial'?'selected':''}>${TR.property.commercial}</option>
              <option value="mixed" ${property?.zoningStatus==='mixed'?'selected':''}>${TR.property.mixed}</option>
              <option value="agricultural" ${property?.zoningStatus==='agricultural'?'selected':''}>${TR.property.agricultural}</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Hizmet Bedeli Oranı (%)</label>
            <input type="number" name="commissionRate" value="${property?.commissionRate??''}" class="input-field" min="0" max="100" step="0.01" placeholder="Örn: 2.5">
          </div>
          <div class="form-group">
            <label>Hizmet Bedeli Miktarı</label>
            <input type="text" id="commission-amount" class="input-field" readonly placeholder="Otomatik hesaplanır" style="background:var(--color-bg-secondary);cursor:default">
          </div>
        </div>
        <div class="form-row checkboxes">
          ${checkbox('creditEligible', TR.property.creditEligible, property?.creditEligible)}
          ${checkbox('hasDASK', TR.property.hasDASK, property?.hasDASK)}
        </div>
        <div class="form-group"><label>${TR.property.ownerName}</label><input type="text" name="ownerName" value="${property?.owner?.name||''}" class="input-field"></div>
        <div class="form-group"><label>${TR.property.ownerPhone}</label><input type="text" name="ownerPhone" value="${property?.owner?.phone||''}" class="input-field"></div>
        <div class="form-group"><label>${TR.property.ownerNotes}</label><textarea name="ownerNotes" rows="2" class="textarea-input">${property?.owner?.notes||''}</textarea></div>
      </div>
    </form>
  `;

  const footer = `
    <button type="button" class="btn btn-ghost btn-prev" style="display:none"><i data-lucide="arrow-left"></i> ${TR.common.prev}</button>
    <button type="button" class="btn btn-primary btn-next">${TR.common.next} <i data-lucide="arrow-right"></i></button>
    <button type="button" class="btn btn-primary btn-save" style="display:none"><i data-lucide="save"></i> ${TR.common.save}</button>
  `;

  const modal = createModal('property-modal', isEdit ? TR.property.edit : TR.property.add, body, footer);
  openModal('property-modal');

  let photoData = property?.floorPlanPhoto || null;

  modal.querySelector('#photo-input')?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 800 * 1024) modal.querySelector('#photo-warning').style.display = '';
    const reader = new FileReader();
    reader.onload = ev => { photoData = ev.target.result; };
    reader.readAsDataURL(file);
  });

  modal.querySelector('#remove-photo')?.addEventListener('click', () => { photoData = null; modal.querySelector('.photo-preview')?.remove(); });

  modal.querySelector('.btn-next')?.addEventListener('click', () => {
    if (currentStep < 2) { currentStep++; showStep(modal, currentStep, 3); if (window.lucide) window.lucide.createIcons(); }
  });
  modal.querySelector('.btn-prev')?.addEventListener('click', () => {
    if (currentStep > 0) { currentStep--; showStep(modal, currentStep, 3); if (window.lucide) window.lucide.createIcons(); }
  });
  modal.querySelector('.btn-save')?.addEventListener('click', () => saveProperty(modal, photoData, property?.id));

  function updateCommissionAmount() {
    const price = parseFloat(modal.querySelector('[name="price"]')?.value) || 0;
    const rate  = parseFloat(modal.querySelector('[name="commissionRate"]')?.value) || 0;
    const el = modal.querySelector('#commission-amount');
    if (el) el.value = price > 0 && rate > 0 ? formatPrice(Math.round(price * rate / 100)) : '';
  }
  modal.querySelector('[name="commissionRate"]')?.addEventListener('input', updateCommissionAmount);
  modal.querySelector('[name="price"]')?.addEventListener('input', updateCommissionAmount);
  updateCommissionAmount();
}

function field(type, name, label, value = '', required = false) {
  return `<div class="form-group">
    <label>${label}${required ? ' <span class="required">*</span>' : ''}</label>
    <input type="${type}" name="${name}" value="${value ?? ''}" class="input-field" ${required ? 'required' : ''}>
  </div>`;
}

function checkbox(name, label, checked) {
  return `<label class="checkbox-label"><input type="checkbox" name="${name}" ${checked ? 'checked' : ''}> ${label}</label>`;
}

function saveProperty(modal, photoData, editId) {
  const form = modal.querySelector('#property-form');
  const fd = new FormData(form);
  const get = k => fd.get(k);

  const title = get('title')?.trim();
  if (!title) { showToast('Başlık zorunlu', 'error'); return; }
  const price = parseFloat(get('price'));
  if (!price) { showToast('Fiyat zorunlu', 'error'); return; }

  const features = [...form.querySelectorAll('input[name="features"]:checked')].map(i => i.value);

  const existing = editId ? getAll('properties').find(p=>p.id===editId) : null;
  const data = {
    id: editId || uuid(),
    createdAt: existing?.createdAt || new Date().toISOString(),
    createdBy: existing?.createdBy || getCurrentUser()?.userId || null,
    updatedAt: new Date().toISOString(),
    title, price,
    squareMeters: parseFloat(get('squareMeters')) || null,
    roomCount: get('roomCount'),
    floor: parseInt(get('floor')) || null,
    totalFloors: parseInt(get('totalFloors')) || null,
    district: get('district')?.trim(),
    neighborhood: get('neighborhood')?.trim(),
    listingType: get('listingType'),
    status: get('status'),
    buildingAge: parseInt(get('buildingAge')) || null,
    heatingType: get('heatingType'),
    hasBalcony: !!form.querySelector('input[name="hasBalcony"]')?.checked,
    hasParking: !!form.querySelector('input[name="hasParking"]')?.checked,
    hasElevator: !!form.querySelector('input[name="hasElevator"]')?.checked,
    isGatedCommunity: !!form.querySelector('input[name="isGatedCommunity"]')?.checked,
    furnishing: get('furnishing'),
    facadeDirection: get('facadeDirection'),
    monthlyDues: parseFloat(get('monthlyDues')) || null,
    floorPlanPhoto: photoData,
    notes: get('notes'),
    features,
    deedStatus: get('deedStatus'),
    creditEligible: !!form.querySelector('input[name="creditEligible"]')?.checked,
    hasDASK: !!form.querySelector('input[name="hasDASK"]')?.checked,
    zoningStatus: get('zoningStatus'),
    commissionRate: parseFloat(get('commissionRate')) || null,
    lat: parseFloat(get('lat')) || null,
    lon: parseFloat(get('lon')) || null,
    owner: { name: get('ownerName')?.trim(), phone: get('ownerPhone')?.trim(), notes: get('ownerNotes') },
    meetingHistory: existing?.meetingHistory || [],
  };

  let properties = getAll('properties');
  if (editId) {
    properties = properties.map(p => p.id === editId ? data : p);
    logActivity('property_edit', `İlan güncellendi: ${title}`, editId);
  } else {
    properties.unshift(data);
    logActivity('property_add', `Yeni ilan: ${title}`, data.id);
  }
  saveAll('properties', properties);
  closeModal('property-modal');
  showToast(editId ? 'İlan güncellendi' : 'İlan eklendi');
  renderList();
}

// ---- DETAIL ----
export function openPropertyDetail(id) {
  const p = getAll('properties').find(x => x.id === id);
  if (!p) return;

  const clients = getAll('clients');
  import('../matching.js').then(({ computeMatch, scoreLabel, scoreColor }) => {
    const matches = clients
      .filter(c => c.clientType !== 'seller')
      .map(c => ({ client: c, result: computeMatch(p, c) }))
      .filter(m => m.result.overallScore >= 40)
      .sort((a, b) => b.result.overallScore - a.result.overallScore)
      .slice(0, 5);

    const body = `
      <div class="tabs">
        <button class="tab-btn active" data-tab="overview">Genel Bakış</button>
        <button class="tab-btn" data-tab="advanced">Detaylar</button>
        <button class="tab-btn" data-tab="matches">Potansiyel Alıcılar ${matches.length ? `<span class="badge badge-primary">${matches.length}</span>` : ''}</button>
        <button class="tab-btn" data-tab="meetings">Görüşmeler</button>
      </div>
      <div class="tab-content">
        <div class="tab-panel active" id="tab-overview">
          ${p.floorPlanPhoto ? `<img src="${p.floorPlanPhoto}" class="detail-photo" alt="Kat Planı">` : ''}
          <div class="detail-grid">
            ${dRow('Başlık', p.title)}
            ${hasFieldPermission('properties','price') ? dRow('Fiyat', formatPrice(p.price)) : ''}
            ${dRow('m²', p.squareMeters ? p.squareMeters + ' m²' : '—')}
            ${dRow('Oda', p.roomCount||'—')}
            ${dRow('Kat', p.floor ? p.floor+'/'+p.totalFloors : '—')}
            ${dRow('Konum', [p.district, p.neighborhood].filter(Boolean).join(', ')||'—')}
            ${dRow('Tip', p.listingType==='sale'?TR.property.sale:TR.property.rent)}
            ${dRow('Durum', p.status)}
            ${dRow('Bina Yaşı', p.buildingAge != null ? p.buildingAge+' yıl' : '—')}
            ${dRow('Isınma', p.heatingType||'—')}
            ${dRow('Aidat', formatPrice(p.monthlyDues))}
          </div>
          <div class="feature-tags">${(p.features||[]).map(f => `<span class="tag">${FEATURE_OPTIONS.find(o=>o.value===f)?.label||f}</span>`).join('')}</div>
          ${hasFieldPermission('properties','notes') && p.notes ? `<div class="notes-box"><strong>Not:</strong> ${p.notes}</div>` : ''}
        </div>
        <div class="tab-panel" id="tab-advanced">
          <div class="detail-grid">
            ${dRow('Tapu', p.deedStatus||'—')}
            ${dRow('İmar', p.zoningStatus||'—')}
            ${dRow('Krediye Uygun', p.creditEligible?'Evet':'Hayır')}
            ${dRow('DASK', p.hasDASK?'Var':'Yok')}
            ${dRow('Hizmet Bedeli Oranı', p.commissionRate ? '%' + p.commissionRate : '—')}
            ${p.commissionRate && p.price ? dRow('Hizmet Bedeli Miktarı', formatPrice(Math.round(p.price * p.commissionRate / 100))) : ''}
            ${dRow('Cephe', p.facadeDirection||'—')}
            ${dRow('Eşya', p.furnishing||'—')}
          </div>
          ${hasFieldPermission('properties','ownerInfo') ? `
          <h4 style="margin:1rem 0 .5rem">Mal Sahibi</h4>
          <div class="detail-grid">
            ${dRow('Ad', p.owner?.name||'—')}
            ${dRow('Telefon', p.owner?.phone||'—')}
            ${p.owner?.notes ? dRow('Not', p.owner.notes) : ''}
          </div>` : ''}
        </div>
        <div class="tab-panel" id="tab-matches">
          ${matches.length ? matches.map(m => `
            <div class="match-item">
              <div class="match-score" style="color:${scoreColor(m.result.overallScore)}">
                <span class="score-num">${m.result.overallScore}</span><span class="score-pct">%</span>
              </div>
              <div class="match-info">
                <div class="match-name">${m.client.firstName} ${m.client.lastName}</div>
                <div class="match-phone">${m.client.phone||''}</div>
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
            </div>
          `).join('') : '<p class="text-muted">Yeterli eşleşme bulunamadı (min. %40)</p>'}
        </div>
        <div class="tab-panel" id="tab-meetings">
          <button class="btn btn-sm btn-primary" id="btn-add-meeting-prop">+ Görüşme Ekle</button>
          <div id="meeting-list-prop" class="meeting-list">
            ${(p.meetingHistory||[]).length ? (p.meetingHistory||[]).map(m => meetingRow(m)).join('') : '<p class="text-muted">Görüşme kaydı yok</p>'}
          </div>
        </div>
      </div>
    `;

    const modal = createModal('property-detail-modal', p.title, body);
    openModal('property-detail-modal');

    modal.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        modal.querySelectorAll('.tab-panel').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        modal.querySelector('#tab-'+btn.dataset.tab)?.classList.add('active');
      });
    });

    modal.querySelector('#btn-add-meeting-prop')?.addEventListener('click', () => addMeeting('properties', id, 'meeting-list-prop'));
  });
}

function dRow(label, value) {
  return `<div class="detail-row"><span class="detail-label">${label}</span><span class="detail-value">${value}</span></div>`;
}

function meetingRow(m) {
  const typeMap = { phone: 'Telefon', in_person: 'Yüz Yüze', online: 'Online', viewing: 'Gezi' };
  return `<div class="meeting-item"><div class="meeting-type">${typeMap[m.type]||m.type}</div><div class="meeting-date">${formatDate(m.date)}</div><div class="meeting-notes">${m.notes||''}</div></div>`;
}

function exportProperties() {
  const TYPE_L   = { sale:'Satılık', rent:'Kiralık' };
  const STATUS_L = { active:'Aktif', sold:'Satıldı', rented:'Kiralandı', withdrawn:'Çekildi' };
  const rows = lastFilteredProperties.map(p => ({
    'Başlık': p.title, 'Fiyat': p.price,
    'm²': p.squareMeters || '', 'Oda': p.roomCount || '',
    'İlçe': p.district || '', 'Mahalle': p.neighborhood || '',
    'Kat': p.floor || '', 'Toplam Kat': p.totalFloors || '',
    'Bina Yaşı': p.buildingAge || '',
    'Tip': TYPE_L[p.listingType] || p.listingType || '',
    'Durum': STATUS_L[p.status] || p.status || '',
    'Komisyon (%)': p.commissionRate || '', 'Aidat': p.monthlyDues || '',
    'Mal Sahibi': p.owner?.name || '', 'Mal Sahibi Tel': p.owner?.phone || '',
    'Notlar': p.notes || '',
  }));
  exportToExcel(rows, 'portfoy.xlsx');
}

function openPropertyImportModal() {
  const TEMPLATE = 'Başlık,Fiyat,m²,Oda,İlçe,Mahalle,Kat,Toplam Kat,Bina Yaşı,Tip,Durum,Notlar\nKadıköy 3+1 Satılık,5000000,120,3+1,Kadıköy,Moda,3,5,10,satılık,aktif,\nBeşiktaş 2+1 Kiralık,25000,80,2+1,Beşiktaş,Levent,4,8,5,kiralık,aktif,\n';
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
  const modal = createModal('import-modal', 'Portföy İçe Aktarma (Excel/CSV)', body, footer);
  openModal('import-modal');
  if (window.lucide) window.lucide.createIcons();

  let parsedRows = [];
  modal.querySelector('#btn-dl-tpl').addEventListener('click', () => {
    const blob = new Blob(['\uFEFF' + TEMPLATE], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = 'portfoy-sablonu.csv'; a.click(); URL.revokeObjectURL(url);
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
      importBtn.disabled = false; importBtn.textContent = `İçeri Aktar (${parsedRows.length} ilan)`;
    } catch(err) { errEl.textContent = 'Dosya okunamadı: ' + err.message; errEl.style.display = ''; }
  });
  modal.querySelector('#btn-do-import').addEventListener('click', () => {
    importPropertiesData(parsedRows); closeModal('import-modal');
  });
}

function importPropertiesData(rows) {
  const TYPE_MAP = { satılık:'sale', sale:'sale', kiralık:'rent', rent:'rent' };
  const STATUS_MAP = { aktif:'active', active:'active', satıldı:'sold', sold:'sold', kiralandı:'rented', rented:'rented', çekildi:'withdrawn', withdrawn:'withdrawn' };
  const existing = getAll('properties');
  const imported = rows.map(r => ({
    id: uuid(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    title: r['Başlık'] || r['title'] || '',
    price: parseFloat(r['Fiyat'] || r['price'] || 0) || 0,
    squareMeters: parseFloat(r['m²'] || r['squareMeters'] || '') || null,
    roomCount: r['Oda'] || r['roomCount'] || null,
    district: r['İlçe'] || r['district'] || '',
    neighborhood: r['Mahalle'] || r['neighborhood'] || '',
    floor: parseInt(r['Kat'] || r['floor'] || '') || null,
    totalFloors: parseInt(r['Toplam Kat'] || r['totalFloors'] || '') || null,
    buildingAge: parseInt(r['Bina Yaşı'] || r['buildingAge'] || '') || null,
    listingType: TYPE_MAP[(r['Tip'] || r['listingType'] || '').toLowerCase()] || 'sale',
    status: STATUS_MAP[(r['Durum'] || r['status'] || '').toLowerCase()] || 'active',
    notes: r['Notlar'] || r['notes'] || '',
    features: [], meetingHistory: [],
    owner: { name: '', phone: '', notes: '' },
  })).filter(p => p.title && p.price);
  saveAll('properties', [...imported, ...existing]);
  logActivity('property_add', `Excel'den ${imported.length} ilan aktarıldı`);
  showToast(`${imported.length} ilan aktarıldı`);
  renderList();
}

function addMeeting(entityType, entityId, listContainerId) {
  const html = `
    <div class="form-group">
      <label>Tür</label>
      <select id="m-type" class="select-input">
        <option value="phone">Telefon</option>
        <option value="in_person">Yüz Yüze</option>
        <option value="online">Online</option>
        <option value="viewing">Gezi</option>
      </select>
    </div>
    <div class="form-group"><label>Tarih</label><input type="date" id="m-date" class="input-field" value="${new Date().toISOString().split('T')[0]}"></div>
    <div class="form-group"><label>Not</label><textarea id="m-notes" rows="2" class="textarea-input"></textarea></div>
  `;
  const m = createModal('meeting-modal', 'Görüşme Ekle', html,
    `<button class="btn btn-primary" id="save-meeting">Kaydet</button>`);
  openModal('meeting-modal');

  m.querySelector('#save-meeting').addEventListener('click', () => {
    const entry = { id: uuid(), type: m.querySelector('#m-type').value, date: m.querySelector('#m-date').value, notes: m.querySelector('#m-notes').value };
    const all = getAll(entityType);
    const idx = all.findIndex(x => x.id === entityId);
    if (idx >= 0) {
      all[idx].meetingHistory = [...(all[idx].meetingHistory||[]), entry];
      saveAll(entityType, all);
    }
    closeModal('meeting-modal');
    const list = document.getElementById(listContainerId);
    if (list) {
      const existing = list.querySelector('.text-muted');
      if (existing) existing.remove();
      list.insertAdjacentHTML('beforeend', meetingRow(entry));
    }
  });
}
