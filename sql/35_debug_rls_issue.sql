-- DIAGNOSTYKA PROBLEMU Z RLS
-- Ten skrypt pomoże znaleźć przyczynę problemu

-- 1. Sprawdź czy auth.uid() zwraca poprawne wartości
-- Uruchom to jako zalogowany użytkownik (nie jako admin w SQL Editor!)
-- SELECT auth.uid() as current_user_id;

-- 2. Sprawdź mapowanie między auth.users a profiles
SELECT 
  au.id as auth_user_id,
  au.email as auth_email,
  p.id as profile_id,
  p.email as profile_email,
  p.full_name,
  p.role
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
ORDER BY au.email;

-- 3. Sprawdź czy user_id w training_users odpowiada auth.uid()
SELECT 
  tu.user_id,
  tu.training_id,
  t.title as training_title,
  p.email as user_email,
  au.id as auth_user_id,
  CASE 
    WHEN tu.user_id = au.id THEN '✓ ID się zgadzają'
    ELSE '✗ ID się NIE zgadzają!'
  END as id_match
FROM training_users tu
JOIN trainings t ON t.id = tu.training_id
JOIN profiles p ON p.id = tu.user_id
LEFT JOIN auth.users au ON au.email = p.email
LIMIT 10;

-- 4. Sprawdź czy funkcje działają poprawnie dla konkretnego użytkownika
-- Zastąp 'USER_EMAIL_HERE' emailem użytkownika
DO $$
DECLARE
  v_user_email TEXT := 'USER_EMAIL_HERE'; -- ZMIEŃ!
  v_user_id UUID;
  v_auth_id UUID;
  v_training_id UUID;
BEGIN
  -- Znajdź ID użytkownika w profiles
  SELECT id INTO v_user_id
  FROM profiles
  WHERE email = v_user_email;
  
  -- Znajdź ID użytkownika w auth.users
  SELECT id INTO v_auth_id
  FROM auth.users
  WHERE email = v_user_email;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Użytkownik z emailem % nie został znaleziony w profiles!', v_user_email;
  END IF;
  
  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION 'Użytkownik z emailem % nie został znaleziony w auth.users!', v_user_email;
  END IF;
  
  RAISE NOTICE 'Profile ID: %', v_user_id;
  RAISE NOTICE 'Auth ID: %', v_auth_id;
  RAISE NOTICE 'ID się zgadzają: %', (v_user_id = v_auth_id);
  
  -- Znajdź pierwsze szkolenie przypisane do tego użytkownika
  SELECT tu.training_id INTO v_training_id
  FROM training_users tu
  WHERE tu.user_id = v_user_id
  LIMIT 1;
  
  IF v_training_id IS NOT NULL THEN
    RAISE NOTICE '';
    RAISE NOTICE 'Test funkcji dla szkolenia %:', v_training_id;
    RAISE NOTICE '  user_is_assigned_to_training(%, %) = %', 
      v_user_id, v_training_id, public.user_is_assigned_to_training(v_user_id, v_training_id);
    RAISE NOTICE '  training_has_assignments(%) = %', 
      v_training_id, public.training_has_assignments(v_training_id);
    
    -- Sprawdź czy auth.uid() zwróciłoby to samo
    RAISE NOTICE '';
    RAISE NOTICE 'UWAGA: auth.uid() zwróci ID z auth.users, które powinno być takie samo jak ID w profiles';
    RAISE NOTICE 'Jeśli ID się nie zgadzają, to jest problem!';
  ELSE
    RAISE NOTICE 'Użytkownik nie ma przypisanych szkoleń';
  END IF;
END $$;

-- 5. Sprawdź RLS policy na training_users - może blokuje dostęp?
SELECT 
  policyname,
  cmd,
  substring(qual, 1, 300) as policy_condition
FROM pg_policies 
WHERE tablename = 'training_users'
ORDER BY policyname;

-- 6. Sprawdź czy funkcje mają SECURITY DEFINER
SELECT 
  proname as function_name,
  prosecdef as is_security_definer,
  proowner::regrole as owner
FROM pg_proc 
WHERE proname IN ('user_is_assigned_to_training', 'training_has_assignments')
ORDER BY proname;
