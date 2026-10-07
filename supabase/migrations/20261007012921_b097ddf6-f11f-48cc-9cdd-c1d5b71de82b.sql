CREATE POLICY "Owner can read own shop logo objects" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'shop-logos' AND (storage.foldername(name))[1] = (auth.uid())::text);
CREATE POLICY "Owner or team can read repair photo objects" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'repair-photos' AND (((storage.foldername(name))[1] = (auth.uid())::text) OR public.is_team_member(((storage.foldername(name))[1])::uuid, auth.uid())));