import { db } from './supabase-client.js';

const SESSION_KEY = 'gm_crm_session';
const SALT = 'gm_crm_v1_salt_x9k';

let usersCache = [];

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + SALT);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ── Supabase init ─────────────────────────────────────────────────────────────

export async function initUsers() {
  const { data, error } = await db.from('users').select('id, data');
  if (error) throw new Error(`Kullanıcılar yüklenemedi: ${error.message}`);
  usersCache = (data || []).map(row => row.data).filter(Boolean);
}

// ── User CRUD ─────────────────────────────────────────────────────────────────

export function getUsers() {
  return usersCache;
}

export function hasAnyUser() {
  return usersCache.length > 0;
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
  const { error } = await db.from('users').insert({ id: admin.id, data: admin });
  if (error) throw new Error(error.message);
  usersCache = [admin];
  return admin;
}

export async function createUser({ username, fullName, password, role, permissions }) {
  if (usersCache.find(u => u.username.toLowerCase() === username.toLowerCase())) {
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
  const { error } = await db.from('users').insert({ id: user.id, data: user });
  if (error) return { success: false, error: error.message };
  usersCache.push(user);
  return { success: true, user };
}

export async function updateUser(id, { fullName, role, permissions, isActive }) {
  const idx = usersCache.findIndex(u => u.id === id);
  if (idx < 0) return { success: false, error: 'Kullanıcı bulunamadı' };
  const updated = { ...usersCache[idx], fullName, role, permissions, isActive };
  const { error } = await db.from('users').update({ data: updated }).eq('id', id);
  if (error) return { success: false, error: error.message };
  usersCache[idx] = updated;
  return { success: true };
}

export async function changePassword(id, newPassword) {
  const idx = usersCache.findIndex(u => u.id === id);
  if (idx < 0) return { success: false, error: 'Kullanıcı bulunamadı' };
  const updated = { ...usersCache[idx], passwordHash: await hashPassword(newPassword) };
  const { error } = await db.from('users').update({ data: updated }).eq('id', id);
  if (error) return { success: false, error: error.message };
  usersCache[idx] = updated;
  return { success: true };
}

export async function deleteUser(id) {
  const { error } = await db.from('users').delete().eq('id', id);
  if (!error) usersCache = usersCache.filter(u => u.id !== id);
}

// ── Session ───────────────────────────────────────────────────────────────────

export function getSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch { return null; }
}

function saveSession(session) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function isGuest() {
  return false;
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

export function logout() {
  clearSession();
}

export async function login(username, password) {
  const user = usersCache.find(
    u => u.username.toLowerCase() === username.toLowerCase() && u.isActive !== false
  );
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

// ── Permissions ───────────────────────────────────────────────────────────────

export function hasPermission(module, action) {
  const s = getSession();
  if (!s) return false;
  if (s.role === 'admin') return true;
  return s.permissions?.[module]?.[action] === true;
}

export function isOwnOnly(module) {
  const s = getSession();
  if (!s || s.role === 'admin') return false;
  return s.permissions?.[module]?.ownOnly === true;
}

export function hasFieldPermission(module, field) {
  const s = getSession();
  if (!s) return false;
  if (s.role === 'admin') return true;
  const fields = s.permissions?.[module]?.fields;
  if (!fields) return true;
  return fields[field] !== false;
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
