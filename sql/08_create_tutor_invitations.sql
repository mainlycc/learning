-- Tabela tutor_invitations
CREATE TABLE tutor_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_by UUID NOT NULL REFERENCES profiles(id),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeks na token dla szybkiego wyszukiwania
CREATE INDEX idx_tutor_invitations_token ON tutor_invitations(token);
CREATE INDEX idx_tutor_invitations_email ON tutor_invitations(email);
CREATE INDEX idx_tutor_invitations_status ON tutor_invitations(status);

-- Funkcja do automatycznego wygaszania starych zaproszeń
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS void AS $$
BEGIN
  UPDATE tutor_invitations
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending' AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funkcja do akceptacji zaproszenia przez token (omija RLS)
CREATE OR REPLACE FUNCTION accept_invitation_by_token(invitation_token UUID)
RETURNS void AS $$
BEGIN
  UPDATE tutor_invitations
  SET status = 'accepted', updated_at = NOW()
  WHERE token = invitation_token AND status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Włącz RLS na tabeli tutor_invitations
ALTER TABLE tutor_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admini mogą zarządzać wszystkimi zaproszeniami
CREATE POLICY "Admins can manage tutor invitations" ON tutor_invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- RLS Policy: Zaproszenie może być odczytane przez token (dla walidacji przed rejestracją)
-- Pozwalamy na odczyt zaproszeń ze statusem 'pending' dla walidacji tokenu przed rejestracją
CREATE POLICY "Validate invitation token" ON tutor_invitations
  FOR SELECT USING (
    -- Zezwalamy na odczyt jeśli zaproszenie jest pending (dla walidacji)
    status = 'pending'
    OR
    -- Admini mogą wszystko
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

