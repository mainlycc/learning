-- Aktywuj wszystkie szkolenia, które mają przypisanych użytkowników i pliki
-- ale są nieaktywne

-- Sprawdź ile szkoleń zostanie aktywowanych
SELECT 
  'Szkolenia do aktywacji:' as info,
  COUNT(*) as count
FROM trainings t
WHERE t.is_active = false
  AND EXISTS (
    SELECT 1 FROM training_users tu WHERE tu.training_id = t.id
  )
  AND EXISTS (
    SELECT 1 FROM training_files tf WHERE tf.training_id = t.id
  );

-- Aktywuj szkolenia
UPDATE trainings
SET is_active = true
WHERE is_active = false
  AND EXISTS (
    SELECT 1 FROM training_users tu WHERE tu.training_id = trainings.id
  )
  AND EXISTS (
    SELECT 1 FROM training_files tf WHERE tf.training_id = trainings.id
  );

-- Sprawdź wynik
SELECT 
  'Aktywowane szkolenia:' as info,
  COUNT(*) as count
FROM trainings
WHERE is_active = true;
