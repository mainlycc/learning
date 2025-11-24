-- Naprawa RLS policy dla notifications - filtrowanie powiadomień związanych ze szkoleniami
-- Użytkownicy widzą tylko powiadomienia dotyczące szkoleń, do których mają dostęp

-- Usuń stare polityki (zostaną zastąpione nowymi)
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;

-- Nowa polityka SELECT: użytkownicy widzą swoje powiadomienia, ale tylko te dotyczące szkoleń, do których mają dostęp
-- lub powiadomienia ogólne (bez training_id)
CREATE POLICY "Users can view accessible notifications" ON notifications
  FOR SELECT USING (
    auth.uid() = user_id AND (
      -- Powiadomienia ogólne (bez training_id) - dostępne dla wszystkich
      training_id IS NULL
      OR
      -- Powiadomienia dotyczące szkoleń - tylko jeśli użytkownik ma dostęp
      (
        -- Użytkownik jest przypisany do szkolenia
        EXISTS (
          SELECT 1 FROM training_users
          WHERE training_users.training_id = notifications.training_id
          AND training_users.user_id = auth.uid()
        )
        OR
        -- Szkolenie nie ma przypisanych użytkowników (dostępne dla wszystkich)
        NOT public.training_has_assignments(notifications.training_id)
        OR
        -- Użytkownik jest adminem (ma dostęp do wszystkich szkoleń)
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
      )
    )
  );

-- Polityka UPDATE: użytkownicy mogą aktualizować tylko swoje powiadomienia
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Komentarz wyjaśniający
COMMENT ON POLICY "Users can view accessible notifications" ON notifications IS 
'Użytkownicy widzą swoje powiadomienia, ale tylko te dotyczące szkoleń, do których mają dostęp.
Powiadomienia ogólne (bez training_id) są dostępne dla wszystkich użytkowników.';

