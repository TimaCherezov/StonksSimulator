-- ==============================================
-- StonksSimulator — Database Schema
-- ==============================================

-- ──────────────────────────────────────────────
-- PROFILES
-- Расширяет auth.users, хранит игровой баланс
-- ──────────────────────────────────────────────
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text not null unique,
  balance    numeric(15, 2) not null default 100000.00,
  created_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- PORTFOLIO
-- Текущие открытые позиции пользователя
-- ──────────────────────────────────────────────
create table portfolio (
  id            bigint primary key generated always as identity,
  user_id       uuid not null references profiles(id) on delete cascade,
  ticker        text not null,
  quantity      integer not null check (quantity > 0),
  avg_buy_price numeric(15, 2) not null check (avg_buy_price > 0),
  updated_at    timestamptz not null default now(),

  unique (user_id, ticker)
);

-- ──────────────────────────────────────────────
-- TRANSACTIONS
-- История всех сделок (покупка / продажа)
-- ──────────────────────────────────────────────
create type transaction_type as enum ('buy', 'sell');

create table transactions (
  id           bigint primary key generated always as identity,
  user_id      uuid not null references profiles(id) on delete cascade,
  ticker       text not null,
  type         transaction_type not null,
  quantity     integer not null check (quantity > 0),
  price        numeric(15, 2) not null check (price > 0),
  total_amount numeric(15, 2) not null,
  created_at   timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- PORTFOLIO SNAPSHOTS
-- Снимки стоимости портфеля — для графика роста
-- ──────────────────────────────────────────────
create table portfolio_snapshots (
  id          bigint primary key generated always as identity,
  user_id     uuid not null references profiles(id) on delete cascade,
  total_value numeric(15, 2) not null,
  recorded_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- WATCHLIST
-- Список акций "под наблюдением"
-- ──────────────────────────────────────────────
create table watchlist (
  id       bigint primary key generated always as identity,
  user_id  uuid not null references profiles(id) on delete cascade,
  ticker   text not null,
  added_at timestamptz not null default now(),

  unique (user_id, ticker)
);

-- ──────────────────────────────────────────────
-- INDEXES
-- ──────────────────────────────────────────────
create index on portfolio (user_id);
create index on transactions (user_id);
create index on transactions (created_at desc);
create index on portfolio_snapshots (user_id, recorded_at desc);
create index on watchlist (user_id);

-- ──────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- Каждый пользователь видит только свои данные
-- ──────────────────────────────────────────────
alter table profiles            enable row level security;
alter table portfolio           enable row level security;
alter table transactions        enable row level security;
alter table portfolio_snapshots enable row level security;
alter table watchlist           enable row level security;

create policy "own profile"      on profiles            for all using (auth.uid() = id);
create policy "own portfolio"    on portfolio           for all using (auth.uid() = user_id);
create policy "own transactions" on transactions        for all using (auth.uid() = user_id);
create policy "own snapshots"    on portfolio_snapshots for all using (auth.uid() = user_id);
create policy "own watchlist"    on watchlist           for all using (auth.uid() = user_id);

-- ──────────────────────────────────────────────
-- TRIGGER: auto-create profile on signup
-- ──────────────────────────────────────────────
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
