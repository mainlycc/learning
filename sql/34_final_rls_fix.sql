-- FINALNA NAPRAWA RLS POLICY
-- Ten skrypt naprawia wszystkie problemy z dostępem do szkoleń

-- 1. Sprawdź czy funkcje istnieją i są dostępne
SELECT 
  proname as function_name,
  pronamespace::regnamespace as schema_name,
  prosrc as function_body_preview
FROM pg_proc 
WHERE proname IN ('user_is_assigned_to_training', 'training_has_assignments')
ORDER BY proname;

-- 2. Usuń starą politykę
DROP POLICY IF EXISTS "Users can view assigned or public trainings" ON trainings;

-- 3. Upewnij się, że funkcje istnieją - jeśli nie, utwórz je
CREATE OR REPLACE FUNCTION public.training_has_assignments(
  p_training_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  has_assignments BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM public.training_users
    WHERE training_id = p_training_id
  ) INTO has_assignments;
  
  RETURN COALESCE(has_assignments, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.user_is_assigned_to_training(
  p_user_id UUID,
  p_training_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  is_assigned BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM public.training_users
    WHERE training_id = p_training_id
    AND user_id = p_user_id
  ) INTO is_assigned;
  
  RETURN COALESCE(is_assigned, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Utwórz politykę używającą funkcji - użyj pełnej ścieżki z public.
-- PostgreSQL może automatycznie usuwać prefiks w niektórych kontekstach,
-- ale ważne jest, aby funkcje były w schemacie public
CREATE POLICY "Users can view assigned or public trainings" ON trainings
  FOR SELECT USING (
    is_active = true AND (
      public.user_is_assigned_to_training(auth.uid(), trainings.id)
      OR
      NOT public.training_has_assignments(trainings.id)
    )
  );

-- 5. Upewnij się, że RLS jest włączone
ALTER TABLE trainings ENABLE ROW LEVEL SECURITY;

-- 6. Sprawdź aktualną politykę
SELECT 
  policyname,
  cmd,
  substring(qual, 1, 500) as policy_condition
FROM pg_policies 
WHERE tablename = 'trainings' 
  AND policyname = 'Users can view assigned or public trainings';

-- 7. Test funkcji na przykładowych danych
-- (Zastąp wartości rzeczywistymi ID z bazy)
DO $$
DECLARE
  test_training_id UUID;
  test_user_id UUID;
BEGIN
  -- Pobierz pierwsze aktywne szkolenie z przypisaniami
  SELECT t.id INTO test_training_id
  FROM trainings t
  WHERE t.is_active = true
    AND EXISTS (SELECT 1 FROM training_users tu WHERE tu.training_id = t.id)
  LIMIT 1;
  
  -- Pobierz pierwszego użytkownika przypisanego do tego szkolenia
  IF test_training_id IS NOT NULL THEN
    SELECT tu.user_id INTO test_user_id
    FROM training_users tu
    WHERE tu.training_id = test_training_id
    LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
      RAISE NOTICE 'Test funkcji:';
      RAISE NOTICE '  training_has_assignments(%) = %', test_training_id, public.training_has_assignments(test_training_id);
      RAISE NOTICE '  user_is_assigned_to_training(%, %) = %', test_user_id, test_training_id, public.user_is_assigned_to_training(test_user_id, test_training_id);
    END IF;
  END IF;
END $$;
