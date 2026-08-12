
CREATE POLICY "admin read admin-media" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'admin-media' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin insert admin-media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'admin-media' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin update admin-media" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'admin-media' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete admin-media" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'admin-media' AND public.has_role(auth.uid(), 'admin'));
