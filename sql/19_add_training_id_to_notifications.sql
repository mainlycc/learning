-- Dodanie kolumny training_id do tabeli notifications
-- Pozwala na powiązanie powiadomień ze szkoleniami i filtrowanie dostępu

-- Dodaj kolumnę training_id (nullable - nie wszystkie powiadomienia muszą być związane ze szkoleniami)
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS training_id UUID REFERENCES trainings(id) ON DELETE CASCADE;

-- Dodaj indeks dla lepszej wydajności zapytań
CREATE INDEX IF NOT EXISTS idx_notifications_training_id ON notifications(training_id);

-- Komentarz wyjaśniający
COMMENT ON COLUMN notifications.training_id IS 
'ID szkolenia, z którym związane jest powiadomienie. NULL dla powiadomień ogólnych (np. admin_message).';

