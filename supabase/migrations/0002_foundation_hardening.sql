-- Tradefolio Phase 1 hardening: profile lifecycle, timestamps, and history protection
begin;

-- Keep user profiles in sync with Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill profiles for users who registered before this migration.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- Maintain updated_at consistently on every editable core table.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists trading_accounts_set_updated_at on public.trading_accounts;
create trigger trading_accounts_set_updated_at before update on public.trading_accounts
for each row execute procedure public.set_updated_at();

drop trigger if exists strategies_set_updated_at on public.strategies;
create trigger strategies_set_updated_at before update on public.strategies
for each row execute procedure public.set_updated_at();

drop trigger if exists trades_set_updated_at on public.trades;
create trigger trades_set_updated_at before update on public.trades
for each row execute procedure public.set_updated_at();

drop trigger if exists trade_reviews_set_updated_at on public.trade_reviews;
create trigger trade_reviews_set_updated_at before update on public.trade_reviews
for each row execute procedure public.set_updated_at();

-- Never cascade-delete a user's trade history when an account is removed.
-- Accounts with trade history must be archived (is_active = false) instead.
alter table public.trades
  drop constraint if exists trades_account_owner_fk;
alter table public.trades
  add constraint trades_account_owner_fk
  foreign key (trading_account_id, user_id)
  references public.trading_accounts(id, user_id)
  on delete restrict;

-- Supporting indexes for user-scoped execution and review queries.
create index if not exists trade_executions_user_time_idx
  on public.trade_executions(user_id, executed_at desc);
create index if not exists trade_reviews_trade_id_idx
  on public.trade_reviews(trade_id);

commit;
