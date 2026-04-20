import { TR } from '../i18n.js';
import { getAll } from '../storage.js';
import { formatPrice, truncate } from '../utils.js';
import { hasPermission } from '../auth.js';
import { getSettings as getAppSettings } from '../storage.js';

let mapInstance = null;

export function renderMapView(container) {
  if (!hasPermission('map','view')) {
    container.innerHTML = `<div class="error-state"><i data-lucide="shield-off"></i><p>Bu sayfaya erişim yetkiniz yok.</p></div>`;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  if (!window.L) {
    container.innerHTML = `<div class="error-state"><i data-lucide="map-off"></i><p>Harita kütüphanesi yüklenemedi. Sayfayı yenileyin.</p></div>`;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  const properties = getAll('properties');
  const withCoords = properties.filter(p => p.lat && p.lon);

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">${TR.map.title}</h1>
      <a href="#/properties" class="btn btn-ghost"><i data-lucide="list"></i> Listeye Dön</a>
    </div>
    <div class="toolbar" style="margin-bottom:.75rem">
      <select class="select-input" id="map-filter-status">
        <option value="">Tüm Durumlar</option>
        <option value="active">Aktif</option>
        <option value="sold">Satıldı</option>
        <option value="rented">Kiralandı</option>
        <option value="withdrawn">Çekildi</option>
      </select>
      <select class="select-input" id="map-filter-type">
        <option value="">Tüm Tipler</option>
        <option value="sale">Satılık</option>
        <option value="rent">Kiralık</option>
      </select>
      <span class="map-coords-hint text-muted" style="font-size:.8rem;margin-left:auto">
        <i data-lucide="info" style="width:14px;height:14px;vertical-align:middle"></i>
        ${withCoords.length}/${properties.length} ilanın koordinatı var
      </span>
    </div>
    <div id="property-map"></div>
    ${withCoords.length === 0 ? `<div class="empty-state" style="margin-top:1rem"><i data-lucide="map-pin-off"></i><p>${TR.map.noProperties}</p><p class="text-muted" style="font-size:.85rem">${TR.map.addCoords}</p></div>` : ''}
  `;

  if (window.lucide) window.lucide.createIcons();

  initMap(properties);

  document.getElementById('map-filter-status').addEventListener('change', () => refreshMarkers(properties));
  document.getElementById('map-filter-type').addEventListener('change', () => refreshMarkers(properties));
}

function initMap(allProperties) {
  if (mapInstance) { try { mapInstance.remove(); } catch {} mapInstance = null; }

  const mapEl = document.getElementById('property-map');
  if (!mapEl) return;

  const isDark = getAppSettings().theme === 'dark';
  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
  const tileAttr = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';

  mapInstance = window.L.map('property-map', { zoomControl: true }).setView([39.9, 32.8], 6);
  window.L.tileLayer(tileUrl, { attribution: tileAttr, subdomains: 'abcd', maxZoom: 19 }).addTo(mapInstance);

  refreshMarkers(allProperties);
}

function refreshMarkers(allProperties) {
  if (!mapInstance) return;

  const statusFilter = document.getElementById('map-filter-status')?.value || '';
  const typeFilter = document.getElementById('map-filter-type')?.value || '';

  // Remove existing markers layer
  mapInstance.eachLayer(layer => {
    if (layer._isPropertyMarker) mapInstance.removeLayer(layer);
  });

  const STATUS_COLORS = { active: '#22c55e', sold: '#0ea5e9', rented: '#f59e0b', withdrawn: '#6b7280' };
  const STATUS_LABELS = { active: 'Aktif', sold: 'Satıldı', rented: 'Kiralandı', withdrawn: 'Çekildi' };

  let filtered = allProperties.filter(p => p.lat && p.lon);
  if (statusFilter) filtered = filtered.filter(p => p.status === statusFilter);
  if (typeFilter) filtered = filtered.filter(p => p.listingType === typeFilter);

  const bounds = [];

  filtered.forEach(p => {
    const color = STATUS_COLORS[p.status] || '#6b7280';
    const icon = window.L.divIcon({
      className: '',
      html: `<div class="map-pin-marker" style="background:${color}"><span>${p.listingType === 'rent' ? 'K' : 'S'}</span></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    const marker = window.L.marker([p.lat, p.lon], { icon });
    marker._isPropertyMarker = true;

    const popup = window.L.popup({ maxWidth: 220 }).setContent(`
      <div class="map-popup">
        <strong>${truncate(p.title, 35)}</strong>
        <div>${p.district||''}${p.neighborhood ? ', '+p.neighborhood : ''}</div>
        <div style="margin:.25rem 0"><span class="map-popup-badge" style="background:${color}">${STATUS_LABELS[p.status]||p.status}</span></div>
        <div style="font-weight:600;font-size:.9rem">${formatPrice(p.price)}</div>
        ${p.roomCount ? `<div>${p.roomCount} · ${p.squareMeters||'?'} m²</div>` : ''}
      </div>
    `);

    marker.bindPopup(popup).addTo(mapInstance);
    bounds.push([p.lat, p.lon]);
  });

  if (bounds.length > 0) {
    try { mapInstance.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 }); } catch {}
  }
}
