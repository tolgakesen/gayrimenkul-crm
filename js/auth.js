const USERS_KEY = 'gm_crm_users';
const SESSION_KEY = 'gm_crm_session';
const SALT = 'gm_crm_v1_salt_x9k';

const GUEST_SESSION = {
  userId: 'guest',
  username: 'guest',
  fullName: 'Misafir',
  role: 'guest',
  permissions: {},
};

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + SALT);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function getUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); } catch { return []; }
}

export function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function hasAnyUser() {
  return getUsers().length > 0;
}

export function getSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch { return null; }
}

function saveSession(session) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function startGuestSession() {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(GUEST_SESSION));
}

export function isGuest() {
  return getSession()?.role === 'guest';
}

export function isLoggedIn() {
  return !!getSession();
}

export function isAdmin() {
  return getSession()?.role === 'admin';
}

export function getCurrentUser() {
  return getSession();
}

export function hasPermission(module, action) {
  const s = getSession();
  if (!s) return false;
  if (s.role === 'admin') return true;
  if (s.role === 'guest') return action === 'view';
  return s.permissions?.[module]?.[action] === true;
}

export function isOwnOnly(module) {
  const s = getSession();
  if (!s || s.role === 'admin' || s.role === 'guest') return false;
  return s.permissions?.[module]?.ownOnly === true;
}

export function hasFieldPermission(module, field) {
  const s = getSession();
  if (!s) return false;
  if (s.role === 'admin' || s.role === 'guest') return true;
  const fields = s.permissions?.[module]?.fields;
  if (!fields) return true;
  return fields[field] !== false;
}

export function cleanupNonAdminUsers() {
  const users = getUsers();
  const adminOnly = users.filter(u => u.username.toLowerCase() === 'admin');
  if (adminOnly.length < users.length) saveUsers(adminOnly);
}

export async function login(username, password) {
  const users = getUsers();
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.isActive !== false);
  if (!user) return { success: false, error: 'Kullanıcı adı veya şifre hatalı' };
  const hash = await hashPassword(password);
  if (hash !== user.passwordHash) return { success: false, error: 'Kullanıcı adı veya şifre hatalı' };
  const session = {
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    permissions: user.permissions || {},
    loginAt: new Date().toISOString(),
  };
  saveSession(session);
  return { success: true, session };
}

export function logout() {
  clearSession();
}

export async function setupAdmin(username, fullName, password) {
  const hash = await hashPassword(password);
  const admin = {
    id: 'admin-' + uid(),
    username,
    fullName,
    passwordHash: hash,
    role: 'admin',
    permissions: {},
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  saveUsers([admin]);
  return admin;
}

export async function createUser({ username, fullName, password, role, permissions }) {
  const users = getUsers();
  if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
    return { success: false, error: 'Bu kullanıcı adı zaten kullanılıyor' };
  }
  const hash = await hashPassword(password);
  const user = {
    id: 'user-' + uid(),
    username,
    fullName,
    passwordHash: hash,
    role: role || 'consultant',
    permissions: permissions || defaultPermissions(),
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  saveUsers(users);
  return { success: true, user };
}

export async function updateUser(id, { fullName, role, permissions, isActive }) {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx < 0) return { success: false, error: 'Kullanıcı bulunamadı' };
  users[idx] = { ...users[idx], fullName, role, permissions, isActive };
  saveUsers(users);
  return { success: true };
}

export async function changePassword(id, newPassword) {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx < 0) return { success: false, error: 'Kullanıcı bulunamadı' };
  users[idx].passwordHash = await hashPassword(newPassword);
  saveUsers(users);
  return { success: true };
}

export function deleteUser(id) {
  saveUsers(getUsers().filter(u => u.id !== id));
}

export function defaultPermissions() {
  return {
    properties: { view: true, add: true, edit: true, delete: false, ownOnly: false, fields: { price: true, ownerInfo: true, notes: true } },
    clients: { view: true, add: true, edit: true, delete: false, ownOnly: false, fields: { phone: true, email: true, budget: true, notes: true } },
    reminders: { view: true, add: true, edit: true, delete: false },
    matching: { view: true },
    pipeline: { view: true },
    calendar: { view: true },
    map: { view: true },
    reports: { view: false },
    settings: { view: false },
    holidays: { view: false },
  };
}

export const PERMISSION_LABELS = {
  properties: {
    label: 'İlanlar',
    actions: { view: 'Görüntüle', add: 'Ekle', edit: 'Düzenle', delete: 'Sil' },
    hasOwnOnly: true,
    fields: { price: 'Fiyat', ownerInfo: 'Mal Sahibi Bilgileri', notes: 'Notlar' },
  },
  clients: {
    label: 'Müşteriler',
    actions: { view: 'Görüntüle', add: 'Ekle', edit: 'Düzenle', delete: 'Sil' },
    hasOwnOnly: true,
    fields: { phone: 'Telefon', email: 'E-posta', budget: 'Bütçe', notes: 'Notlar' },
  },
  reminders: { label: 'Hatırlatıcılar', actions: { view: 'Görüntüle', add: 'Ekle', edit: 'Düzenle', delete: 'Sil' } },
  matching: { label: 'Eşleştirme', actions: { view: 'Görüntüle' } },
  pipeline: { label: 'Satış Hunisi', actions: { view: 'Görüntüle' } },
  calendar: { label: 'Takvim', actions: { view: 'Görüntüle' } },
  map: { label: 'Harita', actions: { view: 'Görüntüle' } },
  reports: { label: 'Raporlar', actions: { view: 'Görüntüle' } },
  settings: { label: 'Ayarlar', actions: { view: 'Görüntüle' } },
  holidays: { label: 'Özel Günler', actions: { view: 'Görüntüle' } },
};
