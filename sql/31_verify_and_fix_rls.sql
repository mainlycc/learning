-- WERYFIKACJA I NAPRAWA RLS POLICY
-- Ten skrypt sprawdza i naprawia RLS policy na trainings

-- 1. Sprawdź aktualną RLS policy
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'trainings' 
  AND policyname = 'Users can view assigned or public trainings';

-- 2. Sprawdź czy funkcje istnieją i działają
SELECT 
  proname as function_name,
  prosrc as function_body
FROM pg_proc 
WHERE proname IN ('user_is_assigned_to_training', 'training_has_assignments')
ORDER BY proname;

-- 3. Usuń starą politykę i utwórz nową z pełną ścieżką do funkcji
DROP POLICY IF EXISTS "Users can view assigned or public trainings" ON trainings;

-- Utwórz politykę używającą funkcji z pełną ścieżką
CREATE POLICY "Users can view assigned or public trainings" ON trainings
  FOR SELECT USING (
    is_active = true AND (
      -- Użytkownik jest przypisany do kursu
      public.user_is_assigned_to_training(auth.uid(), trainings.id) = true
      OR
      -- Kurs nie ma przypisanych użytkowników (dostępny dla wszystkich)
      public.training_has_assignments(trainings.id) = false
    )
  );

-- 4. Sprawdź czy polityka została utworzona
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'trainings' 
  AND policyname = 'Users can view assigned or public trainings';

-- 5. Sprawdź czy RLS jest włączone na trainings
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'trainings';

-- Jeśli RLS nie jest włączone, włącz je
ALTER TABLE trainings ENABLE ROW LEVEL SECURITY;

-- 6. Sprawdź wszystkie polityki na trainings
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'trainings' 
ORDER BY policyname;
