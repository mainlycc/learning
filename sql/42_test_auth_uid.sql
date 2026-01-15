-- TEST auth.uid() - sprawdź czy zwraca poprawne wartości
-- Uruchom to jako zalogowany użytkownik (nie jako admin w SQL Editor!)

-- 1. Sprawdź aktualny auth.uid()
SELECT 
  'Aktualny auth.uid():' as info,
  auth.uid() as current_user_id;

-- 2. Sprawdź czy auth.uid() odpowiada ID w profiles
SELECT 
  'Mapowanie auth.uid() -> profiles:' as info,
  auth.uid() as auth_user_id,
  p.id as profile_id,
  p.email,
  p.role,
  CASE 
    WHEN auth.uid() = p.id THEN '✓ ID się zgadzają'
    ELSE '✗ ID się NIE zgadzają!'
  END as status
FROM profiles p
WHERE p.id = auth.uid();

-- 3. Sprawdź przypisania dla aktualnego użytkownika
SELECT 
  'Przypisania dla auth.uid():' as info,
  tu.training_id,
  t.title as training_title,
  t.is_active,
  tu.user_id,
  auth.uid() as current_auth_uid,
  CASE 
    WHEN tu.user_id = auth.uid() THEN '✓ ID się zgadzają'
    ELSE '✗ ID się NIE zgadzają!'
  END as id_match
FROM training_users tu
JOIN trainings t ON t.id = tu.training_id
WHERE tu.user_id = auth.uid()
ORDER BY t.title;

-- 4. Sprawdź jakie szkolenia powinien widzieć użytkownik (symulacja RLS)
SELECT 
  'Szkolenia które użytkownik POWINIEN widzieć:' as info,
  t.id,
  t.title,
  t.is_active,
  EXISTS (
    SELECT 1 
    FROM training_users tu
    WHERE tu.training_id = t.id
    AND tu.user_id = auth.uid()
  ) as user_is_assigned,
  public.training_has_assignments(t.id) as has_assignments,
  CASE 
    WHEN t.is_active = true AND (
      EXISTS (
        SELECT 1 
        FROM training_users tu
        WHERE tu.training_id = t.id
        AND tu.user_id = auth.uid()
      )
      OR NOT public.training_has_assignments(t.id)
    ) THEN 'POWINIEN WIDZIEĆ'
    ELSE 'NIE POWINIEN WIDZIEĆ'
  END as status
FROM trainings t
WHERE t.is_active = true
ORDER BY t.title;
