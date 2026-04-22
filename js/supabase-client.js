// Supabase proje bilgilerini buraya girin:
// Supabase Dashboard → Project Settings → API
const SUPABASE_URL = 'https://sdckfnwkdzfhqdnitjhy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkY2tmbndrZHpmaHFkbml0amh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NDEwNzcsImV4cCI6MjA5MjQxNzA3N30.XAe29YWJzuqLhPEQdipCHsXov69MZnKx4HuvqlaJ8uE';

if (
  SUPABASE_URL === 'SUPABASE_URL_BURAYA' ||
  SUPABASE_ANON_KEY === 'SUPABASE_ANON_KEY_BURAYA'
) {
  throw new Error('Supabase yapılandırılmamış. js/supabase-client.js dosyasını doldurun.');
}

export const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
