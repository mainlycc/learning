-- USUNIĘCIE STAREJ POLITYKI I UPEWNIENIE SIĘ, ŻE NOWA DZIAŁA
-- Problem: Stara polityka "Users can view active trainings" może kolidować z nową

-- 1. Sprawdź wszystkie polityki na trainings
SELECT 
  policyname,
  cmd,
  substring(qual, 1, 200) as policy_condition
FROM pg_policies 
WHERE tablename = 'trainings' 
ORDER BY policyname;

-- 2. Usuń starą politykę, która pozwala wszystkim widzieć wszystkie aktywne szkolenia
DROP POLICY IF EXISTS "Users can view active trainings" ON trainings;

-- 3. Upewnij się, że nowa polityka istnieje
DROP POLICY IF EXISTS "Users can view assigned or public trainings" ON trainings;

-- 4. Utwórz nową politykę używającą bezpośredniego EXISTS
CREATE POLICY "Users can view assigned or public trainings" ON trainings
  FOR SELECT USING (
    is_active = true AND (
      -- Użytkownik jest przypisany do kursu
      EXISTS (
        SELECT 1 
        FROM training_users tu
        WHERE tu.training_id = trainings.id
        AND tu.user_id = auth.uid()
      )
      OR
      -- Kurs nie ma przypisanych użytkowników (dostępny dla wszystkich)
      NOT public.training_has_assignments(trainings.id)
    )
  );

-- 5. Sprawdź wszystkie polityki po zmianach
SELECT 
  policyname,
  cmd,
  substring(qual, 1, 200) as policy_condition
FROM pg_policies 
WHERE tablename = 'trainings' 
ORDER BY policyname;

-- 6. Upewnij się, że RLS jest włączone
ALTER TABLE trainings ENABLE ROW LEVEL SECURITY;
