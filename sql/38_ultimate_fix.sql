-- OSTATECZNE ROZWIĄZANIE - używa bezpośredniego EXISTS
-- To rozwiązanie powinno działać, ponieważ RLS na training_users pozwala użytkownikom widzieć swoje przypisania

-- Usuń starą politykę
DROP POLICY IF EXISTS "Users can view assigned or public trainings" ON trainings;

-- Nowa polityka używająca bezpośredniego EXISTS
-- RLS na training_users automatycznie filtruje tylko przypisania użytkownika
CREATE POLICY "Users can view assigned or public trainings" ON trainings
  FOR SELECT USING (
    is_active = true AND (
      -- Użytkownik jest przypisany do kursu
      -- EXISTS sprawdzi training_users, a RLS na training_users pozwoli zobaczyć tylko swoje przypisania
      EXISTS (
        SELECT 1 
        FROM training_users tu
        WHERE tu.training_id = trainings.id
        AND tu.user_id = auth.uid()
      )
      OR
      -- Kurs nie ma przypisanych użytkowników (dostępny dla wszystkich)
      -- Używamy funkcji SECURITY DEFINER do sprawdzenia czy są przypisania
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

-- Test: sprawdź czy użytkownik widzi swoje przypisania
-- (Uruchom to jako zalogowany użytkownik, nie jako admin!)
-- SELECT 
--   t.id,
--   t.title,
--   t.is_active,
--   EXISTS (
--     SELECT 1 
--     FROM training_users tu
--     WHERE tu.training_id = t.id
--     AND tu.user_id = auth.uid()
--   ) as user_is_assigned
-- FROM trainings t
-- WHERE t.is_active = true
-- ORDER BY t.title;
