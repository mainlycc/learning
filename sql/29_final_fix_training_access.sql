-- FINALNA NAPRAWA DOSTĘPU DO SZKOLEŃ
-- Ten skrypt naprawia wszystkie znane problemy z dostępem
-- URUCHOM TEN SKRYPT W BAZIE DANYCH

-- ============================================
-- KROK 1: Upewnij się, że funkcja training_has_assignments istnieje
-- ============================================

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

-- ============================================
-- KROK 2: Utworzenie funkcji user_is_assigned_to_training
-- ============================================

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

-- ============================================
-- KROK 3: Naprawa RLS policy na training_users
-- ============================================

DROP POLICY IF EXISTS "Admins can manage training users" ON training_users;
DROP POLICY IF EXISTS "Users can view own training assignments" ON training_users;

-- Admini mogą zarządzać wszystkimi przypisaniami
CREATE POLICY "Admins can manage training users" ON training_users
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Użytkownicy widzą tylko swoje przypisania
CREATE POLICY "Users can view own training assignments" ON training_users
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- KROK 4: Naprawa RLS policy na trainings
-- ============================================

-- Usuń wszystkie stare polityki
DROP POLICY IF EXISTS "Users can view active trainings" ON trainings;
DROP POLICY IF EXISTS "Users can view assigned or public trainings" ON trainings;

-- Upewnij się, że polityka dla adminów istnieje
DROP POLICY IF EXISTS "Admins can view all trainings" ON trainings;
CREATE POLICY "Admins can view all trainings" ON trainings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Nowa polityka dla zwykłych użytkowników
CREATE POLICY "Users can view assigned or public trainings" ON trainings
  FOR SELECT USING (
    is_active = true AND (
      -- Użytkownik jest przypisany do kursu
      public.user_is_assigned_to_training(auth.uid(), trainings.id)
      OR
      -- Kurs nie ma przypisanych użytkowników (dostępny dla wszystkich)
      NOT public.training_has_assignments(trainings.id)
    )
  );

-- ============================================
-- KROK 5: Sprawdzenie czy wszystko działa
-- ============================================

-- Sprawdź czy funkcje istnieją
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'training_has_assignments') THEN
    RAISE EXCEPTION 'Funkcja training_has_assignments nie została utworzona!';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'user_is_assigned_to_training') THEN
    RAISE EXCEPTION 'Funkcja user_is_assigned_to_training nie została utworzona!';
  END IF;
  
  RAISE NOTICE '✓ Wszystkie funkcje zostały utworzone poprawnie';
  RAISE NOTICE '✓ RLS policies zostały zaktualizowane';
  RAISE NOTICE '✓ System powinien teraz działać poprawnie';
END $$;

-- ============================================
-- WAŻNE UWAGI:
-- ============================================
-- 1. Upewnij się, że szkolenia mają is_active = true (użytkownicy widzą tylko aktywne szkolenia)
-- 2. Sprawdź czy przypisania są zapisane w tabeli training_users
-- 3. Uruchom skrypt 28_test_training_access.sql aby zdiagnozować problemy
