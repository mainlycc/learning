-- Migracja: Dodanie obsługi PNG do tabeli trainings
-- Data: 2024
-- Opis: Rozszerza constraint file_type o możliwość zapisywania plików PNG

-- Usuń stary constraint
ALTER TABLE trainings 
  DROP CONSTRAINT IF EXISTS trainings_file_type_check;

-- Dodaj nowy constraint z obsługą PNG
ALTER TABLE trainings 
  ADD CONSTRAINT trainings_file_type_check 
  CHECK (file_type IN ('PDF', 'PPTX', 'PNG'));

-- Komentarz do kolumny
COMMENT ON COLUMN trainings.file_type IS 'Typ pliku szkolenia: PDF, PPTX lub PNG';

