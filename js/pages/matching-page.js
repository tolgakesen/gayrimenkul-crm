import { TR } from '../i18n.js';
import { getAll } from '../storage.js';
import { formatPrice, truncate } from '../utils.js';
import { computeMatch, scoreColor, scoreLabel } from '../matching.js';
import { hasPermission } from '../auth.js';

let mode = 'client'; // 'client' | 'property'
let selectedId = null;
let minScore = 40;

export function renderMatching(container) {
  if (!hasPermission('matching', 'view')) {
    container.innerHTML = `<div class="error-state"><i data-lucide="shield-off"></i><p>Bu sayfaya erişim yetkiniz yok.</p></div>`;
    if (window.lucide) window.lucide.createIcons();
    return;
  }
  const clients = getAll('clients');
  const properties = getAll('properties');

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">${TR.matching.title}</h1>
    </div>
    <div class="matching-controls card">
      <div class="mode-toggle">
        <button class="btn ${mode==='client'?'btn-primary':'btn-ghost'}" id="mode-client">
          <i data-lucide="user"></i> ${TR.matching.findForClient}
        </button>
        <button class="btn ${mode==='property'?'btn-primary':'btn-ghost'}" id="mode-property">
          <i data-lucide="building-2"></i> ${TR.matching.findForProperty}
        </button>
      </div>
      <div class="matching-selects">
        <div class="form-group" id="select-group">
          <label>${mode === 'client' ? TR.matching.selectClient : TR.matching.selectProperty}</label>
          <select class="select-input" id="entity-select">
            <option value="">— Seçin —</option>
            ${mode === 'client'
              ? clients.map(c => `<option value="${c.id}" ${selectedId===c.id?'selected':''}>${c.firstName} ${c.lastName}</option>`).join('')
              : properties.filter(p=>p.status==='active').map(p => `<option value="${p.id}" ${selectedId===p.id?'selected':''}>${truncate(p.title,40)}</option>`).join('')
            }
          </select>
        </div>
        <div class="form-group">
          <label>${TR.matching.minScore}: <strong id="min-score-label">${minScore}%</strong></label>
          <input type="range" id="min-score" min="0" max="90" step="5" value="${minScore}" class="range-input">
        </div>
      </div>
    </div>
    <div id="matching-results"></div>
  `;

  if (window.lucide) window.lucide.createIcons();

  document.getElementById('mode-client').addEventListener('click', () => { mode='client'; selectedId=null; renderMatching(container); });
  document.getElementById('mode-property').addEventListener('click', () => { mode='property'; selectedId=null; renderMatching(container); });

  document.getElementById('entity-select').addEventListener('change', e => { selectedId = e.target.value || null; showResults(); });
  document.getElementById('min-score').addEventListener('input', e => {
    minScore = parseInt(e.target.value);
    document.getElementById('min-score-label').textContent = minScore + '%';
    showResults();
  });

  if (selectedId) showResults();
}

function showResults() {
  const container = document.getElementById('matching-results');
  if (!container) return;
  if (!selectedId) { container.innerHTML = ''; return; }

  const clients = getAll('clients');
  const properties = getAll('properties');

  let results = [];
  let title = '';
  let client = null;

  if (mode === 'client') {
    client = clients.find(c => c.id === selectedId);
    if (!client) return;
    title = `${client.firstName} ${client.lastName} için eşleşen ilanlar`;
    results = properties
      .filter(p => p.status === 'active')
      .map(p => ({ entity: p, result: computeMatch(p, client) }))
      .filter(m => m.result.overallScore >= minScore)
      .sort((a, b) => b.result.overallScore - a.result.overallScore);
  } else {
    const property = properties.find(p => p.id === selectedId);
    if (!property) return;
    title = `"${truncate(property.title,30)}" ilanı için potansiyel müşteriler`;
    results = clients
      .filter(c => c.clientType !== 'seller')
      .map(c => ({ entity: c, result: computeMatch(property, c) }))
      .filter(m => m.result.overallScore >= minScore)
      .sort((a, b) => b.result.overallScore - a.result.overallScore);
  }

  if (!results.length) {
    container.innerHTML = `<div class="empty-state"><i data-lucide="search-x"></i><p>${TR.matching.noResults} (min. ${minScore}%)</p></div>`;
    if (mode === 'client' && client) container.insertAdjacentHTML('beforeend', buildExternalSection(client));
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  container.innerHTML = `
    <div class="matching-title">${title} <span class="badge badge-primary">${results.length} sonuç</span></div>
    <div class="match-list">
      ${results.map(m => matchCard(m)).join('')}
    </div>
    ${mode === 'client' && client ? buildExternalSection(client) : ''}
  `;
  if (window.lucide) window.lucide.createIcons();

  container.querySelectorAll('[data-open-property]').forEach(el => {
    el.addEventListener('click', async () => {
      const { openPropertyDetail } = await import('./properties.js');
      openPropertyDetail(el.dataset.openProperty);
    });
  });
}

const EXTERNAL_SITES = [
  { name: 'Sahibinden', color: '#FF6200', bg: 'rgba(255,98,0,.1)',
    saleUrl: 'https://www.sahibinden.com/satilik-daire',
    rentUrl: 'https://www.sahibinden.com/kiralik-daire' },
  { name: 'Hepsiemlak', color: '#E30613', bg: 'rgba(227,6,19,.08)',
    saleUrl: 'https://www.hepsiemlak.com/satilik-konut',
    rentUrl: 'https://www.hepsiemlak.com/kiralik-konut' },
  { name: 'Emlakjet', color: '#00A3DA', bg: 'rgba(0,163,218,.08)',
    saleUrl: 'https://www.emlakjet.com/satilik-daire/',
    rentUrl: 'https://www.emlakjet.com/kiralik-daire/' },
  { name: 'Zingat', color: '#6C2FD9', bg: 'rgba(108,47,217,.08)',
    saleUrl: 'https://www.zingat.com/satilik-konut',
    rentUrl: 'https://www.zingat.com/kiralik-konut' },
];

function buildExternalSection(client) {
  const isRent = client.listingTypePreference === 'rent';
  const typeLabel = isRent ? 'Kiralık' : 'Satılık';
  const criteria = buildCriteriaSummary(client);

  return `
    <div class="ext-search-section card">
      <div class="ext-search-header">
        <i data-lucide="globe"></i>
        <h4>Harici Site Aramaları</h4>
      </div>
      <p class="ext-search-desc text-muted">Portföyünüzde eşleşme bulunamadı veya daha fazla seçenek görmek istiyorsanız aşağıdaki sitelerden arama yapabilirsiniz.</p>
      ${criteria ? `<div class="ext-criteria-bar"><span class="ext-criteria-label">Arama kriterleri:</span>${criteria}</div>` : ''}
      <div class="ext-site-grid">
        ${EXTERNAL_SITES.map(s => `
          <a href="${isRent ? s.rentUrl : s.saleUrl}" target="_blank" rel="noopener noreferrer"
             class="ext-site-card" style="--sc:${s.color};--sb:${s.bg}">
            <div class="ext-site-name">${s.name}</div>
            <div class="ext-site-type">${typeLabel} İlan</div>
            <div class="ext-site-btn">Ara <i data-lucide="external-link"></i></div>
          </a>
        `).join('')}
      </div>
    </div>
  `;
}

function buildCriteriaSummary(client) {
  const chips = [];
  if (client.preferredDistricts?.length)
    chips.push(...client.preferredDistricts.map(d => `<span class="ext-chip">${d}</span>`));
  if (client.desiredRoomCounts?.length)
    chips.push(...client.desiredRoomCounts.map(r => `<span class="ext-chip">${r}</span>`));
  if (client.budgetMin || client.budgetMax) {
    const min = client.budgetMin ? formatPrice(client.budgetMin) : '';
    const max = client.budgetMax ? formatPrice(client.budgetMax) : '';
    chips.push(`<span class="ext-chip">${min && max ? min + ' – ' + max : min || max}</span>`);
  }
  if (client.desiredMinM2 || client.desiredMaxM2) {
    const min = client.desiredMinM2 || '';
    const max = client.desiredMaxM2 || '';
    chips.push(`<span class="ext-chip">${min}${min && max ? '–' : ''}${max} m²</span>`);
  }
  return chips.join('');
}

function matchCard({ entity, result }) {
  const isClient = mode === 'property';
  const name = isClient
    ? entity.firstName + ' ' + entity.lastName
    : truncate(entity.title, 40);
  const sub = isClient
    ? (entity.phone || '') + (entity.priorityLevel ? ' · ' + entity.priorityLevel : '')
    : [entity.district, entity.roomCount, formatPrice(entity.price)].filter(Boolean).join(' · ');

  const label = scoreLabel(result.overallScore);
  const labelMap = { excellent: TR.matching.excellent, good: TR.matching.good, fair: TR.matching.fair, poor: TR.matching.poor };

  return `
    <div class="match-card card${!isClient ? ' match-card-clickable' : ''}" ${!isClient ? `data-open-property="${entity.id}"` : ''}>
      <div class="match-card-score">
        <svg viewBox="0 0 36 36" class="score-circle">
          <circle class="circle-track" cx="18" cy="18" r="15" />
          <circle class="circle-fill" cx="18" cy="18" r="15"
            stroke="${scoreColor(result.overallScore)}"
            stroke-dasharray="${result.overallScore * 94.2 / 100} 94.2"
            transform="rotate(-90 18 18)" />
        </svg>
        <div class="score-center" style="color:${scoreColor(result.overallScore)}">
          <span class="score-num">${result.overallScore}</span><span class="score-pct">%</span>
        </div>
        <div class="score-label" style="color:${scoreColor(result.overallScore)}">${labelMap[label]||label}</div>
      </div>
      <div class="match-card-body">
        <h4 class="match-entity-name">${name}</h4>
        <div class="match-entity-sub text-muted">${sub}</div>
        <div class="score-breakdown">
          ${Object.entries(result.breakdown).map(([k, v]) => `
            <div class="breakdown-row">
              <span class="breakdown-label">${TR.matching[k]||k}</span>
              <div class="breakdown-bar">
                <div class="breakdown-fill" style="width:${v.score}%;background:${scoreColor(v.score)}"></div>
              </div>
              <span class="breakdown-val">${v.score}%</span>
              <span class="breakdown-weight text-muted">(ağ: ${v.weight}%)</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}
