-- Uruchom to w Supabase SQL Editor
-- https://app.supabase.com → SQL Editor → New Query

create table if not exists deals (
  id                  text primary key,
  title               text not null,
  store               text not null,
  category            text not null check (category in ('Elektronika','Podróże','Odzież','Spożywcze/Drogerie')),
  discount            integer default 0,
  temperature         integer default 0,
  stars               integer default 0 check (stars between 1 and 5),
  reason              text,
  link                text not null,
  status              text default 'Nowy' check (status in ('Nowy','Do publikacji','Opublikowany','Odrzucony')),
  content_hook        text,
  content_caption     text,
  content_caption_en  text,
  content_hashtags    text,
  content_hashtags_en text,
  content_script      text,
  created_at          timestamptz default now()
);

-- Indeksy dla szybkich filtrów
create index if not exists deals_category_idx  on deals(category);
create index if not exists deals_status_idx    on deals(status);
create index if not exists deals_stars_idx     on deals(stars);
create index if not exists deals_created_idx   on deals(created_at desc);

-- Realtime (wymagane do live updates w dashboardzie)
alter publication supabase_realtime add table deals;

-- Row Level Security – wyłącz dla uproszczenia (włącz dla produkcji)
alter table deals disable row level security;
