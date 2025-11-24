-- Skrypt weryfikacyjny - sprawdza czy UNIQUE constraint na training_users istnieje
-- Jeśli nie istnieje, wyświetli komunikat z instrukcją

DO $$
DECLARE
  constraint_exists BOOLEAN;
BEGIN
  -- Sprawdź czy constraint istnieje
  SELECT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'training_users_training_id_user_id_key'
    AND conrelid = 'training_users'::regclass
  ) INTO constraint_exists;
  
  IF NOT constraint_exists THEN
    RAISE WARNING 'UNIQUE constraint training_users_training_id_user_id_key NIE ISTNIEJE!';
    RAISE WARNING 'Uruchom skrypt: 14_fix_missing_unique_constraints.sql';
    RAISE WARNING 'To jest KRYTYCZNE dla poprawnego działania kontroli dostępu!';
  ELSE
    RAISE NOTICE 'UNIQUE constraint training_users_training_id_user_id_key istnieje - OK';
  END IF;
END $$;

-- Sprawdź również czy funkcja training_has_assignments istnieje
DO $$
DECLARE
  function_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM pg_proc 
    WHERE proname = 'training_has_assignments'
    AND pronamespace = 'public'::regnamespace
  ) INTO function_exists;
  
  IF NOT function_exists THEN
    RAISE WARNING 'Funkcja training_has_assignments() NIE ISTNIEJE!';
    RAISE WARNING 'Uruchom skrypt: 16_create_training_access_function.sql';
  ELSE
    RAISE NOTICE 'Funkcja training_has_assignments() istnieje - OK';
  END IF;
END $$;

-- Sprawdź czy policy została zaktualizowana
DO $$
DECLARE
  policy_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM pg_policies 
    WHERE schemaname = 'public'
    AND tablename = 'trainings'
    AND policyname = 'Users can view assigned or public trainings'
  ) INTO policy_exists;
  
  IF NOT policy_exists THEN
    RAISE WARNING 'RLS policy "Users can view assigned or public trainings" NIE ISTNIEJE!';
    RAISE WARNING 'Uruchom skrypt: 17_fix_trainings_access_rls.sql';
  ELSE
    RAISE NOTICE 'RLS policy "Users can view assigned or public trainings" istnieje - OK';
  END IF;
END $$;

-- Podsumowanie
SELECT 
  'Weryfikacja zakończona. Sprawdź komunikaty powyżej.' AS status;

