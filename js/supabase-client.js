// Supabase proje bilgilerini buraya girin:
// Supabase Dashboard → Project Settings → API
const SUPABASE_URL = 'SUPABASE_URL_BURAYA';
const SUPABASE_ANON_KEY = 'SUPABASE_ANON_KEY_BURAYA';

if (
  SUPABASE_URL === 'SUPABASE_URL_BURAYA' ||
  SUPABASE_ANON_KEY === 'SUPABASE_ANON_KEY_BURAYA'
) {
  throw new Error('Supabase yapılandırılmamış. js/supabase-client.js dosyasını doldurun.');
}

export const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
