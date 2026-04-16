const KEYS = {
  properties: 'gm_crm_properties',
  clients: 'gm_crm_clients',
  reminders: 'gm_crm_reminders',
  settings: 'gm_crm_settings',
  activity: 'gm_crm_activity',
};

export function getAll(key) {
  try {
    return JSON.parse(localStorage.getItem(KEYS[key]) || '[]');
  } catch { return []; }
}

export function saveAll(key, data) {
  localStorage.setItem(KEYS[key], JSON.stringify(data));
}

export function getSettings() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.settings) || 'null') || defaultSettings();
  } catch { return defaultSettings(); }
}

export function saveSettings(s) {
  localStorage.setItem(KEYS.settings, JSON.stringify(s));
}

function defaultSettings() {
  return {
    theme: 'dark',
    defaultWeights: { budget: 40, location: 30, squareMeters: 15, roomCount: 10, features: 5 },
  };
}

export function getStorageUsagePct() {
  try {
    let total = 0;
    for (const k of Object.values(KEYS)) {
      const v = localStorage.getItem(k);
      if (v) total += v.length;
    }
    // Assume 5MB limit
    return Math.round((total / (5 * 1024 * 1024)) * 100);
  } catch { return 0; }
}

// Full backup export
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

// Full backup import
export function importBackup(data) {
  if (!data || data.version !== 1) throw new Error('invalid');
  saveAll('properties', data.properties || []);
  saveAll('clients', data.clients || []);
  saveAll('reminders', data.reminders || []);
  if (data.settings) saveSettings(data.settings);
}

// Activity log
export function logActivity(type, title, id) {
  const log = getAll('activity');
  log.unshift({ type, title, id, date: new Date().toISOString() });
  saveAll('activity', log.slice(0, 50));
}
