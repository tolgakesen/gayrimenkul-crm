import { TR } from '../i18n.js';
import { getAll, saveAll, logActivity } from '../storage.js';
import { formatPrice, showToast } from '../utils.js';
import { hasPermission } from '../auth.js';

const STAGES = ['lead','contacted','offer','contract','closed','lost'];
const STAGE_ICONS = { lead:'user-plus', contacted:'phone', offer:'file-text', contract:'file-check', closed:'check-circle', lost:'x-circle' };
const STAGE_COLORS = { lead:'secondary', contacted:'info', offer:'warning', contract:'primary', closed:'success', lost:'danger' };

let filterType = '';
let filterSegment = '';

export function renderPipeline(container) {
  if (!hasPermission('pipeline','view')) {
    container.innerHTML = `<div class="error-state"><i data-lucide="shield-off"></i><p>Bu sayfaya erişim yetkiniz yok.</p></div>`;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">${TR.pipeline.title}</h1>
    </div>
    <div class="toolbar" style="margin-bottom:1rem">
      <select class="select-input" id="pl-filter-type">
        <option value="">Tüm Tipler</option>
        <option value="buyer">Alıcı</option>
        <option value="seller">Satıcı</option>
        <option value="tenant">Kiracı</option>
      </select>
      <select class="select-input" id="pl-filter-segment">
        <option value="">Tüm Segmentler</option>
        <option value="hot">🔥 Sıcak</option>
        <option value="warm">🌤 Ilık</option>
        <option value="cold">❄️ Soğuk</option>
        <option value="lost">💤 Kaybedildi</option>
      </select>
    </div>
    <div class="pipeline-board" id="pipeline-board">
      ${STAGES.map(s => buildColumn(s)).join('')}
    </div>
  `;

  document.getElementById('pl-filter-type').value = filterType;
  document.getElementById('pl-filter-segment').value = filterSegment;
  document.getElementById('pl-filter-type').addEventListener('change', e => { filterType = e.target.value; refreshBoard(); });
  document.getElementById('pl-filter-segment').addEventListener('change', e => { filterSegment = e.target.value; refreshBoard(); });

  if (window.lucide) window.lucide.createIcons();
  attachDragDrop();
  attachCardEvents();
}

function getClients() {
  let data = getAll('clients');
  if (filterType) data = data.filter(c => c.clientType === filterType);
  if (filterSegment) data = data.filter(c => c.segment === filterSegment);
  return data;
}

function buildColumn(stage) {
  const clients = getClients().filter(c => (c.pipelineStage || 'lead') === stage);
  const colorClass = STAGE_COLORS[stage] || 'secondary';
  return `
    <div class="pipeline-col" data-stage="${stage}">
      <div class="pipeline-col-header pipeline-col-header-${colorClass}">
        <i data-lucide="${STAGE_ICONS[stage]}"></i>
        <span>${TR.pipeline[stage]}</span>
        <span class="pipeline-count">${clients.length}</span>
      </div>
      <div class="pipeline-col-body" data-stage="${stage}" id="col-${stage}">
        ${clients.length ? clients.map(c => clientCard(c)).join('') : `<div class="pipeline-empty">${TR.pipeline.noClients}</div>`}
      </div>
    </div>
  `;
}

function clientCard(c) {
  const segIcons = { hot:'🔥', warm:'🌤', cold:'❄️', lost:'💤' };
  const budgetStr = c.budgetMax ? formatPrice(c.budgetMax) : (c.budgetMin ? formatPrice(c.budgetMin) : '');
  return `
    <div class="pipeline-card" draggable="true" data-id="${c.id}" data-stage="${c.pipelineStage||'lead'}">
      <div class="pipeline-card-name">${c.firstName} ${c.lastName}</div>
      <div class="pipeline-card-meta">
        ${c.phone ? `<span>${c.phone}</span>` : ''}
        ${budgetStr ? `<span>${budgetStr}</span>` : ''}
      </div>
      <div class="pipeline-card-tags">
        ${c.segment ? `<span class="pipeline-seg-icon">${segIcons[c.segment]||''}</span>` : ''}
        <span class="badge badge-sm badge-outline">${c.clientType === 'buyer' ? 'Alıcı' : c.clientType === 'seller' ? 'Satıcı' : 'Kiracı'}</span>
      </div>
      <div class="pipeline-card-actions">
        <select class="select-input select-sm stage-select" data-id="${c.id}">
          ${STAGES.map(s => `<option value="${s}" ${(c.pipelineStage||'lead')===s?'selected':''}>${TR.pipeline[s]}</option>`).join('')}
        </select>
        <button class="btn btn-xs btn-ghost pipeline-detail-btn" data-id="${c.id}" title="Detay"><i data-lucide="eye"></i></button>
      </div>
    </div>
  `;
}

function refreshBoard() {
  const board = document.getElementById('pipeline-board');
  if (!board) return;
  board.innerHTML = STAGES.map(s => buildColumn(s)).join('');
  if (window.lucide) window.lucide.createIcons();
  attachDragDrop();
  attachCardEvents();
}

function moveClientToStage(clientId, newStage) {
  const clients = getAll('clients');
  const idx = clients.findIndex(c => c.id === clientId);
  if (idx < 0) return;
  const oldStage = clients[idx].pipelineStage || 'lead';
  if (oldStage === newStage) return;
  clients[idx].pipelineStage = newStage;
  const history = clients[idx].pipelineHistory || [];
  history.push({ stage: newStage, movedAt: new Date().toISOString() });
  clients[idx].pipelineHistory = history.slice(-10);
  saveAll('clients', clients);
  logActivity('client_edit', `${clients[idx].firstName} ${clients[idx].lastName} → ${TR.pipeline[newStage]}`, clientId);
  showToast(`${TR.pipeline[newStage]} aşamasına taşındı`);
  refreshBoard();
}

function attachCardEvents() {
  document.querySelectorAll('.stage-select').forEach(sel => {
    sel.addEventListener('change', e => {
      e.stopPropagation();
      moveClientToStage(sel.dataset.id, sel.value);
    });
  });
  document.querySelectorAll('.pipeline-detail-btn').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const { openClientDetail } = await import('./clients.js');
      openClientDetail(btn.dataset.id);
    });
  });
}

function attachDragDrop() {
  document.querySelectorAll('.pipeline-card[draggable]').forEach(card => {
    card.addEventListener('dragstart', e => {
      e.dataTransfer.setData('clientId', card.dataset.id);
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
  });

  document.querySelectorAll('.pipeline-col-body').forEach(col => {
    col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('drag-over'); });
    col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
    col.addEventListener('drop', e => {
      e.preventDefault();
      col.classList.remove('drag-over');
      const clientId = e.dataTransfer.getData('clientId');
      const newStage = col.dataset.stage;
      if (clientId && newStage) moveClientToStage(clientId, newStage);
    });
  });
}
