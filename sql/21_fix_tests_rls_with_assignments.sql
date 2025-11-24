-- Naprawa RLS policies dla testów - uwzględnia przypisania użytkowników do szkoleń
-- Testy powinny być widoczne tylko dla użytkowników, którzy mają dostęp do szkolenia
--
-- WYMAGANIA:
-- 1. Funkcja training_has_assignments() musi istnieć (16_create_training_access_function.sql)
-- 2. UNIQUE constraint na training_users powinien być dodany (14_fix_missing_unique_constraints.sql)

-- Usuń stare polityki dla testów (jeśli istnieją)
DROP POLICY IF EXISTS "Users can view tests" ON tests;
DROP POLICY IF EXISTS "Users can view test questions" ON test_questions;
DROP POLICY IF EXISTS "Users can view test question options" ON test_question_options;

-- Nowa polityka dla testów: użytkownicy widzą testy dla szkoleń, do których mają dostęp
-- (przypisani lub szkolenia bez przypisań - publiczne)
CREATE POLICY "Users can view tests for accessible trainings" ON tests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trainings
      WHERE trainings.id = tests.training_id
      AND trainings.is_active = true
      AND (
        -- Użytkownik jest przypisany do szkolenia
        EXISTS (
          SELECT 1 FROM training_users
          WHERE training_users.training_id = trainings.id
          AND training_users.user_id = auth.uid()
        )
        OR
        -- Szkolenie nie ma przypisanych użytkowników (dostępne dla wszystkich)
        NOT public.training_has_assignments(trainings.id)
      )
    )
    OR
    -- Admini widzą wszystkie testy
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Nowa polityka dla pytań testowych
CREATE POLICY "Users can view test questions for accessible trainings" ON test_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tests t
      JOIN trainings tr ON tr.id = t.training_id
      WHERE t.id = test_questions.test_id
      AND tr.is_active = true
      AND (
        -- Użytkownik jest przypisany do szkolenia
        EXISTS (
          SELECT 1 FROM training_users
          WHERE training_users.training_id = tr.id
          AND training_users.user_id = auth.uid()
        )
        OR
        -- Szkolenie nie ma przypisanych użytkowników (dostępne dla wszystkich)
        NOT public.training_has_assignments(tr.id)
      )
    )
    OR
    -- Admini widzą wszystkie pytania
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Nowa polityka dla opcji pytań testowych
CREATE POLICY "Users can view test question options for accessible trainings" ON test_question_options
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM test_questions tq
      JOIN tests t ON t.id = tq.test_id
      JOIN trainings tr ON tr.id = t.training_id
      WHERE tq.id = test_question_options.question_id
      AND tr.is_active = true
      AND (
        -- Użytkownik jest przypisany do szkolenia
        EXISTS (
          SELECT 1 FROM training_users
          WHERE training_users.training_id = tr.id
          AND training_users.user_id = auth.uid()
        )
        OR
        -- Szkolenie nie ma przypisanych użytkowników (dostępne dla wszystkich)
        NOT public.training_has_assignments(tr.id)
      )
    )
    OR
    -- Admini widzą wszystkie opcje
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Komentarze wyjaśniające logikę
COMMENT ON POLICY "Users can view tests for accessible trainings" ON tests IS 
'Użytkownicy widzą testy dla szkoleń, do których mają dostęp (przypisani lub szkolenia publiczne). 
Używa funkcji training_has_assignments() z SECURITY DEFINER aby poprawnie sprawdzić czy szkolenie ma przypisania, 
omijając ograniczenia RLS na training_users.';

COMMENT ON POLICY "Users can view test questions for accessible trainings" ON test_questions IS 
'Użytkownicy widzą pytania testowe dla szkoleń, do których mają dostęp.';

COMMENT ON POLICY "Users can view test question options for accessible trainings" ON test_question_options IS 
'Użytkownicy widzą opcje pytań testowych dla szkoleń, do których mają dostęp.';

