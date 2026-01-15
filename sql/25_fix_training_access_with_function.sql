-- Naprawa dostępu do szkoleń - używa funkcji pomocniczych z SECURITY DEFINER
-- Rozwiązuje problem z RLS na training_users, który blokował sprawdzanie przypisań
--
-- WYMAGANIA:
-- 1. Funkcja training_has_assignments() musi istnieć (16_create_training_access_function.sql)
-- 2. UNIQUE constraint na training_users powinien być dodany (14_fix_missing_unique_constraints.sql)

-- Funkcja pomocnicza do sprawdzania czy użytkownik jest przypisany do szkolenia
-- Używa SECURITY DEFINER aby omijać RLS na training_users
CREATE OR REPLACE FUNCTION public.user_is_assigned_to_training(
  p_user_id UUID,
  p_training_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  is_assigned BOOLEAN;
BEGIN
  -- Sprawdź czy użytkownik jest przypisany do szkolenia
  -- SECURITY DEFINER pozwala na dostęp do wszystkich rekordów w training_users
  -- niezależnie od RLS policies
  SELECT EXISTS (
    SELECT 1 
    FROM public.training_users
    WHERE training_id = p_training_id
    AND user_id = p_user_id
  ) INTO is_assigned;
  
  RETURN COALESCE(is_assigned, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Komentarz wyjaśniający użycie funkcji
COMMENT ON FUNCTION public.user_is_assigned_to_training(UUID, UUID) IS 
'Sprawdza czy użytkownik jest przypisany do szkolenia. Używa SECURITY DEFINER aby omijać RLS na training_users. Używana w RLS policy dla trainings.';

-- Usuń starą politykę dostępu dla użytkowników (jeśli istnieje)
DROP POLICY IF EXISTS "Users can view active trainings" ON trainings;
DROP POLICY IF EXISTS "Users can view assigned or public trainings" ON trainings;

-- Nowa polityka: użytkownicy widzą aktywne szkolenia, do których są przypisani
-- lub szkolenia bez przypisanych użytkowników (dostępne dla wszystkich)
-- UWAGA: Admini mają osobną politykę "Admins can view all trainings" która pozwala im widzieć wszystko
CREATE POLICY "Users can view assigned or public trainings" ON trainings
  FOR SELECT USING (
    is_active = true AND (
      -- Użytkownik jest przypisany do kursu - użyj funkcji pomocniczej z SECURITY DEFINER
      public.user_is_assigned_to_training(auth.uid(), trainings.id)
      OR
      -- Kurs nie ma przypisanych użytkowników (dostępny dla wszystkich)
      -- Używamy funkcji pomocniczej z SECURITY DEFINER aby omijać RLS na training_users
      NOT public.training_has_assignments(trainings.id)
    )
  );

-- Komentarz wyjaśniający logikę
COMMENT ON POLICY "Users can view assigned or public trainings" ON trainings IS 
'Użytkownicy widzą aktywne szkolenia, do których są przypisani lub szkolenia bez przypisań (publiczne). 
Używa funkcji user_is_assigned_to_training() i training_has_assignments() z SECURITY DEFINER aby poprawnie sprawdzić przypisania, 
omijając ograniczenia RLS na training_users.';
