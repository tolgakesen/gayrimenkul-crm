import { db } from './supabase-client.js';

const TABLES = ['properties', 'clients', 'reminders', 'activity'];

const cache = {
  properties: [],
  clients: [],
  reminders: [],
  activity: [],
  settings: null,
};

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export async function initStorage() {
  const results = await Promise.all(
    TABLES.map(t => db.from(t).select('id, data'))
  );
  TABLES.forEach((key, i) => {
    const { data, error } = results[i];
    if (error) throw new Error(`"${key}" tablosu yüklenemedi: ${error.message}`);
    cache[key] = (data || []).map(row => row.data).filter(Boolean);
  });

  const { data: sd, error: se } = await db
    .from('app_settings').select('data').eq('id', 'global').maybeSingle();
  if (se) throw new Error(`Ayarlar yüklenemedi: ${se.message}`);
  cache.settings = sd?.data || null;
}

export function getAll(key) {
  return cache[key] || [];
}

export function saveAll(key, arr) {
  if (!TABLES.includes(key)) return;

  const oldIds = new Set((cache[key] || []).map(x => x.id).filter(Boolean));
  const newIds = new Set(arr.map(x => x.id).filter(Boolean));
  cache[key] = [...arr];

  if (arr.length > 0) {
    db.from(key)
      .upsert(arr.map(item => ({ id: item.id, data: item })))
      .then(({ error }) => { if (error) console.error('Upsert hatası:', key, error); });
  }

  const removed = [...oldIds].filter(id => !newIds.has(id));
  if (removed.length > 0) {
    db.from(key).delete().in('id', removed)
      .then(({ error }) => { if (error) console.error('Silme hatası:', key, error); });
  }
}

export function getSettings() {
  return cache.settings || defaultSettings();
}

export function saveSettings(s) {
  cache.settings = s;
  db.from('app_settings').upsert({ id: 'global', data: s })
    .then(({ error }) => { if (error) console.error('Ayar kayıt hatası:', error); });
}

function defaultSettings() {
  return {
    theme: 'dark',
    defaultWeights: { budget: 40, location: 30, squareMeters: 15, roomCount: 10, features: 5 },
  };
}

export function getStorageUsagePct() {
  return 0;
}

export function exportBackup() {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    properties: getAll('properties'),
    clients: getAll('clients'),
    reminders: getAll('reminders'),
    settings: getSettings(),
  };
}

export function importBackup(data) {
  if (!data || data.version !== 1) throw new Error('invalid');
  saveAll('properties', data.properties || []);
  saveAll('clients', data.clients || []);
  saveAll('reminders', data.reminders || []);
  if (data.settings) saveSettings(data.settings);
}

export function logActivity(type, title, entityId) {
  const entry = { id: uid(), type, title, entityId, date: new Date().toISOString() };
  cache.activity = [entry, ...cache.activity].slice(0, 50);
  db.from('activity').upsert({ id: entry.id, data: entry })
    .then(({ error }) => { if (error) console.error('Aktivite kayıt hatası:', error); });
}
