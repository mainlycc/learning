-- Naprawa RLS policy dla test_questions - admini powinni widzieć pytania dla wszystkich szkoleń (nawet nieaktywnych)
-- Problem: Obecna polityka wymaga is_active = true, co blokuje widoczność pytań dla nieaktywnych szkoleń nawet dla adminów

-- Usuń starą politykę dla pytań testowych
DROP POLICY IF EXISTS "Users can view test questions for accessible trainings" ON test_questions;

-- Nowa polityka dla pytań testowych - admini widzą wszystkie pytania (nawet dla nieaktywnych szkoleń)
CREATE POLICY "Users can view test questions for accessible trainings" ON test_questions
  FOR SELECT USING (
    -- Admini widzą wszystkie pytania (nawet dla nieaktywnych szkoleń)
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
    OR
    -- Zwykli użytkownicy widzą pytania tylko dla aktywnych szkoleń, do których mają dostęp
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
  );

-- Komentarz wyjaśniający logikę
COMMENT ON POLICY "Users can view test questions for accessible trainings" ON test_questions IS 
'Admini widzą wszystkie pytania testowe (nawet dla nieaktywnych szkoleń).
Zwykli użytkownicy widzą pytania tylko dla aktywnych szkoleń, do których mają dostęp (przypisani lub szkolenia publiczne).';

