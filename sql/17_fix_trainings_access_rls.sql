-- Naprawa RLS policy dla trainings - używa funkcji pomocniczej z SECURITY DEFINER
-- Rozwiązuje problem z NOT EXISTS, który nie działał poprawnie z RLS na training_users
--
-- WYMAGANIA:
-- 1. Funkcja training_has_assignments() musi istnieć (16_create_training_access_function.sql)
-- 2. UNIQUE constraint na training_users powinien być dodany (14_fix_missing_unique_constraints.sql)

-- Usuń starą politykę dostępu dla użytkowników (jeśli istnieje)
DROP POLICY IF EXISTS "Users can view active trainings" ON trainings;
DROP POLICY IF EXISTS "Users can view assigned or public trainings" ON trainings;

-- Nowa polityka: użytkownicy widzą aktywne szkolenia, do których są przypisani
-- lub szkolenia bez przypisanych użytkowników (dostępne dla wszystkich)
-- UWAGA: Admini mają osobną politykę "Admins can view all trainings" która pozwala im widzieć wszystko
CREATE POLICY "Users can view assigned or public trainings" ON trainings
  FOR SELECT USING (
    is_active = true AND (
      -- Użytkownik jest przypisany do kursu
      EXISTS (
        SELECT 1 FROM training_users
        WHERE training_users.training_id = trainings.id
        AND training_users.user_id = auth.uid()
      )
      OR
      -- Kurs nie ma przypisanych użytkowników (dostępny dla wszystkich)
      -- Używamy funkcji pomocniczej z SECURITY DEFINER aby omijać RLS na training_users
      NOT public.training_has_assignments(trainings.id)
    )
  );

-- Komentarz wyjaśniający logikę
COMMENT ON POLICY "Users can view assigned or public trainings" ON trainings IS 
'Użytkownicy widzą aktywne szkolenia, do których są przypisani lub szkolenia bez przypisań (publiczne). 
Używa funkcji training_has_assignments() z SECURITY DEFINER aby poprawnie sprawdzić czy szkolenie ma przypisania, 
omijając ograniczenia RLS na training_users.';

