-- Triggery dla automatycznej aktualizacji updated_at
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trainings_updated_at 
  BEFORE UPDATE ON trainings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tests_updated_at 
  BEFORE UPDATE ON tests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_training_progress_updated_at 
  BEFORE UPDATE ON user_training_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger dla automatycznego tworzenia profilu po rejestracji
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger do automatycznego logowania audytowego przy ukończeniu szkolenia
CREATE OR REPLACE FUNCTION log_training_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Loguj ukończenie szkolenia
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    PERFORM public.log_audit_event(
      NEW.user_id,
      'training_completed',
      'training',
      NEW.training_id,
      jsonb_build_object(
        'training_id', NEW.training_id,
        'completion_time', NEW.total_time_seconds,
        'completed_at', NEW.completed_at
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_training_completed
  AFTER UPDATE ON user_training_progress
  FOR EACH ROW EXECUTE FUNCTION log_training_completion();

-- Trigger do automatycznego logowania audytowego przy rozpoczęciu testu
CREATE OR REPLACE FUNCTION log_test_started()
RETURNS TRIGGER AS $$
BEGIN
  -- Loguj rozpoczęcie testu
  PERFORM public.log_audit_event(
    NEW.user_id,
    'test_started',
    'test',
    NEW.test_id,
    jsonb_build_object(
      'test_id', NEW.test_id,
      'started_at', NEW.started_at
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_test_started
  AFTER INSERT ON user_test_attempts
  FOR EACH ROW EXECUTE FUNCTION log_test_started();

-- Trigger do automatycznego logowania audytowego przy ukończeniu testu
CREATE OR REPLACE FUNCTION log_test_completed()
RETURNS TRIGGER AS $$
BEGIN
  -- Loguj ukończenie testu
  IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
    PERFORM public.log_audit_event(
      NEW.user_id,
      'test_completed',
      'test',
      NEW.test_id,
      jsonb_build_object(
        'test_id', NEW.test_id,
        'score', NEW.score,
        'passed', NEW.passed,
        'completed_at', NEW.completed_at
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_test_completed
  AFTER UPDATE ON user_test_attempts
  FOR EACH ROW EXECUTE FUNCTION log_test_completed();

-- Trigger do automatycznego tworzenia powiadomienia o nowym szkoleniu
CREATE OR REPLACE FUNCTION notify_new_training()
RETURNS TRIGGER AS $$
BEGIN
  -- Utwórz powiadomienie dla wszystkich aktywnych użytkowników
  INSERT INTO public.notifications (user_id, type, title, message)
  SELECT 
    p.id,
    'new_training',
    'Nowe szkolenie dostępne',
    'Dostępne jest nowe szkolenie: ' || NEW.title
  FROM public.profiles p
  WHERE p.role IN ('user', 'admin', 'super_admin');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_new_training_created
  AFTER INSERT ON trainings
  FOR EACH ROW EXECUTE FUNCTION notify_new_training();
