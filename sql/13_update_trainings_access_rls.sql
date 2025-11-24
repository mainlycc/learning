-- Aktualizacja RLS policies dla trainings - dostęp oparty na przypisanych użytkownikach
-- Jeśli kurs ma przypisanych użytkowników, tylko oni mają dostęp
-- Jeśli kurs nie ma przypisanych użytkowników, dostęp dla wszystkich zalogowanych

-- Usuń starą politykę dostępu dla użytkowników (jeśli istnieje)
DROP POLICY IF EXISTS "Users can view active trainings" ON trainings;

-- Usuń starą nową politykę jeśli istnieje (dla idempotentności)
DROP POLICY IF EXISTS "Users can view assigned or public trainings" ON trainings;

-- Nowa polityka: użytkownicy widzą aktywne szkolenia, do których są przypisani
-- lub szkolenia bez przypisanych użytkowników (dostępne dla wszystkich)
-- UWAGA: Admini mają osobną politykę "Admins can view all trainings" która pozwala im widzieć wszystko
CREATE POLICY "Users can view assigned or public trainings" ON trainings
  FOR SELECT USING (
    is_active = true AND (
      -- Użytkownik jest przypisany do kursu
      EXISTS (
        SELECT 1 FROM training_users
        WHERE training_users.training_id = trainings.id
        AND training_users.user_id = auth.uid()
      )
      OR
      -- Kurs nie ma przypisanych użytkowników (dostępny dla wszystkich)
      NOT EXISTS (
        SELECT 1 FROM training_users
        WHERE training_users.training_id = trainings.id
      )
    )
  );

