-- ==============================================================================
-- AUTOMATIC GOOGLE AVATAR & EMPLOYEE PROVISIONING TRIGGER
-- Syncs Google OAuth profile pictures to public.employees and auto-provisions
-- employee profiles for upcoming new users logging in with Google.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.sync_google_avatar_to_employee()
RETURNS TRIGGER AS $$
DECLARE
  google_avatar TEXT;
  target_email TEXT;
  emp_count INT;
  resolved_name TEXT;
  auto_code TEXT;
BEGIN
  -- Extract Google profile picture from raw_user_meta_data
  google_avatar := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture'
  );
  
  target_email := LOWER(TRIM(COALESCE(NEW.email, '')));

  IF target_email <> '' THEN
    -- Check if employee already exists in public.employees
    SELECT COUNT(*) INTO emp_count
    FROM public.employees
    WHERE 
      (work_email IS NOT NULL AND LOWER(TRIM(work_email)) = target_email)
      OR (personal_email IS NOT NULL AND LOWER(TRIM(personal_email)) = target_email)
      OR user_id = NEW.id;

    IF emp_count > 0 THEN
      -- Existing employee: update avatar and link user_id
      IF google_avatar IS NOT NULL AND google_avatar <> '' THEN
        UPDATE public.employees
        SET 
          avatar_url = google_avatar,
          user_id = NEW.id,
          updated_at = NOW()
        WHERE 
          (work_email IS NOT NULL AND LOWER(TRIM(work_email)) = target_email)
          OR (personal_email IS NOT NULL AND LOWER(TRIM(personal_email)) = target_email)
          OR user_id = NEW.id;
      ELSE
        UPDATE public.employees
        SET 
          user_id = NEW.id,
          updated_at = NOW()
        WHERE 
          (work_email IS NOT NULL AND LOWER(TRIM(work_email)) = target_email)
          OR (personal_email IS NOT NULL AND LOWER(TRIM(personal_email)) = target_email);
      END IF;
    ELSE
      -- Brand new upcoming user: auto-provision an employee profile with Google avatar
      resolved_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        INITCAP(SPLIT_PART(target_email, '@', 1))
      );
      auto_code := 'JFT-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');

      INSERT INTO public.employees (
        code,
        name,
        avatar_url,
        work_email,
        personal_email,
        designation,
        department,
        organization,
        branch,
        status,
        is_user,
        user_id,
        created_at,
        updated_at
      ) VALUES (
        auto_code,
        resolved_name,
        google_avatar,
        target_email,
        target_email,
        'Staff Member',
        'General',
        'JAAGO Foundation Trust',
        'Head Office (Banani)',
        'active',
        TRUE,
        NEW.id,
        NOW(),
        NOW()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger fired after INSERT or UPDATE on auth.users
DROP TRIGGER IF EXISTS on_auth_user_google_avatar_sync ON auth.users;
CREATE TRIGGER on_auth_user_google_avatar_sync
  AFTER INSERT OR UPDATE OF raw_user_meta_data, last_sign_in_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_google_avatar_to_employee();
