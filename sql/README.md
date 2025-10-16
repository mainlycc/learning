# Instrukcja instalacji bazy danych Supabase

Ten folder zawiera wszystkie pliki SQL potrzebne do skonfigurowania bazy danych dla platformy e-learningowej.

## Kolejność instalacji

### 1. Przygotowanie środowiska

Przed uruchomieniem skryptów SQL:

1. **Zaloguj się do Supabase Dashboard** na [supabase.com](https://supabase.com)
2. **Wybierz swój projekt** lub utwórz nowy
3. **Przejdź do SQL Editor** w lewym menu

### 2. Utworzenie Storage Buckets

W **Supabase Dashboard → Storage**, utwórz następujące buckety:

#### Bucket `trainings`
- **Public:** No
- **File size limit:** 100MB
- **Allowed MIME types:** `application/pdf`, `application/vnd.ms-powerpoint`, `application/vnd.openxmlformats-officedocument.presentationml.presentation`

#### Bucket `slides`
- **Public:** No
- **File size limit:** 10MB
- **Allowed MIME types:** `image/png`, `image/jpeg`, `image/webp`

#### Bucket `reports`
- **Public:** No
- **File size limit:** 50MB
- **Allowed MIME types:** `application/pdf`, `text/csv`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

### 3. Uruchomienie skryptów SQL

**WAŻNE:** Uruchamiaj pliki w **dokładnie tej kolejności**:

```bash
1. 01_create_tables.sql
2. 02_create_indexes.sql
3. 03_create_functions.sql
4. 04_create_triggers.sql
5. 05_create_rls_policies.sql
6. 06_create_storage_policies.sql
7. 07_sample_data.sql (opcjonalne - tylko jeśli chcesz dane testowe)
```

### 4. Konfiguracja pierwszego administratora

Po uruchomieniu skryptów 1-6:

1. **Utwórz konto użytkownika** przez Supabase Auth (Dashboard → Authentication → Users → Add user)
2. **Zaloguj się do SQL Editor** jako ten użytkownik (w prawym górnym rogu SQL Editor)
3. **Zaktualizuj rolę na super_admin**:

```sql
UPDATE profiles 
SET role = 'super_admin' 
WHERE email = 'twoj-email@example.com';
```

4. **Uruchom skrypt z danymi testowymi** (07_sample_data.sql) - teraz będzie działać poprawnie

## Struktura bazy danych

### Główne tabele:

- **`profiles`** - profile użytkowników (rozszerza auth.users)
- **`trainings`** - szkolenia z metadanymi
- **`training_slides`** - slajdy szkoleń
- **`tests`** - testy przypisane do szkoleń
- **`test_questions`** - pytania testowe (8 typów)
- **`test_question_options`** - opcje odpowiedzi
- **`user_training_progress`** - postęp użytkowników w szkoleniach
- **`user_slide_activity`** - aktywność na poszczególnych slajdach
- **`user_test_attempts`** - próby testów użytkowników
- **`access_policies`** - polityki dostępu do szkoleń
- **`audit_logs`** - logi audytowe
- **`notifications`** - powiadomienia in-app
- **`monthly_reports`** - raporty miesięczne

### Funkcje pomocnicze:

- **`update_updated_at_column()`** - automatyczna aktualizacja timestamps
- **`handle_new_user()`** - automatyczne tworzenie profilu po rejestracji
- **`log_audit_event()`** - logowanie zdarzeń audytowych
- **`create_notification()`** - tworzenie powiadomień
- **`user_has_role()`** - sprawdzanie uprawnień użytkownika
- **`calculate_training_progress()`** - obliczanie postępu szkolenia
- **`generate_monthly_report()`** - generowanie raportów miesięcznych

### Bezpieczeństwo:

- **Row Level Security (RLS)** włączone na wszystkich tabelach
- **Polityki dostępu** skonfigurowane według ról użytkowników
- **Storage policies** dla bezpiecznego dostępu do plików
- **Automatyczne logowanie audytowe** kluczowych akcji

## Typy pytań testowych

System obsługuje 8 typów pytań:

1. **`single`** - pytanie jednokrotnego wyboru
2. **`multiple`** - pytanie wielokrotnego wyboru
3. **`true_false`** - pytanie prawda/fałsz
4. **`open`** - pytanie otwarte
5. **`matching`** - dopasowywanie par
6. **`drag_drop`** - przeciągnij i upuść
7. **`fill_gaps`** - uzupełnij luki
8. **`sorting`** - sortowanie/układanie w kolejności

## Role użytkowników

- **`user`** - podstawowy użytkownik (dostęp do szkoleń i testów)
- **`admin`** - administrator (zarządzanie szkoleniami, testami, użytkownikami)
- **``** - super administrator (pełny dostęp do systemu)

## Rozwiązywanie problemów

### Błąd: "relation does not exist"
- Upewnij się, że uruchamiasz pliki w poprawnej kolejności
- Sprawdź czy poprzednie skrypty zostały wykonane bez błędów

### Błąd: "permission denied"
- Sprawdź czy masz uprawnienia do tworzenia tabel w bazie danych
- Upewnij się, że jesteś zalogowany jako właściciel projektu

### Błąd: "bucket does not exist"
- Upewnij się, że utworzyłeś wszystkie wymagane buckety w Storage
- Sprawdź czy nazwy buckietów są dokładnie takie jak w skryptach

### Problem z RLS policies
- Sprawdź czy wszystkie tabele mają włączone RLS
- Upewnij się, że polityki zostały utworzone poprawnie

## Następne kroki

Po skonfigurowaniu bazy danych:

1. **Zaktualizuj plik `.env.local`** z prawidłowymi danymi Supabase
2. **Uruchom aplikację** i przetestuj logowanie
3. **Dodaj pierwsze szkolenie** przez panel administracyjny
4. **Skonfiguruj testy** dla szkoleń
5. **Dodaj użytkowników** i przypisz im szkolenia

## Wsparcie

W przypadku problemów:

1. Sprawdź logi w Supabase Dashboard → Logs
2. Sprawdź czy wszystkie skrypty zostały wykonane bez błędów
3. Zweryfikuj konfigurację Storage buckets
4. Sprawdź uprawnienia użytkowników i polityki RLS
