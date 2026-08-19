-- 1. Criação do Bucket de Storage (Privado)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('mr-ext-uploads', 'mr-ext-uploads', false, 52428800, ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain', 'text/csv', 'text/markdown',
    'application/json', 'application/zip', 'audio/mpeg', 'video/mp4'
])
ON CONFLICT (id) DO UPDATE SET 
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Políticas de Storage para service_role (Backend)
CREATE POLICY "Admin full access" ON storage.objects
    FOR ALL TO service_role
    USING (bucket_id = 'mr-ext-uploads')
    WITH CHECK (bucket_id = 'mr-ext-uploads');

-- 3. Políticas de Leitura Privada (signed URLs apenas)
CREATE POLICY "Private read access" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'mr-ext-uploads');
