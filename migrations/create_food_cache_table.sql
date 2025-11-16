-- Food Cache Table for Barcode Nutrition Lookup
-- Caches product data from Open Food Facts to reduce API calls
-- Updated: 2025-01-07

create table if not exists public.food_cache (
  barcode text primary key,
  product_name text,
  brand text,
  serving_grams numeric,
  kcal_per_100g numeric,
  protein_g_per_100g numeric,
  carbs_g_per_100g numeric,
  fat_g_per_100g numeric,
  raw jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Index for cache expiry queries
create index if not exists food_cache_updated_idx on public.food_cache(updated_at desc);

-- RLS: read for authenticated users, no direct client writes (server-only via service key)
alter table public.food_cache enable row level security;

create policy "food_cache_select_authenticated"
  on public.food_cache for select
  to authenticated
  using (true);

-- Comment
comment on table public.food_cache is 'Cached nutrition data from Open Food Facts API, expires after 30 days';
