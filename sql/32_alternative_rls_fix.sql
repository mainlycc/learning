-- ALTERNATYWNE ROZWIĄZANIE - używa bezpośredniego zapytania zamiast funkcji
-- To rozwiązanie może działać lepiej jeśli funkcje nie działają poprawnie

-- Usuń starą politykę
DROP POLICY IF EXISTS "Users can view assigned or public trainings" ON trainings;

-- Nowa polityka używająca bezpośredniego zapytania z SECURITY DEFINER przez funkcję
-- Ale najpierw upewnijmy się, że funkcja działa poprawnie

-- Sprawdź czy funkcja user_is_assigned_to_training istnieje i działa
DO $$
DECLARE
  test_result BOOLEAN;
BEGIN
  -- Sprawdź czy funkcja istnieje
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'user_is_assigned_to_training') THEN
    RAISE EXCEPTION 'Funkcja user_is_assigned_to_training nie istnieje! Uruchom najpierw 29_final_fix_training_access.sql';
  END IF;
  
  RAISE NOTICE 'Funkcja user_is_assigned_to_training istnieje';
END $$;

-- Utwórz politykę używającą funkcji
CREATE POLICY "Users can view assigned or public trainings" ON trainings
  FOR SELECT USING (
    is_active = true AND (
      -- Użytkownik jest przypisany do kursu
      public.user_is_assigned_to_training(auth.uid(), trainings.id)
      OR
      -- Kurs nie ma przypisanych użytkowników (dostępny dla wszystkich)
      -- Używamy funkcji z SECURITY DEFINER aby omijać RLS
      NOT public.training_has_assignments(trainings.id)
    )
  );

-- Sprawdź czy polityka została utworzona
SELECT 
  policyname,
  cmd,
  substring(qual, 1, 200) as policy_condition_preview
FROM pg_policies 
WHERE tablename = 'trainings' 
  AND policyname = 'Users can view assigned or public trainings';

-- WAŻNE: Upewnij się, że RLS jest włączone
ALTER TABLE trainings ENABLE ROW LEVEL SECURITY;

-- Sprawdź wszystkie polityki na trainings
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN qual LIKE '%user_is_assigned_to_training%' THEN '✓ Używa funkcji user_is_assigned_to_training'
    ELSE '✗ Nie używa funkcji'
  END as uses_function
FROM pg_policies 
WHERE tablename = 'trainings' 
ORDER BY policyname;
