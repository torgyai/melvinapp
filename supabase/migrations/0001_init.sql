-- Krik je energielabel op — platform schema.

create extension if not exists "pgcrypto";

create table if not exists profiles (
  id            text primary key,
  name          text not null,
  role          text not null check (role in ('admin','adviseur','administratie')),
  email         text not null,
  phone         text,
  avatar_color  text not null default '#057a77',
  avatar_url    text,
  created_at    timestamptz not null default now()
);

create table if not exists properties (
  id            text primary key,
  address       text not null,
  city          text not null,
  postcode      text,
  lat           double precision,
  lon           double precision,
  type          text not null,
  year          int,
  photo_count   int not null default 0,
  label         text check (label in ('A','B','C','D','E','F','G')),
  energy_index  numeric(5,2),
  lifecycle     text not null check (lifecycle in ('wait','progress','ready','done','interactive')),
  fixed_mode    text check (fixed_mode in ('both','plattegrond','label')),
  assigned_to   text references profiles(id) on delete set null,
  owner_id      text,
  owner_name    text,
  meetrapport   jsonb,
  signoff       jsonb,
  floors        jsonb not null default '[]'::jsonb,
  runtime       jsonb,
  lead          jsonb,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists properties_city_idx on properties (city);
create index if not exists properties_lifecycle_idx on properties (lifecycle);
create index if not exists properties_assigned_idx on properties (assigned_to);
create index if not exists properties_owner_idx on properties (owner_id);

create table if not exists tasks (
  id           text primary key,
  title        text not null,
  assigned_to  text references profiles(id) on delete set null,
  due          text,
  done         boolean not null default false,
  created_at   timestamptz not null default now()
);

create table if not exists notes (
  id           text primary key,
  property_id  text not null references properties(id) on delete cascade,
  author_id    text references profiles(id) on delete set null,
  author       text not null,
  text         text not null,
  ts           text not null,
  created_at   timestamptz not null default now()
);

create index if not exists notes_property_idx on notes (property_id, created_at);

create table if not exists emails (
  id            text primary key,
  from_name     text not null,
  from_email    text not null,
  subject       text not null,
  date          text not null,
  category      text not null check (category in ('aanvraag','intern','systeem')),
  assigned_to   text references profiles(id) on delete set null,
  answered      boolean not null default false,
  read          boolean not null default false,
  body          text not null,
  forwarded_to  text,
  forwarded_at  text,
  created_at    timestamptz not null default now()
);

create table if not exists sent_emails (
  id          text primary key,
  type        text not null check (type in ('forward','new','reply')),
  to_email    text not null,
  to_name     text not null,
  subject     text not null,
  body        text not null,
  date        text not null,
  related_id  text,
  created_at  timestamptz not null default now()
);

-- Phone capture ------------------------------------------------------------

create table if not exists capture_sessions (
  id           uuid primary key default gen_random_uuid(),
  token        text not null unique,
  property_id  text not null references properties(id) on delete cascade,
  created_by   text references profiles(id) on delete set null,
  status       text not null default 'open'
               check (status in ('open','capturing','uploaded','processing','processed','failed')),
  method       text check (method in ('ar','manual','lidar','import')),
  rooms        jsonb not null default '[]'::jsonb,
  device_info  jsonb,
  processed_at timestamptz,
  error        text,
  created_at   timestamptz not null default now()
);

create index if not exists capture_property_idx on capture_sessions (property_id, created_at desc);

create table if not exists capture_photos (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid not null references capture_sessions(id) on delete cascade,
  room_client_id text,
  kind           text not null default 'ruimte'
                 check (kind in ('ruimte','voorgevel','installatie','meterkast','detail')),
  storage_path   text,
  width          int,
  height         int,
  taken_at       timestamptz not null default now()
);

create index if not exists capture_photos_session_idx on capture_photos (session_id);

-- Storage bucket for the raw capture media.
insert into storage.buckets (id, name, public)
values ('captures', 'captures', false)
on conflict (id) do nothing;

-- Row level security -------------------------------------------------------
-- The platform talks to Postgres with the service role from server components
-- and route handlers, so the tables stay closed to anonymous clients. The one
-- exception is the capture link, which a phone opens without a login: that goes
-- through a route handler that checks the token, never straight from the browser.

alter table profiles          enable row level security;
alter table properties        enable row level security;
alter table tasks             enable row level security;
alter table notes             enable row level security;
alter table emails            enable row level security;
alter table sent_emails       enable row level security;
alter table capture_sessions  enable row level security;
alter table capture_photos    enable row level security;

do $$
declare t text;
begin
  foreach t in array array['profiles','properties','tasks','notes','emails','sent_emails','capture_sessions','capture_photos']
  loop
    execute format(
      'create policy %I on %I for all to authenticated using (true) with check (true)',
      t || '_authenticated_all', t);
  end loop;
end $$;

-- updated_at ---------------------------------------------------------------

create or replace function touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end $$ language plpgsql;

drop trigger if exists properties_touch on properties;
create trigger properties_touch before update on properties
for each row execute function touch_updated_at();
