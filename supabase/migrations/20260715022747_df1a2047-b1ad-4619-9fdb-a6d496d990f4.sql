
create policy "admin upload extension-releases" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'extension-releases' and public.has_role(auth.uid(), 'admin'));

create policy "admin update extension-releases" on storage.objects
  for update to authenticated
  using (bucket_id = 'extension-releases' and public.has_role(auth.uid(), 'admin'));

create policy "admin delete extension-releases" on storage.objects
  for delete to authenticated
  using (bucket_id = 'extension-releases' and public.has_role(auth.uid(), 'admin'));

create policy "reseller read extension-releases" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'extension-releases'
    and (
      public.has_role(auth.uid(), 'admin')
      or exists (
        select 1 from public.revendedores r where r.auth_user_id = auth.uid()
      )
    )
  );
