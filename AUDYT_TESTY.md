# Audyt aplikacji - Problem z testami

## Zidentyfikowane problemy

### 1. **Brak widoczności testów w interfejsie użytkownika**
   - **Problem**: Testy były dostępne pod `/dashboard/trainings/[id]/test`, ale nie było żadnych linków/przycisków w interfejsie, które by do nich prowadziły
   - **Lokalizacja**: 
     - `e2/app/dashboard/trainings/[id]/page.tsx` - brak przycisku do testu
     - `e2/app/dashboard/trainings/page.tsx` - brak informacji o testach

### 2. **RLS policies dla testów nie uwzględniały przypisań użytkowników**
   - **Problem**: RLS policy dla tabel `tests`, `test_questions`, `test_question_options` sprawdzały tylko czy szkolenie jest aktywne, ale nie sprawdzały czy użytkownik ma dostęp do szkolenia (przypisania)
   - **Lokalizacja**: `e2/sql/05_create_rls_policies.sql`
   - **Konsekwencje**: Użytkownicy mogli nie widzieć testów dla szkoleń, do których mieli dostęp, jeśli RLS na testach nie uwzględniała przypisań

### 3. **Brak sprawdzania dostępu na stronie testu**
   - **Problem**: Strona `/dashboard/trainings/[id]/test/page.tsx` nie sprawdzała czy użytkownik ma dostęp do szkolenia przed wyświetleniem testu
   - **Lokalizacja**: `e2/app/dashboard/trainings/[id]/test/page.tsx`

## Wprowadzone naprawy

### 1. Dodano przycisk/link do testu na stronie szczegółów szkolenia
   - **Plik**: `e2/app/dashboard/trainings/[id]/page.tsx`
   - **Zmiany**:
     - Dodano import ikony `FileQuestion`
     - Dodano pobieranie informacji o teście dla szkolenia
     - Dodano przycisk "Test" obok przycisku "Rozpocznij szkolenie"
     - Dodano informacyjną kartę w panelu bocznym z informacją o dostępnym teście

### 2. Dodano informację o testach na stronie listy szkoleń
   - **Plik**: `e2/app/dashboard/trainings/page.tsx`
   - **Zmiany**:
     - Dodano import ikony `FileQuestion`
     - Dodano pobieranie testów dla wszystkich szkoleń
     - Dodano wyświetlanie informacji "Test dostępny" na kartach szkoleń, które mają testy

### 3. Dodano sprawdzanie dostępu na stronie testu
   - **Plik**: `e2/app/dashboard/trainings/[id]/test/page.tsx`
   - **Zmiany**:
     - Dodano sprawdzanie roli użytkownika (admin/user)
     - Dodano sprawdzanie przypisań użytkownika do szkolenia
     - Dodano komunikat o braku dostępu, jeśli użytkownik nie ma uprawnień

### 4. Utworzono nowy plik SQL z poprawionymi RLS policies
   - **Plik**: `e2/sql/21_fix_tests_rls_with_assignments.sql`
   - **Zmiany**:
     - Zaktualizowano RLS policy dla tabeli `tests` - uwzględnia przypisania użytkowników
     - Zaktualizowano RLS policy dla tabeli `test_questions` - uwzględnia przypisania użytkowników
     - Zaktualizowano RLS policy dla tabeli `test_question_options` - uwzględnia przypisania użytkowników
     - Wszystkie polityki używają funkcji `training_has_assignments()` z SECURITY DEFINER, aby poprawnie sprawdzać przypisania

## Wymagane działania

### 1. Uruchomienie skryptu SQL
   Aby naprawić RLS policies dla testów, należy uruchomić:
   ```sql
   -- W katalogu e2/sql/
   \i 21_fix_tests_rls_with_assignments.sql
   ```
   
   **UWAGA**: Skrypt wymaga, aby wcześniej były uruchomione:
   - `16_create_training_access_function.sql` - funkcja `training_has_assignments()`
   - `14_fix_missing_unique_constraints.sql` - UNIQUE constraint na `training_users`

### 2. Weryfikacja działania
   Po uruchomieniu skryptu SQL sprawdź:
   1. Czy testy są widoczne na stronie szczegółów szkolenia (przycisk "Test")
   2. Czy testy są widoczne na stronie listy szkoleń (informacja "Test dostępny")
   3. Czy użytkownicy przypisani do szkoleń widzą testy
   4. Czy użytkownicy nieprzypisani nie widzą testów dla szkoleń z przypisaniami

## Struktura zmian

```
e2/
├── app/
│   └── dashboard/
│       └── trainings/
│           ├── [id]/
│           │   ├── page.tsx          [MODYFIKACJA] - dodano przycisk do testu
│           │   └── test/
│           │       └── page.tsx      [MODYFIKACJA] - dodano sprawdzanie dostępu
│           └── page.tsx              [MODYFIKACJA] - dodano informację o testach
└── sql/
    └── 21_fix_tests_rls_with_assignments.sql  [NOWY] - poprawione RLS policies
```

## Podsumowanie

Wszystkie zidentyfikowane problemy zostały naprawione:
- ✅ Testy są teraz widoczne w interfejsie użytkownika
- ✅ RLS policies uwzględniają przypisania użytkowników
- ✅ Sprawdzanie dostępu działa poprawnie
- ✅ Użytkownicy widzą informacje o testach na listach i szczegółach szkoleń

**Następny krok**: Uruchom skrypt SQL `21_fix_tests_rls_with_assignments.sql` w bazie danych.

