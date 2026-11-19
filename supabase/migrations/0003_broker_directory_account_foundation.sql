-- Tradefolio Migration 0003: broker directory and trading-account foundation
-- Safe compatibility migration: keeps legacy market values temporarily accepted
-- so the currently deployed application remains functional during the UI rollout.

begin;

-- Canonical market values are introduced while legacy values remain temporarily
-- accepted. A later contract migration will remove legacy values after app rollout.
alter table public.trading_accounts
  drop constraint if exists trading_accounts_market_type_check;
alter table public.trading_accounts
  add constraint trading_accounts_market_type_check
  check (market_type in ('cfd','crypto_futures','forex_cfd','crypto_spot','stocks_indices','other_futures'));

alter table public.trades
  drop constraint if exists trades_market_type_check;
alter table public.trades
  add constraint trades_market_type_check
  check (market_type in ('cfd','crypto_futures','forex_cfd','crypto_spot','stocks_indices','other_futures'));

-- Central broker directory. NULL owner_user_id means a platform-managed record.
-- A non-NULL owner_user_id means a private, user-submitted broker entry.
create table if not exists public.brokers (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete cascade,
  broker_name text not null check (length(btrim(broker_name)) between 1 and 120),
  normalized_name text not null,
  website text,
  country text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_user_id)
);

create unique index if not exists brokers_global_normalized_name_uidx
  on public.brokers (normalized_name)
  where owner_user_id is null;
create unique index if not exists brokers_user_normalized_name_uidx
  on public.brokers (owner_user_id, normalized_name)
  where owner_user_id is not null;
create index if not exists brokers_name_search_idx
  on public.brokers using gin (to_tsvector('simple', broker_name));

-- Initial searchable directory entries. Broker/server connectivity is not implied
-- by presence in this directory; server records are added only when verified.
insert into public.brokers (owner_user_id, broker_name, normalized_name)
values
  (null, 'Valetax', 'valetax'),
  (null, 'Exness', 'exness'),
  (null, 'HFM', 'hfm'),
  (null, 'XM', 'xm'),
  (null, 'IC Markets', 'ic markets'),
  (null, 'Pepperstone', 'pepperstone'),
  (null, 'FP Markets', 'fp markets'),
  (null, 'Octa', 'octa'),
  (null, 'FBS', 'fbs'),
  (null, 'Deriv', 'deriv'),
  (null, 'Binance', 'binance'),
  (null, 'Bybit', 'bybit'),
  (null, 'OKX', 'okx'),
  (null, 'Bitget', 'bitget'),
  (null, 'BingX', 'bingx'),
  (null, 'MEXC', 'mexc'),
  (null, 'Bitunix', 'bitunix'),
  (null, 'KuCoin', 'kucoin'),
  (null, 'Coinbase', 'coinbase')
on conflict (normalized_name) where owner_user_id is null do nothing;

-- A broker can publish multiple servers across different platforms.
-- User-submitted servers remain private to their owner.
create table if not exists public.broker_servers (
  id uuid primary key default gen_random_uuid(),
  broker_id uuid not null references public.brokers(id) on delete cascade,
  owner_user_id uuid references auth.users(id) on delete cascade,
  platform text not null check (length(btrim(platform)) between 1 and 40),
  server_name text not null check (length(btrim(server_name)) between 1 and 160),
  environment text not null default 'unknown'
    check (environment in ('live','demo','unknown')),
  is_verified boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, broker_id),
  constraint broker_servers_owner_matches_broker_fk
    foreign key (broker_id, owner_user_id)
    references public.brokers(id, owner_user_id)
    on delete cascade
);

create unique index if not exists broker_servers_global_identity_uidx
  on public.broker_servers (broker_id, lower(platform), lower(server_name))
  where owner_user_id is null;
create unique index if not exists broker_servers_user_identity_uidx
  on public.broker_servers (owner_user_id, broker_id, lower(platform), lower(server_name))
  where owner_user_id is not null;
create index if not exists broker_servers_search_idx
  on public.broker_servers using gin (to_tsvector('simple', server_name));
create index if not exists broker_servers_broker_platform_idx
  on public.broker_servers (broker_id, platform, is_active);

-- Account identity and directory references. Keep broker_name/server snapshots
-- so historical account labels remain understandable if directory entries change.
alter table public.trading_accounts
  add column if not exists account_number text,
  add column if not exists broker_server text,
  add column if not exists platform text,
  add column if not exists broker_id uuid,
  add column if not exists broker_server_id uuid,
  add column if not exists account_currency_source text not null default 'legacy_default',
  add column if not exists account_currency_status text not null default 'unverified';

alter table public.trading_accounts
  add constraint trading_accounts_broker_fk
  foreign key (broker_id) references public.brokers(id) on delete set null;

alter table public.trading_accounts
  add constraint trading_accounts_broker_server_broker_fk
  foreign key (broker_server_id, broker_id)
  references public.broker_servers(id, broker_id)
  on delete restrict;

alter table public.trading_accounts
  add constraint trading_accounts_currency_format_check
  check (account_currency ~ '^[A-Z]{3}$');

alter table public.trading_accounts
  add constraint trading_accounts_currency_source_check
  check (account_currency_source in ('legacy_default','user_input','broker_sync','exchange_sync'));

alter table public.trading_accounts
  add constraint trading_accounts_currency_status_check
  check (account_currency_status in ('unverified','user_confirmed','broker_verified','exchange_verified'));

-- Existing USD defaults are not evidence that the broker account is USD.
update public.trading_accounts
set account_currency_source = 'legacy_default',
    account_currency_status = 'unverified'
where account_currency_source = 'legacy_default';

-- Canonicalize existing Forex/CFD account market labels without deleting data.
update public.trading_accounts
set market_type = 'cfd'
where market_type = 'forex_cfd';

create index if not exists trading_accounts_broker_id_idx
  on public.trading_accounts (broker_id);
create index if not exists trading_accounts_broker_server_id_idx
  on public.trading_accounts (broker_server_id);

-- updated_at triggers for directory records.
drop trigger if exists brokers_set_updated_at on public.brokers;
create trigger brokers_set_updated_at before update on public.brokers
for each row execute procedure public.set_updated_at();

drop trigger if exists broker_servers_set_updated_at on public.broker_servers;
create trigger broker_servers_set_updated_at before update on public.broker_servers
for each row execute procedure public.set_updated_at();

-- Directory records are readable by authenticated users when platform-managed,
-- or by their owner when user-submitted. Client roles cannot write global records.
alter table public.brokers enable row level security;
alter table public.broker_servers enable row level security;

drop policy if exists brokers_select_visible on public.brokers;
create policy brokers_select_visible on public.brokers
  for select to authenticated
  using (owner_user_id is null or owner_user_id = (select auth.uid()));

drop policy if exists brokers_insert_own on public.brokers;
create policy brokers_insert_own on public.brokers
  for insert to authenticated
  with check (owner_user_id = (select auth.uid()));

drop policy if exists brokers_update_own on public.brokers;
create policy brokers_update_own on public.brokers
  for update to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

drop policy if exists brokers_delete_own on public.brokers;
create policy brokers_delete_own on public.brokers
  for delete to authenticated
  using (owner_user_id = (select auth.uid()));

drop policy if exists broker_servers_select_visible on public.broker_servers;
create policy broker_servers_select_visible on public.broker_servers
  for select to authenticated
  using (owner_user_id is null or owner_user_id = (select auth.uid()));

drop policy if exists broker_servers_insert_own on public.broker_servers;
create policy broker_servers_insert_own on public.broker_servers
  for insert to authenticated
  with check (
    owner_user_id = (select auth.uid())
    and exists (
      select 1 from public.brokers b
      where b.id = broker_id and b.owner_user_id = (select auth.uid())
    )
  );

drop policy if exists broker_servers_update_own on public.broker_servers;
create policy broker_servers_update_own on public.broker_servers
  for update to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (
    owner_user_id = (select auth.uid())
    and exists (
      select 1 from public.brokers b
      where b.id = broker_id and b.owner_user_id = (select auth.uid())
    )
  );

drop policy if exists broker_servers_delete_own on public.broker_servers;
create policy broker_servers_delete_own on public.broker_servers
  for delete to authenticated
  using (owner_user_id = (select auth.uid()));

grant select, insert, update, delete on public.brokers to authenticated;
grant select, insert, update, delete on public.broker_servers to authenticated;

-- Prevent accounts from referencing another user's private broker/server records.
create or replace function public.validate_trading_account_directory_refs()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  broker_owner uuid;
  server_owner uuid;
  server_broker uuid;
begin
  if new.broker_id is not null then
    select b.owner_user_id into broker_owner
    from public.brokers b where b.id = new.broker_id;
    if not found or (broker_owner is not null and broker_owner <> new.user_id) then
      raise exception 'Broker directory entry is not available to this account owner';
    end if;
  end if;

  if new.broker_server_id is not null then
    select bs.owner_user_id, bs.broker_id
      into server_owner, server_broker
    from public.broker_servers bs where bs.id = new.broker_server_id;
    if not found
      or (server_owner is not null and server_owner <> new.user_id)
      or (new.broker_id is not null and server_broker <> new.broker_id) then
      raise exception 'Broker server entry is not available to this account owner';
    end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists trading_accounts_validate_directory_refs on public.trading_accounts;
create trigger trading_accounts_validate_directory_refs
before insert or update of user_id, broker_id, broker_server_id
on public.trading_accounts
for each row execute procedure public.validate_trading_account_directory_refs();

-- No passwords, investor passwords, API keys, API secrets, or passphrases
-- are stored in these directory/account tables. Credential vaulting is a
-- separate security-reviewed integration phase.

commit;
