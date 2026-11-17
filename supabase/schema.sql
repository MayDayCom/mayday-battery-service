-- Supabase SQL Editor에서 한 번 실행하세요.
create extension if not exists pgcrypto;

create table if not exists public.repair_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (length(name) between 1 and 80),
  phone text not null check (length(phone) between 7 and 30),
  email text,
  address text not null check (length(address) between 1 and 500),
  contact_by_email boolean not null default false,
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
        item jsonb;
        n integer := 0;
begin
  if jsonb_typeof(payload) <> 'object' then raise exception 'invalid request'; end if;
  if coalesce(length(payload->>'name'),0) not between 1 and 80
     or coalesce(length(payload->>'phone'),0) not between 7 and 30
     or coalesce(length(payload->>'address'),0) not between 1 and 500
     or coalesce(length(payload->>'symptoms'),0) not between 1 and 4000
     or payload->>'repair_option' not in ('수리','리필','점검 후 가능한 작업')
     or coalesce((payload->>'privacy_consent')::boolean,false) is not true
     or jsonb_typeof(payload->'batteries') <> 'array'
     or jsonb_array_length(payload->'batteries') not between 1 and 30 then
    raise exception 'invalid request';
  end if;
  if coalesce((payload->>'contact_by_email')::boolean,false) and coalesce(length(payload->>'email'),0)=0 then raise exception 'email required'; end if;
  insert into public.repair_requests(name,phone,email,address,contact_by_email,symptoms,repair_option,extra_request,privacy_consent)
  values (payload->>'name',payload->>'phone',nullif(payload->>'email',''),payload->>'address',(payload->>'contact_by_email')::boolean,payload->>'symptoms',payload->>'repair_option',nullif(payload->>'extra_request',''),true)
  returning id into new_id;
  for item in select value from jsonb_array_elements(payload->'batteries') loop
    n := n + 1;
    if (item->>'quantity')::integer not between 1 and 99 then raise exception 'invalid quantity'; end if;
    insert into public.repair_batteries(request_id,brand,model,voltage,capacity,quantity)
    values(new_id,left(coalesce(item->>'brand',''),80),left(coalesce(item->>'model',''),120),left(coalesce(item->>'voltage',''),30),left(coalesce(item->>'capacity',''),30),(item->>'quantity')::integer);
  end loop;
  return new_id;
end; $$;
revoke all on function public.submit_repair_request(jsonb) from public;
grant execute on function public.submit_repair_request(jsonb) to anon, authenticated;

-- 관리자는 Supabase Auth 사용자 생성 후 app_metadata.role = 'admin'을 서버 측에서 지정하세요.
create policy "Admins read requests" on public.repair_requests for select to authenticated
using ((auth.jwt()->'app_metadata'->>'role') = 'admin');
create policy "Admins update requests" on public.repair_requests for update to authenticated
using ((auth.jwt()->'app_metadata'->>'role') = 'admin')
with check ((auth.jwt()->'app_metadata'->>'role') = 'admin');
create policy "Admins read batteries" on public.repair_batteries for select to authenticated
using ((auth.jwt()->'app_metadata'->>'role') = 'admin');
