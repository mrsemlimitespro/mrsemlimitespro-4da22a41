
-- Bucket privado user-uploads: pasta raiz = user_id
CREATE POLICY "user-uploads: read own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'user-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "user-uploads: insert own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'user-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "user-uploads: update own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'user-uploads' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'user-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "user-uploads: delete own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'user-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
