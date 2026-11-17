-- Existing Supabase project: run once in SQL Editor before accepting new requests.
alter table public.repair_requests
  add column if not exists youtube_channel text check (youtube_channel is null or length(youtube_channel) <= 100),
  add column if not exists youtube_subscriber_verified boolean not null default false;

create or replace function public.submit_repair_request(payload jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_id uuid;
begin
  if jsonb_typeof(payload) <> 'object' then raise exception 'invalid request'; end if;
  if coalesce(length(payload->>'name'),0) not between 1 and 80
     or coalesce(length(payload->>'phone'),0) not between 7 and 30
     or coalesce(length(payload->>'address'),0) not between 1 and 500
     or coalesce(length(payload->>'battery_details'),0) not between 1 and 4000
     or coalesce(length(payload->>'symptoms'),0) not between 1 and 4000
     or coalesce(length(payload->>'youtube_channel'),0) not between 1 and 100
     or payload->>'repair_option' not in ('수리','리필','점검 후 가능한 작업')
     or coalesce((payload->>'privacy_consent')::boolean,false) is not true then
    raise exception 'invalid request';
  end if;
  if coalesce((payload->>'contact_by_email')::boolean,false) and coalesce(length(payload->>'email'),0)=0 then
    raise exception 'email required';
  end if;
  insert into public.repair_requests(
    name,phone,email,youtube_channel,address,contact_by_email,battery_details,
    symptoms,repair_option,extra_request,privacy_consent
  )
  values (
    payload->>'name',payload->>'phone',nullif(payload->>'email',''),
    payload->>'youtube_channel',payload->>'address',
    (payload->>'contact_by_email')::boolean,payload->>'battery_details',
    payload->>'symptoms',payload->>'repair_option',
    nullif(payload->>'extra_request',''),true
  )
  returning id into new_id;
  return new_id;
end; $$;
revoke all on function public.submit_repair_request(jsonb) from public;
grant execute on function public.submit_repair_request(jsonb) to anon, authenticated;
