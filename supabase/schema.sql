-- Supabase SQL Editor에서 한 번 실행하세요.
create extension if not exists pgcrypto;

create table if not exists public.repair_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (length(name) between 1 and 80),
  phone text not null check (length(phone) between 7 and 30),
  email text,
  youtube_channel text not null check (length(youtube_channel) between 1 and 100),
  youtube_subscriber_verified boolean not null default false,
  address text not null check (length(address) between 1 and 500),
  contact_by_email boolean not null default false,
  battery_details text not null default '' check (length(battery_details) <= 4000),
  symptoms text not null check (length(symptoms) between 1 and 4000),
  repair_option text not null check (repair_option in ('수리','리필','점검 후 가능한 작업')),
  extra_request text check (extra_request is null or length(extra_request) <= 3000),
  privacy_consent boolean not null check (privacy_consent),
  status text not null default '접수' check (status in ('접수','답장완료','수리중','수리완료')),
  repair_cost integer check (repair_cost is null or repair_cost >= 0),
  admin_note text check (admin_note is null or length(admin_note) <= 3000)
);
create table if not exists public.repair_batteries (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.repair_requests(id) on delete cascade,
  brand text not null default '' check(length(brand)<=80),
  model text not null default '' check(length(model)<=120),
  voltage text not null default '' check(length(voltage)<=30),
  capacity text not null default '' check(length(capacity)<=30),
  quantity integer not null check(quantity between 1 and 99)
);
create index if not exists repair_requests_created_at_idx on public.repair_requests(created_at desc);
create index if not exists repair_requests_status_idx on public.repair_requests(status);
create index if not exists repair_batteries_request_idx on public.repair_batteries(request_id);

alter table public.repair_requests enable row level security;
alter table public.repair_batteries enable row level security;
revoke all on public.repair_requests, public.repair_batteries from anon, authenticated;
grant select, update on public.repair_requests to authenticated;
grant select on public.repair_batteries to authenticated;

-- 브라우저 공개 키로 직접 INSERT하지 않고 검증 RPC를 통해서만 의뢰서를 받습니다.
create or replace function public.submit_repair_request(payload jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_id uuid;
begin
  if jsonb_typeof(payload) <> 'object' then raise exception 'invalid request'; end if;
  if coalesce(length(payload->>'name'),0) not between 1 and 80
     or coalesce(length(payload->>'phone'),0) not between 7 and 30
     or coalesce(length(payload->>'address'),0) not between 1 and 500
     or coalesce(length(payload->>'youtube_channel'),0) not between 1 and 100
     or coalesce(length(payload->>'battery_details'),0) not between 1 and 4000
     or coalesce(length(payload->>'symptoms'),0) not between 1 and 4000
     or payload->>'repair_option' not in ('수리','리필','점검 후 가능한 작업')
     or coalesce((payload->>'privacy_consent')::boolean,false) is not true then
    raise exception 'invalid request';
  end if;
  if coalesce((payload->>'contact_by_email')::boolean,false) and coalesce(length(payload->>'email'),0)=0 then raise exception 'email required'; end if;
  insert into public.repair_requests(name,phone,email,youtube_channel,address,contact_by_email,battery_details,symptoms,repair_option,extra_request,privacy_consent)
  values (payload->>'name',payload->>'phone',nullif(payload->>'email',''),payload->>'youtube_channel',payload->>'address',(payload->>'contact_by_email')::boolean,payload->>'battery_details',payload->>'symptoms',payload->>'repair_option',nullif(payload->>'extra_request',''),true)
  returning id into new_id;
  return new_id;
end; $$;
revoke all on function public.submit_repair_request(jsonb) from public;
grant execute on function public.submit_repair_request(jsonb) to anon, authenticated;

-- Only the explicitly selected, authenticated admin email can read/update customer records.
create policy "MayDay admin email can read requests" on public.repair_requests for select to authenticated
using ((auth.jwt()->>'email') = 'maydaycom030@gmail.com');
create policy "MayDay admin email can update requests" on public.repair_requests for update to authenticated
using ((auth.jwt()->>'email') = 'maydaycom030@gmail.com')
with check ((auth.jwt()->>'email') = 'maydaycom030@gmail.com');
create policy "MayDay admin email can read batteries" on public.repair_batteries for select to authenticated
using ((auth.jwt()->>'email') = 'maydaycom030@gmail.com');
