-- 14. Tabela training_users (relacja many-to-many między trainings a profiles)
-- Przypisuje użytkowników do kursów
CREATE TABLE training_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(training_id, user_id)
);

