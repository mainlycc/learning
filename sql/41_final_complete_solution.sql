-- FINALNE KOMPLETNE ROZWIĄZANIE - naprawia wszystkie problemy z dostępem
-- URUCHOM TEN SKRYPT W BAZIE DANYCH

-- ============================================
-- KROK 1: Usuń WSZYSTKIE stare polityki na trainings
-- ============================================
DROP POLICY IF EXISTS "Users can view active trainings" ON trainings;
DROP POLICY IF EXISTS "Users can view assigned or public trainings" ON trainings;

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
  SELECT EXISTS (
    SELECT 1 
    FROM public.training_users
    WHERE training_id = p_training_id
  ) INTO has_assignments;
  
  RETURN COALESCE(has_assignments, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- KROK 3: Upewnij się, że RLS policy na training_users jest poprawna
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
-- KROK 4: Utwórz politykę dla adminów (jeśli nie istnieje)
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
-- KROK 5: Utwórz nową politykę dla zwykłych użytkowników
-- Używa bezpośredniego EXISTS - powinno działać
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
      -- RLS na training_users pozwala użytkownikom widzieć tylko swoje przypisania
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

-- ============================================
-- KROK 6: Upewnij się, że RLS jest włączone
-- ============================================
ALTER TABLE trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- KROK 7: Sprawdź wszystkie polityki
-- ============================================
SELECT 
  'Polityki na trainings:' as info,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'trainings' 
ORDER BY policyname;

SELECT 
  'Polityki na training_users:' as info,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'training_users'
ORDER BY policyname;

-- ============================================
-- KROK 8: Test - sprawdź przykładowe przypisania
-- ============================================
SELECT 
  'Statystyki przypisań:' as info,
  COUNT(*) as total_assignments,
  COUNT(DISTINCT tu.user_id) as unique_users,
  COUNT(DISTINCT tu.training_id) as unique_trainings
FROM training_users tu;
