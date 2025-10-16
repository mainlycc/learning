-- Skrypt diagnostyczny do sprawdzenia problemów z profilami

-- 1. Sprawdź czy masz użytkowników w auth.users
SELECT 'Użytkownicy w auth.users:' as info;
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC;

-- 2. Sprawdź czy masz profile w tabeli profiles
SELECT 'Profile w tabeli profiles:' as info;
SELECT id, email, role, created_at FROM profiles ORDER BY created_at DESC;

-- 3. Sprawdź czy auth.uid() zwraca prawidłowy UUID
SELECT 'Aktualny auth.uid():' as info;
SELECT auth.uid() as current_user_id;

-- 4. Sprawdź czy RLS jest włączone na tabeli profiles
SELECT 'RLS status dla tabeli profiles:' as info;
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles';

-- 5. Sprawdź polityki RLS dla tabeli profiles
SELECT 'Polityki RLS dla tabeli profiles:' as info;
SELECT policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';

-- 6. Jeśli nie masz profilu, utwórz go ręcznie (zastąp UUID swoim ID)
-- SELECT 'Tworzenie profilu ręcznie...' as info;
-- INSERT INTO profiles (id, email, full_name, role) 
-- VALUES ('TWOJ-UUID-TUTAJ', 'twoj@email.com', 'Twoje Imię', 'super_admin')
-- ON CONFLICT (id) DO UPDATE SET role = 'super_admin';
