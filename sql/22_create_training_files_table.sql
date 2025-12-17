-- Migracja: Utworzenie tabeli training_files dla wielu plików na szkolenie
-- Data: 2024
-- Opis: Pozwala na przechowywanie wielu plików (PDF, PPTX, PNG) dla jednego szkolenia

-- Utwórz tabelę training_files
CREATE TABLE IF NOT EXISTS training_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('PDF', 'PPTX', 'PNG')),
  file_name TEXT NOT NULL,
  file_size BIGINT,
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Unikalność: jeden plik o tej samej ścieżce dla danego szkolenia
  UNIQUE(training_id, file_path)
);

-- Utwórz indeksy dla lepszej wydajności
CREATE INDEX IF NOT EXISTS idx_training_files_training_id ON training_files(training_id);
CREATE INDEX IF NOT EXISTS idx_training_files_file_type ON training_files(file_type);
CREATE INDEX IF NOT EXISTS idx_training_files_created_at ON training_files(created_at DESC);

-- Komentarze
COMMENT ON TABLE training_files IS 'Przechowuje wiele plików przypisanych do szkolenia';
COMMENT ON COLUMN training_files.file_path IS 'Ścieżka do pliku w storage bucket trainings';
COMMENT ON COLUMN training_files.file_type IS 'Typ pliku: PDF, PPTX lub PNG';
COMMENT ON COLUMN training_files.file_name IS 'Oryginalna nazwa pliku';
COMMENT ON COLUMN training_files.file_size IS 'Rozmiar pliku w bajtach';

