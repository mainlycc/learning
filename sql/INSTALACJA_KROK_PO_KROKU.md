# 🚀 Instalacja bazy danych - Krok po kroku

## ❌ **Problem z auth.uid() = NULL**

Jeśli otrzymujesz błąd:
```
ERROR: 23502: null value in column "created_by" of relation "trainings" violates not-null constraint
```

To oznacza, że `auth.uid()` zwraca `NULL` - nie jesteś zalogowany jako użytkownik w SQL Editor.

## ✅ **Rozwiązanie krok po kroku:**

### **Krok 1:** Sprawdź czy masz użytkownika
1. Idź do **Supabase Dashboard → Authentication → Users**
2. Sprawdź czy masz utworzonego użytkownika
3. Jeśli nie ma - kliknij **"Add user"** i utwórz nowego

### **Krok 2:** Znajdź UUID użytkownika
1. W **Authentication → Users** znajdź swojego użytkownika
2. Kliknij na niego
3. **Skopiuj UUID** (wygląda tak: `12345678-1234-1234-1234-123456789abc`)

### **Krok 3:** Uruchom podstawowe skrypty (jeśli jeszcze nie)
```sql
-- Uruchom w tej kolejności:
-- 01_create_tables.sql
-- 02_create_indexes.sql  
-- 03_create_functions.sql
-- 04_create_triggers.sql
-- 05_create_rls_policies.sql
-- 06_create_storage_policies.sql
```

### **Krok 4:** Ustaw rolę super_admin
```sql
UPDATE profiles 
SET role = 'super_admin' 
WHERE id = 'TWÓJ-UUID-Z-KROKU-2';
```

### **Krok 5:** Edytuj plik 07_sample_data.sql
1. Otwórz plik `07_sample_data.sql`
2. Znajdź wszystkie wystąpienia `'TWOJ-UUID-TUTAJ'`
3. Zastąp je swoim UUID z kroku 2

**Przykład:**
```sql
-- ZAMIAST:
('Bezpieczeństwo w miejscu pracy', ..., 'TWOJ-UUID-TUTAJ', true),

-- WPISZ:
('Bezpieczeństwo w miejscu pracy', ..., '12345678-1234-1234-1234-123456789abc', true),
```

### **Krok 6:** Uruchom dane testowe
```sql
-- Teraz uruchom:
-- 07_sample_data.sql
```

## 🔍 **Alternatywne rozwiązanie (bez edytowania pliku):**

### **Opcja A:** Zaloguj się w SQL Editor
1. W **SQL Editor** w prawym górnym rogu kliknij **"Login"**
2. Zaloguj się jako użytkownik, którego utworzyłeś
3. Teraz `auth.uid()` będzie zwracać prawidłowy UUID
4. Uruchom skrypt `07_sample_data.sql`

### **Opcja B:** Użyj prostszego skryptu
```sql
-- Sprawdź czy masz użytkownika w profiles:
SELECT * FROM profiles;

-- Jeśli tabela jest pusta, dodaj użytkownika ręcznie:
INSERT INTO profiles (id, email, full_name, role) 
VALUES ('TWÓJ-UUID', 'twoj@email.com', 'Twoje Imię', 'super_admin');

-- Teraz dodaj szkolenia ręcznie:
INSERT INTO trainings (title, description, duration_minutes, file_path, file_type, slides_count, created_by, is_active) 
VALUES ('Test szkolenie', 'Opis testowy', 30, 'test.pdf', 'PDF', 10, 'TWÓJ-UUID', true);
```

## 🎯 **Sprawdzenie czy wszystko działa:**

```sql
-- Sprawdź czy masz użytkowników:
SELECT * FROM profiles;

-- Sprawdź czy masz szkolenia:
SELECT * FROM trainings;

-- Sprawdź czy auth.uid() działa:
SELECT auth.uid();
```

## 🆘 **Jeśli nadal masz problemy:**

1. **Sprawdź czy wszystkie tabele zostały utworzone:**
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```

2. **Sprawdź czy masz użytkownika w auth.users:**
   ```sql
   SELECT id, email FROM auth.users;
   ```

3. **Sprawdź czy masz profil:**
   ```sql
   SELECT * FROM profiles;
   ```

4. **Jeśli nie ma profilu, utwórz go ręcznie:**
   ```sql
   INSERT INTO profiles (id, email, full_name, role) 
   VALUES ('TWÓJ-UUID-Z-AUTH-USERS', 'twoj@email.com', 'Imię Nazwisko', 'super_admin');
   ```

## 📞 **Wsparcie:**

Jeśli nadal masz problemy, podaj:
1. Czy masz użytkowników w `auth.users`?
2. Czy masz użytkowników w `profiles`?
3. Co zwraca `SELECT auth.uid();`?
4. Które skrypty już uruchomiłeś?
