-- SKRYPT TESTOWY - sprawdza dostęp konkretnego użytkownika
-- ZASTĄP 'user@mail.com' emailem użytkownika, którego chcesz przetestować

DO $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT := 'user@mail.com'; -- ZMIEŃ TEN EMAIL!
  v_user_name TEXT;
  rec RECORD;
BEGIN
  -- 1. Znajdź ID użytkownika po emailu
  SELECT id, full_name INTO v_user_id, v_user_name
  FROM profiles
  WHERE email = v_user_email;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Użytkownik z emailem % nie został znaleziony!', v_user_email;
  END IF;
  
  RAISE NOTICE 'Znaleziono użytkownika: % (ID: %)', COALESCE(v_user_name, v_user_email), v_user_id;
  
  -- 2. Sprawdź przypisania tego użytkownika
  RAISE NOTICE '';
  RAISE NOTICE '=== PRZYPISANIA UŻYTKOWNIKA ===';
  FOR rec IN 
    SELECT 
      tu.id,
      tu.training_id,
      t.title as training_title,
      t.is_active
    FROM training_users tu
    JOIN trainings t ON t.id = tu.training_id
    WHERE tu.user_id = v_user_id
    ORDER BY t.title
  LOOP
    RAISE NOTICE 'Szkolenie: % (ID: %, Aktywne: %)', rec.training_title, rec.training_id, rec.is_active;
  END LOOP;
  
  -- 3. Sprawdź czy funkcja user_is_assigned_to_training działa
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST FUNKCJI user_is_assigned_to_training ===';
  FOR rec IN 
    SELECT 
      t.id,
      t.title,
      t.is_active,
      public.user_is_assigned_to_training(v_user_id, t.id) as user_assigned,
      public.training_has_assignments(t.id) as has_assignments
    FROM trainings t
    WHERE t.is_active = true
    ORDER BY t.title
  LOOP
    RAISE NOTICE 'Szkolenie: % | Przypisany: % | Ma przypisania: %', 
      rec.title, rec.user_assigned, rec.has_assignments;
  END LOOP;
  
  -- 4. Sprawdź jakie szkolenia użytkownik POWINIEN widzieć
  RAISE NOTICE '';
  RAISE NOTICE '=== SZKOLENIA KTÓRE UŻYTKOWNIK POWINIEN WIDZIEĆ ===';
  FOR rec IN 
    SELECT 
      t.id,
      t.title,
      t.is_active,
      public.user_is_assigned_to_training(v_user_id, t.id) as user_assigned,
      public.training_has_assignments(t.id) as has_assignments,
      CASE 
        WHEN t.is_active = true AND (
          public.user_is_assigned_to_training(v_user_id, t.id)
          OR NOT public.training_has_assignments(t.id)
        ) THEN true
        ELSE false
      END as powinien_widziec
    FROM trainings t
    ORDER BY t.title
  LOOP
    IF rec.powinien_widziec THEN
      RAISE NOTICE '✓ POWINIEN WIDZIEĆ: % (ID: %)', rec.title, rec.id;
    ELSE
      RAISE NOTICE '✗ NIE POWINIEN WIDZIEĆ: % (ID: %, Aktywne: %, Przypisany: %, Ma przypisania: %)', 
        rec.title, rec.id, rec.is_active, rec.user_assigned, rec.has_assignments;
    END IF;
  END LOOP;
  
END $$;

-- 5. Sprawdź RLS policy na trainings - czy używa funkcji
SELECT 
  policyname,
  cmd,
  substring(qual, 1, 300) as policy_condition
FROM pg_policies 
WHERE tablename = 'trainings' 
  AND policyname = 'Users can view assigned or public trainings';
