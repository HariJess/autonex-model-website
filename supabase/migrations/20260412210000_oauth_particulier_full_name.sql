-- Particuliers OAuth (ex. Google) : le nom peut être dans raw_user_meta_data.name si full_name est vide.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta JSONB;
  r TEXT;
  agency_uuid UUID;
  base_slug TEXT;
  final_slug TEXT;
  profile_full_name TEXT;
BEGIN
  meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  r := COALESCE(meta->>'role', 'particulier');

  IF r = 'agence' THEN
    profile_full_name := COALESCE(
      NULLIF(trim(meta->>'commercial_contact_name'), ''),
      NULLIF(trim(meta->>'full_name'), ''),
      ''
    );
  ELSE
    profile_full_name := COALESCE(
      NULLIF(trim(meta->>'full_name'), ''),
      NULLIF(trim(meta->>'name'), ''),
      ''
    );
  END IF;

  INSERT INTO public.profiles (id, full_name, role, phone)
  VALUES (
    NEW.id,
    profile_full_name,
    CASE
      WHEN r IN ('particulier', 'agence', 'promoteur', 'admin') THEN r::public.user_role
      ELSE 'particulier'::public.user_role
    END,
    NULLIF(trim(meta->>'phone'), '')
  );

  IF r = 'agence' AND NULLIF(trim(meta->>'agency_name'), '') IS NOT NULL THEN
    base_slug := lower(regexp_replace(trim(meta->>'agency_name'), '[^a-zA-Z0-9]+', '-', 'g'));
    base_slug := trim(both '-' from base_slug);
    IF base_slug = '' THEN
      base_slug := 'agence';
    END IF;
    final_slug := base_slug || '-' || substr(md5(random()::text || clock_timestamp()::text), 1, 8);

    INSERT INTO public.agencies (
      name, slug, phone, email, logo_url,
      address, commercial_contact_name, nif, stat, reg_commerce
    ) VALUES (
      trim(meta->>'agency_name'),
      final_slug,
      NULLIF(trim(meta->>'phone'), ''),
      NULLIF(trim(NEW.email), ''),
      NULLIF(trim(meta->>'agency_logo_url'), ''),
      NULLIF(trim(meta->>'agency_address'), ''),
      NULLIF(trim(meta->>'commercial_contact_name'), ''),
      NULLIF(trim(meta->>'nif'), ''),
      NULLIF(trim(meta->>'stat'), ''),
      NULLIF(trim(meta->>'reg_commerce'), '')
    )
    RETURNING id INTO agency_uuid;

    UPDATE public.profiles SET agency_id = agency_uuid WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;
