-- Funkcja pomocnicza do sprawdzania czy szkolenie ma przypisanych użytkowników
-- Używa SECURITY DEFINER aby omijać RLS na training_users
-- Ta funkcja jest używana w RLS policy dla trainings

CREATE OR REPLACE FUNCTION public.training_has_assignments(
  p_training_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  has_assignments BOOLEAN;
BEGIN
  -- Sprawdź czy istnieją jakiekolwiek przypisania dla tego szkolenia
  -- SECURITY DEFINER pozwala na dostęp do wszystkich rekordów w training_users
  -- niezależnie od RLS policies
  SELECT EXISTS (
    SELECT 1 
    FROM public.training_users
    WHERE training_id = p_training_id
  ) INTO has_assignments;
  
  RETURN COALESCE(has_assignments, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Komentarz wyjaśniający użycie funkcji
COMMENT ON FUNCTION public.training_has_assignments(UUID) IS 
'Sprawdza czy szkolenie ma przypisanych użytkowników. Używa SECURITY DEFINER aby omijać RLS na training_users. Używana w RLS policy dla trainings.';

