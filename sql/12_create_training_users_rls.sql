-- Włącz RLS na tabeli training_users
ALTER TABLE training_users ENABLE ROW LEVEL SECURITY;

-- Usuń istniejące polityki jeśli istnieją (dla idempotentności)
DROP POLICY IF EXISTS "Admins can manage training users" ON training_users;
DROP POLICY IF EXISTS "Users can view own training assignments" ON training_users;

-- Admini mogą zarządzać wszystkimi przypisaniami
CREATE POLICY "Admins can manage training users" ON training_users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Użytkownicy widzą tylko swoje przypisania
CREATE POLICY "Users can view own training assignments" ON training_users
  FOR SELECT USING (auth.uid() = user_id);

