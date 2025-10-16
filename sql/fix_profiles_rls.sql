-- Naprawa problemu z nieskończoną rekurencją w RLS dla tabeli profiles

-- 1. Usuń wszystkie istniejące policy dla tabeli profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON profiles;

-- 2. Wyłącz RLS tymczasowo
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 3. Utwórz nową, prostą policy bez rekurencji
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own profile" ON profiles
  FOR ALL USING (auth.uid() = id);

-- 4. Sprawdź czy policy zostały utworzone poprawnie
SELECT policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';
