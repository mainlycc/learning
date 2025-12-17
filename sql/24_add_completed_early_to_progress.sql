-- Dodaj pole completed_early do tabeli user_training_progress
-- To pole oznacza, czy kurs został zakończony przed czasem (przedwcześnie)
ALTER TABLE user_training_progress
ADD COLUMN IF NOT EXISTS completed_early BOOLEAN DEFAULT false;

-- Komentarz do kolumny
COMMENT ON COLUMN user_training_progress.completed_early IS 'Oznacza, czy kurs został zakończony przed czasem. Jeśli true, użytkownik nie może już wrócić do tego kursu.';

