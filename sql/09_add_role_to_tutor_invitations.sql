-- Dodaj kolumnę role do tabeli tutor_invitations
ALTER TABLE tutor_invitations
ADD COLUMN role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin'));

-- Utwórz indeks na kolumnie role dla szybkiego wyszukiwania
CREATE INDEX idx_tutor_invitations_role ON tutor_invitations(role);

