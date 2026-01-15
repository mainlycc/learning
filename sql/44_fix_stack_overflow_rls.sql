-- NAPRAWA BŁĘDU "stack depth limit exceeded"
-- Problem: Polityka RLS używa bezpośredniego EXISTS na training_users, co powoduje rekurencję
-- Rozwiązanie: Użyj funkcji SECURITY DEFINER, która omija RLS podczas sprawdzania przypisań

-- ============================================
-- KROK 1: Utworzenie funkcji pomocniczej user_is_assigned_to_training
-- ============================================

CREATE OR REPLACE FUNCTION public.user_is_assigned_to_training(
  p_user_id UUID,
  p_training_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  is_assigned BOOLEAN;
BEGIN
  -- SECURITY DEFINER omija RLS na training_users
  SELECT EXISTS (
    SELECT 1 
    FROM public.training_users
    WHERE training_id = p_training_id
    AND user_id = p_user_id
  ) INTO is_assigned;
  
  RETURN COALESCE(is_assigned, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.user_is_assigned_to_training IS 
'Sprawdza czy użytkownik jest przypisany do szkolenia. Używa SECURITY DEFINER aby omijać RLS na training_users.';

-- ============================================
-- KROK 2: Upewnij się, że funkcja training_has_assignments istnieje
-- ============================================

CREATE OR REPLACE FUNCTION public.training_has_assignments(
  p_training_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  has_assignments BOOLEAN;
BEGIN
  -- SECURITY DEFINER omija RLS na training_users
  SELECT EXISTS (
    SELECT 1 
    FROM public.training_users
    WHERE training_id = p_training_id
  ) INTO has_assignments;
  
  RETURN COALESCE(has_assignments, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.training_has_assignments IS 
'Sprawdza czy szkolenie ma przypisanych użytkowników. Używa SECURITY DEFINER aby omijać RLS na training_users.';

-- ============================================
-- KROK 3: Usuń starą politykę, która powoduje rekurencję
-- ============================================

DROP POLICY IF EXISTS "Users can view assigned or public trainings" ON trainings;

-- ============================================
-- KROK 4: Utwórz nową politykę używającą funkcji SECURITY DEFINER
-- ============================================

CREATE POLICY "Users can view assigned or public trainings" ON trainings
  FOR SELECT USING (
    -- Tylko dla użytkowników, którzy NIE są adminami
    NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
    AND
    is_active = true 
    AND (
      -- Użytkownik jest przypisany do kursu
      -- Używamy funkcji SECURITY DEFINER aby uniknąć rekurencji
      public.user_is_assigned_to_training(auth.uid(), trainings.id)
      OR
      -- Kurs nie ma przypisanych użytkowników (dostępny dla wszystkich)
      -- Używamy funkcji SECURITY DEFINER aby uniknąć rekurencji
      NOT public.training_has_assignments(trainings.id)
    )
  );

-- ============================================
-- KROK 5: Upewnij się, że polityka dla adminów istnieje
-- ============================================

DROP POLICY IF EXISTS "Admins can view all trainings" ON trainings;
CREATE POLICY "Admins can view all trainings" ON trainings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- ============================================
-- KROK 6: Sprawdź wszystkie polityki
-- ============================================

SELECT 
  'Polityki na trainings:' as info,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'trainings' 
ORDER BY policyname;

-- ============================================
-- KROK 7: Test - sprawdź czy funkcje działają
-- ============================================

-- Test funkcji (uruchom jako admin aby zobaczyć wszystkie przypisania)
SELECT 
  'Test funkcji user_is_assigned_to_training:' as info,
  COUNT(*) as total_assignments
FROM training_users tu
WHERE public.user_is_assigned_to_training(tu.user_id, tu.training_id) = true;
