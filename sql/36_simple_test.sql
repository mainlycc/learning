-- PROSTY TEST DOSTĘPU DO SZKOLEŃ
-- Uruchom ten skrypt i prześlij wyniki

-- 1. Sprawdź mapowanie auth.users -> profiles
SELECT 
  'Mapowanie auth.users -> profiles' as test_name,
  COUNT(*) as total_users,
  COUNT(p.id) as users_with_profile,
  COUNT(*) - COUNT(p.id) as users_without_profile
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id;

-- 2. Sprawdź przykładowe przypisania
SELECT 
  'Przykładowe przypisania' as test_name,
  tu.user_id,
  tu.training_id,
  t.title as training_title,
  t.is_active,
  p.email as user_email,
  au.id as auth_user_id,
  CASE 
    WHEN tu.user_id = au.id THEN 'OK'
    ELSE 'BŁĄD: ID się nie zgadzają!'
  END as status
FROM training_users tu
JOIN trainings t ON t.id = tu.training_id
JOIN profiles p ON p.id = tu.user_id
LEFT JOIN auth.users au ON au.id = tu.user_id
ORDER BY tu.created_at DESC
LIMIT 5;

-- 3. Test funkcji na rzeczywistych danych
SELECT 
  'Test funkcji' as test_name,
  t.id as training_id,
  t.title,
  t.is_active,
  tu.user_id,
  p.email as user_email,
  public.user_is_assigned_to_training(tu.user_id, t.id) as funkcja_zwraca_true,
  public.training_has_assignments(t.id) as szkolenie_ma_przypisania
FROM training_users tu
JOIN trainings t ON t.id = tu.training_id
JOIN profiles p ON p.id = tu.user_id
WHERE t.is_active = true
ORDER BY tu.created_at DESC
LIMIT 5;

-- 4. Sprawdź RLS policy - pełna treść
SELECT 
  'RLS Policy' as test_name,
  policyname,
  cmd,
  qual as full_policy_condition
FROM pg_policies 
WHERE tablename = 'trainings' 
  AND policyname = 'Users can view assigned or public trainings';

-- 5. Symulacja: jakie szkolenia powinien widzieć użytkownik
-- Zastąp 'USER_EMAIL_HERE' emailem użytkownika
SELECT 
  'Symulacja dostępu dla użytkownika' as test_name,
  t.id,
  t.title,
  t.is_active,
  p.email as user_email,
  public.user_is_assigned_to_training(p.id, t.id) as user_assigned,
  public.training_has_assignments(t.id) as has_assignments,
  CASE 
    WHEN t.is_active = true AND (
      public.user_is_assigned_to_training(p.id, t.id)
      OR NOT public.training_has_assignments(t.id)
    ) THEN 'POWINIEN WIDZIEĆ'
    ELSE 'NIE POWINIEN WIDZIEĆ'
  END as status
FROM trainings t
CROSS JOIN profiles p
WHERE p.email = 'USER_EMAIL_HERE' -- ZMIEŃ!
  AND t.is_active = true
ORDER BY t.title;
