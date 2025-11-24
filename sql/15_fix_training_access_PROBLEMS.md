# Analiza problemów z dostępem do szkoleń - GŁÓWNE PROBLEMY

## 🔴 Problem 1: BRAK UNIQUE constraint na training_users (KRYTYCZNE!)

**Lokalizacja:** `100_data.sql` linia 98-106

**Problem:**
```sql
CREATE TABLE public.training_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  training_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  -- BRAK: UNIQUE(training_id, user_id) ❌
```

**Skutek:**
- Możliwe duplikaty przypisań tego samego użytkownika do tego samego szkolenia
- Błędne wyniki w zapytaniach (COUNT, EXISTS mogą zwrócić złe wartości)
- Problemy z kontrolą dostępu

**Rozwiązanie:**
```sql
ALTER TABLE training_users 
ADD CONSTRAINT training_users_training_id_user_id_key 
UNIQUE (training_id, user_id);
```

**Akcja:** Uruchomić `14_fix_missing_unique_constraints.sql` ✅

---

## 🔴 Problem 2: RLS Policy może nie działać poprawnie

**Lokalizacja:** `13_update_trainings_access_rls.sql`

**Problem:**
RLS policy używa EXISTS query do `training_users`, ale jeśli:
1. Brak UNIQUE constraint → EXISTS może zwrócić błędne wyniki
2. RLS na `training_users` blokuje dostęp → EXISTS nie widzi wszystkich przypisań

**Aktualna policy:**
```sql
CREATE POLICY "Users can view assigned or public trainings" ON trainings
  FOR SELECT USING (
    is_active = true AND (
      EXISTS (
        SELECT 1 FROM training_users
        WHERE training_users.training_id = trainings.id
        AND training_users.user_id = auth.uid()
      )
      OR
      NOT EXISTS (
        SELECT 1 FROM training_users
        WHERE training_users.training_id = trainings.id
      )
    )
  );
```

**Potencjalny problem:**
- Drugi EXISTS (sprawdzający czy szkolenie nie ma przypisań) może nie działać poprawnie jeśli RLS na `training_users` blokuje dostęp

**Rozwiązanie:**
1. Najpierw napraw UNIQUE constraint (Problem 1)
2. Sprawdź czy RLS działa poprawnie
3. Jeśli nie działa, użyj funkcji pomocniczej z SECURITY DEFINER

---

## 🔴 Problem 3: file_path NOT NULL vs puste string

**Lokalizacja:** 
- `100_data.sql` linia 112: `file_path text NOT NULL`
- `actions.ts` linia 79: `file_path: ''`

**Problem:**
Tworzymy szkolenie z pustym stringiem, ale kolumna ma NOT NULL. To może działać (pusty string != NULL), ale nie jest idealne.

**Rozwiązanie:**
1. Zmienić constraint na `file_path TEXT` (bez NOT NULL) - LEPIEJ
2. Albo używać NULL zamiast pustego stringa
3. Albo zmienić proces tworzenia - najpierw upload, potem tworzenie rekordu

---

## 🟡 Problem 4: Brak walidacji w kodzie

**Lokalizacja:** `e2/app/dashboard/trainings/page.tsx`

**Problem:**
Po uproszczeniu kodu teraz polega tylko na RLS. Jeśli RLS nie działa, użytkownik zobaczy wszystkie szkolenia.

**Rozwiązanie:**
Dodać dodatkową walidację w kodzie jako backup, lub naprawić RLS.

---

## ✅ Rozwiązania do wdrożenia:

1. **KRYTYCZNE:** Uruchomić `14_fix_missing_unique_constraints.sql` - naprawia Problem 1
2. Sprawdzić czy RLS policy działa poprawnie po naprawie UNIQUE constraint
3. Opcjonalnie: zmienić `file_path` na nullable lub zmienić proces tworzenia

---

## 🔍 Jak sprawdzić czy RLS działa:

1. Zaloguj się jako zwykły użytkownik (nie admin)
2. Utwórz szkolenie i przypisz je tylko do innego użytkownika
3. Sprawdź czy pierwszy użytkownik widzi to szkolenie w liście
4. Jeśli widzi → RLS nie działa poprawnie
5. Jeśli nie widzi → RLS działa ✅

