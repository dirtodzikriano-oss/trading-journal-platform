-- Trading Journal: Phase 1 database foundation
-- Apply in Supabase SQL Editor. This migration is intentionally limited to core journal data.
-- Security model: every user-owned row carries user_id; RLS policies enforce ownership.

begin;

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trading_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_name text not null,
  market_type text not null check (market_type in ('forex_cfd','crypto_futures','crypto_spot','stocks_indices','other_futures')),
  broker_name text,
  account_currency text not null default 'USD',
  account_timezone text not null default 'UTC',
  account_mode text not null default 'live' check (account_mode in ('live','demo','forward_test')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table if not exists public.strategies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  strategy_name text not null,
  strategy_category text not null default 'custom',
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, strategy_name)
);

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trading_account_id uuid not null,
  strategy_id uuid,
  instrument text not null,
  market_type text not null check (market_type in ('forex_cfd','crypto_futures','crypto_spot','stocks_indices','other_futures')),
  direction text not null check (direction in ('long','short')),
  status text not null default 'closed' check (status in ('open','closed','cancelled')),
  source_type text not null default 'manual' check (source_type in ('manual','imported')),
  opened_at timestamptz not null,
  closed_at timestamptz,
  average_entry_price numeric(28,12),
  average_exit_price numeric(28,12),
  volume numeric(28,12),
  gross_pnl numeric(28,12),
  commission numeric(28,12) not null default 0,
  swap numeric(28,12) not null default 0,
  other_fees numeric(28,12) not null default 0,
  net_pnl numeric(28,12),
  pnl_currency text not null default 'USD',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trades_account_owner_fk foreign key (trading_account_id, user_id)
    references public.trading_accounts(id, user_id) on delete cascade,
  constraint trades_strategy_owner_fk foreign key (strategy_id, user_id)
    references public.strategies(id, user_id) on delete restrict,
  check (closed_at is null or closed_at >= opened_at)
);

create table if not exists public.trade_executions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trade_id uuid not null,
  execution_type text not null check (execution_type in ('entry','exit','fee','funding','adjustment')),
  executed_at timestamptz not null,
  side text check (side in ('buy','sell')),
  price numeric(28,12),
  quantity numeric(28,12),
  fee_amount numeric(28,12),
  fee_currency text,
  external_execution_id text,
  raw_data jsonb,
  created_at timestamptz not null default now(),
  constraint executions_trade_owner_fk foreign key (trade_id, user_id)
    references public.trades(id, user_id) on delete cascade
);

create table if not exists public.trade_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trade_id uuid not null,
  rating text check (rating in ('A','B','C','D','F')),
  mistakes text[] not null default '{}',
  emotions_before text,
  emotions_during text,
  emotions_after text,
  lessons_learned text,
  review_notes text,
  reviewed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviews_trade_owner_fk foreign key (trade_id, user_id)
    references public.trades(id, user_id) on delete cascade,
  unique (trade_id, user_id)
);

create index if not exists trading_accounts_user_id_idx on public.trading_accounts(user_id);
create index if not exists strategies_user_id_idx on public.strategies(user_id);
create index if not exists trades_user_opened_idx on public.trades(user_id, opened_at desc);
create index if not exists trades_account_opened_idx on public.trades(trading_account_id, opened_at desc);
create index if not exists trade_executions_trade_time_idx on public.trade_executions(trade_id, executed_at);
create index if not exists trade_reviews_user_reviewed_idx on public.trade_reviews(user_id, reviewed_at desc);

-- Enable RLS on every user-facing table in this phase.
alter table public.profiles enable row level security;
alter table public.trading_accounts enable row level security;
alter table public.strategies enable row level security;
alter table public.trades enable row level security;
alter table public.trade_executions enable row level security;
alter table public.trade_reviews enable row level security;

-- Profiles: a user can read and update only their own profile.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Trading accounts.
drop policy if exists "accounts_select_own" on public.trading_accounts;
create policy "accounts_select_own" on public.trading_accounts
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "accounts_insert_own" on public.trading_accounts;
create policy "accounts_insert_own" on public.trading_accounts
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "accounts_update_own" on public.trading_accounts;
create policy "accounts_update_own" on public.trading_accounts
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "accounts_delete_own" on public.trading_accounts;
create policy "accounts_delete_own" on public.trading_accounts
  for delete to authenticated using (user_id = (select auth.uid()));

-- Strategies.
drop policy if exists "strategies_select_own" on public.strategies;
create policy "strategies_select_own" on public.strategies
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "strategies_insert_own" on public.strategies;
create policy "strategies_insert_own" on public.strategies
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "strategies_update_own" on public.strategies;
create policy "strategies_update_own" on public.strategies
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "strategies_delete_own" on public.strategies;
create policy "strategies_delete_own" on public.strategies
  for delete to authenticated using (user_id = (select auth.uid()));

-- Trades.
drop policy if exists "trades_select_own" on public.trades;
create policy "trades_select_own" on public.trades
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "trades_insert_own" on public.trades;
create policy "trades_insert_own" on public.trades
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "trades_update_own" on public.trades;
create policy "trades_update_own" on public.trades
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "trades_delete_own" on public.trades;
create policy "trades_delete_own" on public.trades
  for delete to authenticated using (user_id = (select auth.uid()));

-- Executions.
drop policy if exists "executions_select_own" on public.trade_executions;
create policy "executions_select_own" on public.trade_executions
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "executions_insert_own" on public.trade_executions;
create policy "executions_insert_own" on public.trade_executions
  for insert to authenticated with check (
    user_id = (select auth.uid()) and exists (
      select 1 from public.trades t where t.id = trade_id and t.user_id = (select auth.uid())
    )
  );
drop policy if exists "executions_update_own" on public.trade_executions;
create policy "executions_update_own" on public.trade_executions
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
drop policy if exists "executions_delete_own" on public.trade_executions;
create policy "executions_delete_own" on public.trade_executions
  for delete to authenticated using (user_id = (select auth.uid()));

-- Trade reviews.
drop policy if exists "reviews_select_own" on public.trade_reviews;
create policy "reviews_select_own" on public.trade_reviews
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "reviews_insert_own" on public.trade_reviews;
create policy "reviews_insert_own" on public.trade_reviews
  for insert to authenticated with check (
    user_id = (select auth.uid()) and exists (
      select 1 from public.trades t where t.id = trade_id and t.user_id = (select auth.uid())
    )
  );
drop policy if exists "reviews_update_own" on public.trade_reviews;
create policy "reviews_update_own" on public.trade_reviews
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
drop policy if exists "reviews_delete_own" on public.trade_reviews;
create policy "reviews_delete_own" on public.trade_reviews
  for delete to authenticated using (user_id = (select auth.uid()));

-- Explicit grants: API roles receive only the table operations intended above.
grant usage on schema public to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.trading_accounts to authenticated;
grant select, insert, update, delete on public.strategies to authenticated;
grant select, insert, update, delete on public.trades to authenticated;
grant select, insert, update, delete on public.trade_executions to authenticated;
grant select, insert, update, delete on public.trade_reviews to authenticated;

commit;
