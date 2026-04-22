-- GayriMenkul CRM — Supabase Tablo Kurulumu
-- Supabase Dashboard > SQL Editor'da çalıştırın

create table if not exists users (
  id   text primary key,
  data jsonb not null default '{}'
);

create table if not exists properties (
  id   text primary key,
  data jsonb not null default '{}'
);

create table if not exists clients (
  id   text primary key,
  data jsonb not null default '{}'
);

create table if not exists reminders (
  id   text primary key,
  data jsonb not null default '{}'
);

create table if not exists activity (
  id   text primary key,
  data jsonb not null default '{}'
);

create table if not exists app_settings (
  id   text primary key,
  data jsonb not null default '{}'
);

-- Row Level Security: anon key ile tam erişim
alter table users        enable row level security;
alter table properties   enable row level security;
alter table clients      enable row level security;
alter table reminders    enable row level security;
alter table activity     enable row level security;
alter table app_settings enable row level security;

create policy "anon_all" on users        for all to anon using (true) with check (true);
create policy "anon_all" on properties   for all to anon using (true) with check (true);
create policy "anon_all" on clients      for all to anon using (true) with check (true);
create policy "anon_all" on reminders    for all to anon using (true) with check (true);
create policy "anon_all" on activity     for all to anon using (true) with check (true);
create policy "anon_all" on app_settings for all to anon using (true) with check (true);
