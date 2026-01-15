-- ALTERNATYWNE ROZWIĄZANIE - używa bezpośredniego zapytania zamiast funkcji
-- To rozwiązanie może działać lepiej jeśli funkcje SECURITY DEFINER nie działają poprawnie

-- Usuń starą politykę
DROP POLICY IF EXISTS "Users can view assigned or public trainings" ON trainings;

-- Nowa polityka używająca bezpośredniego zapytania
-- Używa EXISTS z podzapytaniem, które sprawdza training_users
-- RLS na training_users pozwala użytkownikom widzieć tylko swoje przypisania,
-- więc EXISTS zwróci true tylko jeśli użytkownik jest przypisany
CREATE POLICY "Users can view assigned or public trainings" ON trainings
  FOR SELECT USING (
    is_active = true AND (
      -- Użytkownik jest przypisany do kursu
      -- RLS na training_users automatycznie filtruje tylko przypisania tego użytkownika
      EXISTS (
        SELECT 1 
        FROM training_users tu
        WHERE tu.training_id = trainings.id
        AND tu.user_id = auth.uid()
      )
      OR
      -- Kurs nie ma przypisanych użytkowników (dostępny dla wszystkich)
      -- Używamy funkcji SECURITY DEFINER tylko do sprawdzenia czy są przypisania
      NOT public.training_has_assignments(trainings.id)
    )
  );

-- Sprawdź czy polityka została utworzona
SELECT 
  policyname,
  cmd,
  substring(qual, 1, 500) as policy_condition
FROM pg_policies 
WHERE tablename = 'trainings' 
  AND policyname = 'Users can view assigned or public trainings';

-- Upewnij się, że RLS jest włączone
ALTER TABLE trainings ENABLE ROW LEVEL SECURITY;

-- WAŻNE: Upewnij się, że RLS policy na training_users pozwala użytkownikom widzieć swoje przypisania
SELECT 
  policyname,
  cmd,
  substring(qual, 1, 200) as policy_condition
FROM pg_policies 
WHERE tablename = 'training_users'
  AND policyname = 'Users can view own training assignments';
