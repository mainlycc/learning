-- 47. Tworzenie tabeli user_groups do dynamicznego zarządzania grupami użytkowników
-- Zastępuje statyczny CHECK constraint na kolumnie function w tabeli profiles

-- 1. Tworzenie tabeli user_groups
CREATE TABLE IF NOT EXISTS user_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- 2. Dodanie domyślnych grup (migracja z istniejących wartości)
INSERT INTO user_groups (name, display_name, description) VALUES
  ('ochrona', 'Ochrona', 'Pracownicy ochrony'),
  ('pilot', 'Pilot', 'Piloci'),
  ('steward', 'Steward', 'Stewardzi i stewardessy'),
  ('instruktor', 'Instruktor', 'Instruktorzy szkoleń'),
  ('uczestnik', 'Uczestnik', 'Uczestnicy szkoleń'),
  ('gosc', 'Gość', 'Goście'),
  ('pracownik', 'Pracownik', 'Pracownicy'),
  ('kontraktor', 'Kontraktor', 'Kontraktorzy zewnętrzni')
ON CONFLICT (name) DO NOTHING;

-- 3. Indeks na name dla szybszego wyszukiwania
CREATE INDEX IF NOT EXISTS idx_user_groups_name ON user_groups(name);

-- 4. RLS dla tabeli user_groups
ALTER TABLE user_groups ENABLE ROW LEVEL SECURITY;

-- Wszyscy zalogowani mogą czytać grupy
CREATE POLICY "Authenticated users can read groups" ON user_groups
  FOR SELECT
  TO authenticated
  USING (true);

-- Tylko admini mogą dodawać grupy
CREATE POLICY "Admins can insert groups" ON user_groups
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Tylko admini mogą aktualizować grupy
CREATE POLICY "Admins can update groups" ON user_groups
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Tylko super_admin może usuwać grupy
CREATE POLICY "Super admins can delete groups" ON user_groups
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- 5. Usunięcie starego CHECK constraint z kolumny function (jeśli istnieje)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_function_check;

-- 6. Funkcja do walidacji czy grupa istnieje
CREATE OR REPLACE FUNCTION validate_user_group()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.function IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM user_groups WHERE name = NEW.function) THEN
      RAISE EXCEPTION 'Invalid user group: %', NEW.function;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger do walidacji grupy przy insert/update w profiles
DROP TRIGGER IF EXISTS validate_user_group_trigger ON profiles;
CREATE TRIGGER validate_user_group_trigger
  BEFORE INSERT OR UPDATE OF function ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_group();
