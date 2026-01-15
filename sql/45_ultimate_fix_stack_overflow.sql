-- OSTATECZNA NAPRAWA BŁĘDU "stack depth limit exceeded"
-- Ten skrypt usuwa WSZYSTKIE stare polityki i tworzy nowe używające funkcji SECURITY DEFINER
-- URUCHOM TEN SKRYPT W BAZIE DANYCH

-- ============================================
-- KROK 1: Usuń WSZYSTKIE stare polityki na trainings
-- ============================================
DROP POLICY IF EXISTS "Users can view active trainings" ON trainings;
DROP POLICY IF EXISTS "Users can view assigned or public trainings" ON trainings;
DROP POLICY IF EXISTS "Admins can view all trainings" ON trainings;

-- ============================================
-- KROK 2: Utworzenie funkcji pomocniczych z SECURITY DEFINER
-- ============================================

-- Funkcja sprawdzająca czy użytkownik jest przypisany do szkolenia
CREATE OR REPLACE FUNCTION public.user_is_assigned_to_training(
  p_user_id UUID,
  p_training_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  is_assigned BOOLEAN;
BEGIN
  -- SECURITY DEFINER omija RLS na training_users - eliminuje rekurencję
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
'Sprawdza czy użytkownik jest przypisany do szkolenia. Używa SECURITY DEFINER aby omijać RLS na training_users i eliminować rekurencję.';

-- Funkcja sprawdzająca czy szkolenie ma przypisanych użytkowników
CREATE OR REPLACE FUNCTION public.training_has_assignments(
  p_training_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  has_assignments BOOLEAN;
BEGIN
  -- SECURITY DEFINER omija RLS na training_users - eliminuje rekurencję
  SELECT EXISTS (
    SELECT 1 
    FROM public.training_users
    WHERE training_id = p_training_id
  ) INTO has_assignments;
  
  RETURN COALESCE(has_assignments, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.training_has_assignments IS 
'Sprawdza czy szkolenie ma przypisanych użytkowników. Używa SECURITY DEFINER aby omijać RLS na training_users i eliminować rekurencję.';

-- Funkcja sprawdzająca czy użytkownik jest adminem (również z SECURITY DEFINER dla bezpieczeństwa)
CREATE OR REPLACE FUNCTION public.user_is_admin(
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles
    WHERE id = p_user_id 
    AND role IN ('admin', 'super_admin')
  ) INTO is_admin;
  
  RETURN COALESCE(is_admin, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.user_is_admin IS 
'Sprawdza czy użytkownik jest administratorem. Używa SECURITY DEFINER dla spójności.';

-- ============================================
-- KROK 3: Utwórz politykę dla adminów (najpierw, aby była sprawdzana jako pierwsza)
-- ============================================
CREATE POLICY "Admins can view all trainings" ON trainings
  FOR SELECT USING (
    public.user_is_admin(auth.uid())
  );

-- ============================================
-- KROK 4: Utwórz politykę dla zwykłych użytkowników
-- Używa funkcji SECURITY DEFINER aby uniknąć rekurencji
-- ============================================
CREATE POLICY "Users can view assigned or public trainings" ON trainings
  FOR SELECT USING (
    -- Tylko dla użytkowników, którzy NIE są adminami
    NOT public.user_is_admin(auth.uid())
    AND
    is_active = true 
    AND (
      -- Użytkownik jest przypisany do kursu
      public.user_is_assigned_to_training(auth.uid(), trainings.id)
      OR
      -- Kurs nie ma przypisanych użytkowników (dostępny dla wszystkich)
      NOT public.training_has_assignments(trainings.id)
    )
  );

-- ============================================
-- KROK 5: Upewnij się, że RLS jest włączone
-- ============================================
ALTER TABLE trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- KROK 6: Sprawdź wszystkie polityki
-- ============================================
SELECT 
  'Polityki na trainings:' as info,
  policyname,
  cmd,
  substring(qual, 1, 200) as policy_condition_preview
FROM pg_policies 
WHERE tablename = 'trainings' 
ORDER BY policyname;

-- ============================================
-- KROK 7: Sprawdź czy funkcje zostały utworzone
-- ============================================
SELECT 
  'Funkcje pomocnicze:' as info,
  proname as function_name,
  pronamespace::regnamespace as schema_name
FROM pg_proc 
WHERE proname IN ('user_is_assigned_to_training', 'training_has_assignments', 'user_is_admin')
ORDER BY proname;

-- ============================================
-- KROK 8: Test - sprawdź czy funkcje działają
-- ============================================
-- Test funkcji (uruchom jako admin aby zobaczyć wszystkie przypisania)
SELECT 
  'Test funkcji:' as info,
  COUNT(*) as total_assignments,
  COUNT(DISTINCT tu.training_id) as unique_trainings,
  COUNT(DISTINCT tu.user_id) as unique_users
FROM training_users tu
WHERE public.user_is_assigned_to_training(tu.user_id, tu.training_id) = true;

-- ============================================
-- KROK 9: Sprawdź aktywne szkolenia z przypisaniami
-- ============================================
SELECT 
  'Aktywne szkolenia z przypisaniami:' as info,
  COUNT(*) as count
FROM trainings t
WHERE t.is_active = true
  AND public.training_has_assignments(t.id) = true;
