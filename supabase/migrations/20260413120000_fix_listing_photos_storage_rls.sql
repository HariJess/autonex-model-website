-- Fix critique : les policies UPDATE/DELETE sur storage.objects pour listing-photos
-- n'exigeaient que 'authenticated', donc n'importe qui pouvait modifier/supprimer
-- n'importe quelle photo. On rattache l'autorisation à la propriété du listing
-- via le path du fichier, dont la structure est : {listing_id}/{position}-{timestamp}.{ext}

DROP POLICY IF EXISTS "Users can update own listing photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own listing photos" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can upload listing photos" ON storage.objects;

-- Upload : seul le propriétaire du listing peut uploader dans le dossier du listing
CREATE POLICY "Owner can upload listing photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'listing-photos'
    AND EXISTS (
      SELECT 1 FROM public.listings
      WHERE id::text = (storage.foldername(name))[1]
        AND owner_id = auth.uid()
    )
  );

-- Update : seul le propriétaire du listing peut remplacer ses photos
CREATE POLICY "Owner can update listing photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'listing-photos'
    AND EXISTS (
      SELECT 1 FROM public.listings
      WHERE id::text = (storage.foldername(name))[1]
        AND owner_id = auth.uid()
    )
  );

-- Delete : seul le propriétaire du listing peut supprimer ses photos
CREATE POLICY "Owner can delete listing photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'listing-photos'
    AND EXISTS (
      SELECT 1 FROM public.listings
      WHERE id::text = (storage.foldername(name))[1]
        AND owner_id = auth.uid()
    )
  );

-- Admins peuvent aussi modérer (supprimer) des photos
DROP POLICY IF EXISTS "Admins can delete any listing photo" ON storage.objects;
CREATE POLICY "Admins can delete any listing photo"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'listing-photos'
    AND public.immonex_is_admin()
  );
