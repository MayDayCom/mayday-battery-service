-- Supabase SQL Editor: execute after confirming the admin email.
drop policy if exists "Admins read requests" on public.repair_requests;
drop policy if exists "Admins update requests" on public.repair_requests;
drop policy if exists "Admins read batteries" on public.repair_batteries;
drop policy if exists "MayDay admin email can read requests" on public.repair_requests;
drop policy if exists "MayDay admin email can update requests" on public.repair_requests;
drop policy if exists "MayDay admin email can read batteries" on public.repair_batteries;

create policy "MayDay admin email can read requests"
on public.repair_requests for select to authenticated
using ((auth.jwt()->>'email') = 'maydaycom030@gmail.com');

create policy "MayDay admin email can update requests"
on public.repair_requests for update to authenticated
using ((auth.jwt()->>'email') = 'maydaycom030@gmail.com')
with check ((auth.jwt()->>'email') = 'maydaycom030@gmail.com');

create policy "MayDay admin email can read batteries"
on public.repair_batteries for select to authenticated
using ((auth.jwt()->>'email') = 'maydaycom030@gmail.com');
