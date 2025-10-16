-- Ustawienie roli super_admin dla użytkownika

-- 1. Sprawdź aktualny auth.uid()
SELECT 'Aktualny użytkownik:' as info;
SELECT auth.uid() as user_id;

-- 2. Sprawdź czy profil istnieje
SELECT 'Istniejący profil:' as info;
SELECT id, email, role FROM profiles WHERE id = auth.uid();

-- 3. Użyj konkretnego UUID (zastąp swoim UUID z kroku 1)
-- Z twojego błędu widzę, że twoje UUID to: 4a4b8577-1dfe-4884-a318-ac37b604947e

UPDATE profiles 
SET role = 'super_admin', updated_at = NOW()
WHERE id = '4a4b8577-1dfe-4884-a318-ac37b604947e';

-- 4. Sprawdź czy rola została ustawiona
SELECT 'Zaktualizowany profil:' as info;
SELECT id, email, role, updated_at FROM profiles WHERE id = '4a4b8577-1dfe-4884-a318-ac37b604947e';

-- 5. Jeśli profil nie istnieje, utwórz go:
INSERT INTO profiles (id, email, full_name, role) 
VALUES (
  '4a4b8577-1dfe-4884-a318-ac37b604947e',
  'mainly.agn@gmail.com',
  NULL,
  'super_admin'
)
ON CONFLICT (id) DO UPDATE SET 
  role = 'super_admin',
  updated_at = NOW();
