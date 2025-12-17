-- RLS Policies dla tabeli training_files

-- Włącz RLS
ALTER TABLE training_files ENABLE ROW LEVEL SECURITY;

-- Policy: Wszyscy zalogowani użytkownicy mogą czytać pliki szkoleń
CREATE POLICY "Authenticated users can view training files"
  ON training_files
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Tylko admini i super_admini mogą dodawać pliki
CREATE POLICY "Admins can insert training files"
  ON training_files
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Policy: Tylko admini i super_admini mogą aktualizować pliki
CREATE POLICY "Admins can update training files"
  ON training_files
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Policy: Tylko admini i super_admini mogą usuwać pliki
CREATE POLICY "Admins can delete training files"
  ON training_files
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

