-- Prosty skrypt do naprawy roli użytkownika
-- UUID: 4a4b8577-1dfe-4884-a318-ac37b604947e
-- Email: mainly.agn@gmail.com

-- 1. Sprawdź czy profil istnieje
SELECT 'Sprawdzam czy profil istnieje:' as info;
SELECT id, email, role, created_at FROM profiles 
WHERE id = '4a4b8577-1dfe-4884-a318-ac37b604947e';

-- 2. Jeśli profil istnieje, zaktualizuj rolę
UPDATE profiles 
SET role = 'super_admin', updated_at = NOW()
WHERE id = '4a4b8577-1dfe-4884-a318-ac37b604947e';

-- 3. Jeśli profil nie istnieje, utwórz go
INSERT INTO profiles (id, email, full_name, role, created_at, updated_at) 
VALUES (
  '4a4b8577-1dfe-4884-a318-ac37b604947e',
  'mainly.agn@gmail.com',
  NULL,
  'super_admin',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET 
  role = 'super_admin',
  updated_at = NOW();

-- 4. Sprawdź wynik
SELECT 'Finalny profil:' as info;
SELECT id, email, role, updated_at FROM profiles 
WHERE id = '4a4b8577-1dfe-4884-a318-ac37b604947e';

-- 5. Sprawdź czy RLS nie blokuje dostępu
SELECT 'Sprawdzam polityki RLS:' as info;
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'profiles';
