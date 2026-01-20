-- NAPRAWA DOSTĘPU DO TESTÓW (analogicznie do szkoleń)
-- Użytkownik ma widzieć tylko testy:
-- - powiązane ze szkoleniami, do których ma dostęp (przypisany lub szkolenie publiczne)
-- - admin widzi wszystko
--
-- WYMAGANIA:
-- - Funkcje: user_is_assigned_to_training(), training_has_assignments(), user_is_admin()
--   zostały utworzone np. w 45_ultimate_fix_stack_overflow.sql
--
-- URUCHOM TEN SKRYPT W BAZIE DANYCH

-- ============================================
-- KROK 1: Usuń stare polityki na tests / test_questions / test_question_options
-- ============================================

DROP POLICY IF EXISTS "Users can view tests" ON tests;
DROP POLICY IF EXISTS "Users can view tests for accessible trainings" ON tests;

DROP POLICY IF EXISTS "Users can view test questions" ON test_questions;
DROP POLICY IF EXISTS "Users can view test questions for accessible trainings" ON test_questions;

DROP POLICY IF EXISTS "Users can view test question options" ON test_question_options;
DROP POLICY IF EXISTS "Users can view test question options for accessible trainings" ON test_question_options;

-- ============================================
-- KROK 2: Polityka na tests
-- ============================================
-- Logika:
-- - Admin: widzi wszystkie testy
-- - Zwykły użytkownik: widzi test, jeśli ma dostęp do powiązanego szkolenia
--   (czyli szkolenie aktywne i:
--      - użytkownik jest przypisany
--      - albo szkolenie nie ma przypisań = publiczne)

CREATE POLICY "Users can view tests for accessible trainings" ON tests
  FOR SELECT USING (
    -- Admini widzą wszystkie testy
    public.user_is_admin(auth.uid())
    OR
    -- Zwykli użytkownicy - dostęp tylko do testów dla szkoleń, do których mają dostęp
    EXISTS (
      SELECT 1
      FROM public.trainings tr
      WHERE tr.id = tests.training_id
        AND tr.is_active = true
        AND (
          public.user_is_assigned_to_training(auth.uid(), tr.id)
          OR NOT public.training_has_assignments(tr.id)
        )
    )
  );

COMMENT ON POLICY "Users can view tests for accessible trainings" ON tests IS
'Użytkownicy widzą testy tylko dla szkoleń, do których mają dostęp (przypisani lub szkolenia publiczne). Admini widzą wszystkie testy.';

-- ============================================
-- KROK 3: Polityka na test_questions
-- ============================================
-- Logika:
-- - Admin: widzi wszystkie pytania (nawet dla nieaktywnych szkoleń)
-- - Zwykły użytkownik: widzi pytania tylko dla testów szkoleń, do których ma dostęp

CREATE POLICY "Users can view test questions for accessible trainings" ON test_questions
  FOR SELECT USING (
    -- Admini widzą wszystkie pytania
    public.user_is_admin(auth.uid())
    OR
    -- Zwykli użytkownicy - tylko pytania do testów dostępnych szkoleń
    EXISTS (
      SELECT 1
      FROM public.tests t
      JOIN public.trainings tr ON tr.id = t.training_id
      WHERE t.id = test_questions.test_id
        AND tr.is_active = true
        AND (
          public.user_is_assigned_to_training(auth.uid(), tr.id)
          OR NOT public.training_has_assignments(tr.id)
        )
    )
  );

COMMENT ON POLICY "Users can view test questions for accessible trainings" ON test_questions IS
'Użytkownicy widzą pytania testowe tylko dla testów szkoleń, do których mają dostęp. Admini widzą wszystkie pytania.';

-- ============================================
-- KROK 4: Polityka na test_question_options
-- ============================================
-- Logika:
-- - Admin: widzi wszystkie opcje
-- - Zwykły użytkownik: widzi opcje tylko dla pytań/testów szkoleń, do których ma dostęp

CREATE POLICY "Users can view test question options for accessible trainings" ON test_question_options
  FOR SELECT USING (
    -- Admini widzą wszystkie opcje
    public.user_is_admin(auth.uid())
    OR
    -- Zwykli użytkownicy - tylko opcje dla dostępnych testów
    EXISTS (
      SELECT 1
      FROM public.test_questions tq
      JOIN public.tests t ON t.id = tq.test_id
      JOIN public.trainings tr ON tr.id = t.training_id
      WHERE tq.id = test_question_options.question_id
        AND tr.is_active = true
        AND (
          public.user_is_assigned_to_training(auth.uid(), tr.id)
          OR NOT public.training_has_assignments(tr.id)
        )
    )
  );

COMMENT ON POLICY "Users can view test question options for accessible trainings" ON test_question_options IS
'Użytkownicy widzą opcje pytań testowych tylko dla testów szkoleń, do których mają dostęp. Admini widzą wszystkie opcje.';

-- ============================================
-- KROK 5: Upewnij się, że RLS jest włączone
-- ============================================

ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_question_options ENABLE ROW LEVEL SECURITY;

-- ============================================
-- KROK 6: Podgląd aktualnych polityk
-- ============================================

SELECT 
  'Polityki na tests:' as info,
  policyname,
  cmd,
  substring(qual, 1, 200) as policy_condition_preview
FROM pg_policies 
WHERE tablename = 'tests' 
ORDER BY policyname;

SELECT 
  'Polityki na test_questions:' as info,
  policyname,
  cmd,
  substring(qual, 1, 200) as policy_condition_preview
FROM pg_policies 
WHERE tablename = 'test_questions' 
ORDER BY policyname;

SELECT 
  'Polityki na test_question_options:' as info,
  policyname,
  cmd,
  substring(qual, 1, 200) as policy_condition_preview
FROM pg_policies 
WHERE tablename = 'test_question_options' 
ORDER BY policyname;

