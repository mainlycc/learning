-- Włącz RLS na wszystkich tabelach
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_slide_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_reports ENABLE ROW LEVEL SECURITY;

-- Profiles: użytkownicy widzą swój profil, admini widzą wszystko
-- TYMCZASOWO WYŁĄCZAMY RLS DLA PROFILES ABY NAPRAWIĆ REKURENCJĘ
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Umożliwiamy wszystkim zalogowanym użytkownikom dostęp do własnego profilu
CREATE POLICY "Users can manage own profile" ON profiles
  FOR ALL USING (auth.uid() = id);

-- Włączamy RLS ponownie
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Usuwamy starą policy która powodowała rekurencję
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Trainings: wszyscy mogą czytać aktywne szkolenia, tylko admini mogą modyfikować
CREATE POLICY "Users can view active trainings" ON trainings
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can view all trainings" ON trainings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can insert trainings" ON trainings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update trainings" ON trainings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can delete trainings" ON trainings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Training slides: dostępne dla wszystkich zalogowanych
CREATE POLICY "Users can view training slides" ON training_slides
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trainings
      WHERE trainings.id = training_slides.training_id
      AND trainings.is_active = true
    )
  );

CREATE POLICY "Admins can manage training slides" ON training_slides
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Tests: użytkownicy widzą testy przypisanych szkoleń, admini zarządzają
CREATE POLICY "Users can view tests" ON tests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trainings
      WHERE trainings.id = tests.training_id
      AND trainings.is_active = true
    )
  );

CREATE POLICY "Admins can manage tests" ON tests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Test questions: podobnie jak testy
CREATE POLICY "Users can view test questions" ON test_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tests t
      JOIN trainings tr ON tr.id = t.training_id
      WHERE t.id = test_questions.test_id
      AND tr.is_active = true
    )
  );

CREATE POLICY "Admins can manage test questions" ON test_questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Test question options
CREATE POLICY "Users can view test question options" ON test_question_options
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM test_questions tq
      JOIN tests t ON t.id = tq.test_id
      JOIN trainings tr ON tr.id = t.training_id
      WHERE tq.id = test_question_options.question_id
      AND tr.is_active = true
    )
  );

CREATE POLICY "Admins can manage test question options" ON test_question_options
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- User training progress: użytkownicy widzą tylko swoje postępy
CREATE POLICY "Users can view own progress" ON user_training_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" ON user_training_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON user_training_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all progress" ON user_training_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- User slide activity
CREATE POLICY "Users can manage own slide activity" ON user_slide_activity
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_training_progress
      WHERE user_training_progress.id = user_slide_activity.progress_id
      AND user_training_progress.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all slide activity" ON user_slide_activity
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- User test attempts
CREATE POLICY "Users can view own test attempts" ON user_test_attempts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own test attempts" ON user_test_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own test attempts" ON user_test_attempts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all test attempts" ON user_test_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Access policies: admini zarządzają
CREATE POLICY "Admins can manage access policies" ON access_policies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Audit logs: admini widzą wszystko
CREATE POLICY "Admins can view audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "All users can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Notifications: użytkownicy widzą tylko swoje powiadomienia
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert notifications" ON notifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Monthly reports: admini zarządzają
CREATE POLICY "Admins can manage monthly reports" ON monthly_reports
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );
