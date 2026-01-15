-- NAPRAWA RLS POLICY - dodaje prefiks public. do funkcji
-- Problem: RLS policy używa funkcji bez prefiksu public., co może powodować problemy

-- Usuń starą politykę
DROP POLICY IF EXISTS "Users can view assigned or public trainings" ON trainings;

-- Utwórz nową politykę z pełną ścieżką do funkcji (public.)
CREATE POLICY "Users can view assigned or public trainings" ON trainings
  FOR SELECT USING (
    is_active = true AND (
      -- Użytkownik jest przypisany do kursu - użyj pełnej ścieżki
      public.user_is_assigned_to_training(auth.uid(), trainings.id)
      OR
      -- Kurs nie ma przypisanych użytkowników (dostępny dla wszystkich)
      NOT public.training_has_assignments(trainings.id)
    )
  );

-- Sprawdź czy polityka została utworzona poprawnie
SELECT 
  policyname,
  cmd,
  substring(qual, 1, 400) as policy_condition
FROM pg_policies 
WHERE tablename = 'trainings' 
  AND policyname = 'Users can view assigned or public trainings';

-- Upewnij się, że RLS jest włączone
ALTER TABLE trainings ENABLE ROW LEVEL SECURITY;

-- Sprawdź wszystkie polityki na trainings
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN qual LIKE '%public.user_is_assigned_to_training%' THEN '✓ Używa public.user_is_assigned_to_training'
    WHEN qual LIKE '%user_is_assigned_to_training%' THEN '⚠ Używa user_is_assigned_to_training (bez public.)'
    ELSE '✗ Nie używa funkcji'
  END as function_usage
FROM pg_policies 
WHERE tablename = 'trainings' 
ORDER BY policyname;
