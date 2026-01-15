-- Naprawa RLS policy na training_users - upewnij się, że admini mogą zapisywać przypisania
-- Problem: RLS policy może blokować INSERT przez admina

-- Usuń istniejące polityki jeśli istnieją (dla idempotentności)
DROP POLICY IF EXISTS "Admins can manage training users" ON training_users;
DROP POLICY IF EXISTS "Users can view own training assignments" ON training_users;

-- Admini mogą zarządzać wszystkimi przypisaniami (INSERT, UPDATE, DELETE, SELECT)
CREATE POLICY "Admins can manage training users" ON training_users
  FOR ALL USING (
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

-- Użytkownicy widzą tylko swoje przypisania (tylko SELECT)
CREATE POLICY "Users can view own training assignments" ON training_users
  FOR SELECT USING (auth.uid() = user_id);

-- Komentarz wyjaśniający
COMMENT ON POLICY "Admins can manage training users" ON training_users IS 
'Admini mogą zarządzać wszystkimi przypisaniami użytkowników do szkoleń (INSERT, UPDATE, DELETE, SELECT).';

COMMENT ON POLICY "Users can view own training assignments" ON training_users IS 
'Użytkownicy widzą tylko swoje własne przypisania do szkoleń (SELECT).';
