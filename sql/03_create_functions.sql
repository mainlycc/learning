-- Funkcja do automatycznej aktualizacji updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Funkcja do automatycznego tworzenia profilu po rejestracji
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    'user'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funkcja do logowania audytowego
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_user_id UUID,
  p_action_type TEXT,
  p_resource_type TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action_type,
    resource_type,
    resource_id,
    metadata
  ) VALUES (
    p_user_id,
    p_action_type,
    p_resource_type,
    p_resource_id,
    p_metadata
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funkcja do tworzenia powiadomienia
-- Obsługuje opcjonalny parametr training_id dla powiadomień związanych ze szkoleniami
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_training_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    training_id
  ) VALUES (
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_training_id
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funkcja do sprawdzania uprawnień użytkownika
CREATE OR REPLACE FUNCTION public.user_has_role(
  p_user_id UUID,
  p_required_role TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = p_user_id;
  
  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Hierarchia ról: super_admin > admin > user
  CASE p_required_role
    WHEN 'user' THEN
      RETURN user_role IN ('user', 'admin', 'super_admin');
    WHEN 'admin' THEN
      RETURN user_role IN ('admin', 'super_admin');
    WHEN 'super_admin' THEN
      RETURN user_role = 'super_admin';
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funkcja do obliczania postępu szkolenia
CREATE OR REPLACE FUNCTION public.calculate_training_progress(
  p_user_id UUID,
  p_training_id UUID
)
RETURNS TABLE(
  current_slide INTEGER,
  total_slides INTEGER,
  progress_percentage NUMERIC,
  total_time_spent INTEGER,
  status TEXT
) AS $$
DECLARE
  user_progress RECORD;
  total_slides INTEGER;
BEGIN
  -- Pobierz postęp użytkownika
  SELECT * INTO user_progress
  FROM public.user_training_progress
  WHERE user_id = p_user_id AND training_id = p_training_id;
  
  -- Pobierz liczbę slajdów
  SELECT COUNT(*) INTO total_slides
  FROM public.training_slides
  WHERE training_id = p_training_id;
  
  -- Jeśli brak postępu, zwróć domyślne wartości
  IF user_progress IS NULL THEN
    RETURN QUERY SELECT 
      1 as current_slide,
      total_slides as total_slides,
      0.0 as progress_percentage,
      0 as total_time_spent,
      'not_started'::TEXT as status;
    RETURN;
  END IF;
  
  -- Oblicz procent postępu
  RETURN QUERY SELECT 
    user_progress.current_slide,
    total_slides,
    CASE 
      WHEN total_slides > 0 THEN 
        (user_progress.current_slide::NUMERIC / total_slides::NUMERIC) * 100
      ELSE 0 
    END as progress_percentage,
    user_progress.total_time_seconds,
    user_progress.status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funkcja do generowania raportu miesięcznego
CREATE OR REPLACE FUNCTION public.generate_monthly_report(
  p_year INTEGER,
  p_month INTEGER,
  p_generated_by UUID
)
RETURNS UUID AS $$
DECLARE
  report_id UUID;
  report_data JSONB;
BEGIN
  -- Zbierz dane dla raportu
  SELECT jsonb_build_object(
    'trainings_completed', (
      SELECT COUNT(*) 
      FROM user_training_progress 
      WHERE status = 'completed' 
        AND EXTRACT(YEAR FROM completed_at) = p_year 
        AND EXTRACT(MONTH FROM completed_at) = p_month
    ),
    'total_users_active', (
      SELECT COUNT(DISTINCT user_id) 
      FROM user_training_progress 
      WHERE EXTRACT(YEAR FROM created_at) = p_year 
        AND EXTRACT(MONTH FROM created_at) = p_month
    ),
    'average_completion_time', (
      SELECT AVG(total_time_seconds) 
      FROM user_training_progress 
      WHERE status = 'completed' 
        AND EXTRACT(YEAR FROM completed_at) = p_year 
        AND EXTRACT(MONTH FROM completed_at) = p_month
    )
  ) INTO report_data;
  
  -- Wstaw raport
  INSERT INTO public.monthly_reports (
    year,
    month,
    generated_by,
    data
  ) VALUES (
    p_year,
    p_month,
    p_generated_by,
    report_data
  ) RETURNING id INTO report_id;
  
  RETURN report_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
