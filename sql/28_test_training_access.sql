-- SKRYPT TESTOWY - sprawdza czy dostęp do szkoleń działa poprawnie
-- Uruchom ten skrypt aby zdiagnozować problemy z dostępem

-- 1. Sprawdź czy funkcje istnieją
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'training_has_assignments') 
    THEN '✓ Funkcja training_has_assignments istnieje'
    ELSE '✗ Funkcja training_has_assignments NIE istnieje'
  END as status_funkcji_assignments;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'user_is_assigned_to_training') 
    THEN '✓ Funkcja user_is_assigned_to_training istnieje'
    ELSE '✗ Funkcja user_is_assigned_to_training NIE istnieje'
  END as status_funkcji_user_assigned;

-- 2. Sprawdź RLS policies na trainings
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'trainings' 
ORDER BY policyname;

-- 3. Sprawdź RLS policies na training_users
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'training_users' 
ORDER BY policyname;

-- 4. Sprawdź przykładowe przypisania (jako admin)
-- Zastąp 'TWOJE_USER_ID' i 'TWOJE_TRAINING_ID' rzeczywistymi wartościami
SELECT 
  tu.id,
  tu.training_id,
  tu.user_id,
  t.title as training_title,
  t.is_active,
  p.email as user_email,
  p.full_name as user_name
FROM training_users tu
JOIN trainings t ON t.id = tu.training_id
JOIN profiles p ON p.id = tu.user_id
ORDER BY tu.created_at DESC
LIMIT 10;

-- 5. Sprawdź czy szkolenia mają przypisania
SELECT 
  t.id,
  t.title,
  t.is_active,
  COUNT(tu.id) as liczba_przypisan,
  public.training_has_assignments(t.id) as ma_przypisania
FROM trainings t
LEFT JOIN training_users tu ON tu.training_id = t.id
GROUP BY t.id, t.title, t.is_active
ORDER BY t.created_at DESC
LIMIT 10;

-- 6. Test funkcji (zastąp wartości)
-- SELECT public.user_is_assigned_to_training('USER_ID_HERE'::uuid, 'TRAINING_ID_HERE'::uuid) as user_assigned;
-- SELECT public.training_has_assignments('TRAINING_ID_HERE'::uuid) as has_assignments;
