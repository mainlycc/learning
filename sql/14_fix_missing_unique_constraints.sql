-- Naprawa brakujących UNIQUE constraints w bazie danych
-- Ten skrypt dodaje brakujące ograniczenia, które powinny być zgodnie z oryginalnym schematem

-- 1. UNIQUE constraint dla training_users (KRYTYCZNE!)
-- Zapobiega duplikatom przypisań użytkowników do szkoleń
-- Najpierw usuń duplikaty jeśli istnieją, potem dodaj constraint
DO $$
BEGIN
  -- Usuń duplikaty, zostaw tylko najstarszy rekord dla każdej pary (training_id, user_id)
  DELETE FROM training_users tu1
  WHERE EXISTS (
    SELECT 1 FROM training_users tu2
    WHERE tu2.training_id = tu1.training_id
    AND tu2.user_id = tu1.user_id
    AND tu2.created_at < tu1.created_at
  );
END $$;

-- Teraz dodaj UNIQUE constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'training_users_training_id_user_id_key'
    AND conrelid = 'training_users'::regclass
  ) THEN
    ALTER TABLE training_users 
    ADD CONSTRAINT training_users_training_id_user_id_key 
    UNIQUE (training_id, user_id);
  END IF;
END $$;

-- 2. UNIQUE constraint dla training_slides
-- Zapobiega duplikatom numerów slajdów w tym samym szkoleniu
DO $$
BEGIN
  -- Usuń duplikaty, zostaw tylko najstarszy rekord dla każdej pary (training_id, slide_number)
  DELETE FROM training_slides ts1
  WHERE EXISTS (
    SELECT 1 FROM training_slides ts2
    WHERE ts2.training_id = ts1.training_id
    AND ts2.slide_number = ts1.slide_number
    AND ts2.created_at < ts1.created_at
  );
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'training_slides_training_id_slide_number_key'
    AND conrelid = 'training_slides'::regclass
  ) THEN
    ALTER TABLE training_slides 
    ADD CONSTRAINT training_slides_training_id_slide_number_key 
    UNIQUE (training_id, slide_number);
  END IF;
END $$;

-- 3. UNIQUE constraint dla user_training_progress
-- Zapobiega wielu rekordom postępu dla tego samego użytkownika i szkolenia
DO $$
BEGIN
  -- Usuń duplikaty, zostaw tylko najstarszy rekord dla każdej pary (user_id, training_id)
  DELETE FROM user_training_progress utp1
  WHERE EXISTS (
    SELECT 1 FROM user_training_progress utp2
    WHERE utp2.user_id = utp1.user_id
    AND utp2.training_id = utp1.training_id
    AND utp2.created_at < utp1.created_at
  );
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_training_progress_user_id_training_id_key'
    AND conrelid = 'user_training_progress'::regclass
  ) THEN
    ALTER TABLE user_training_progress 
    ADD CONSTRAINT user_training_progress_user_id_training_id_key 
    UNIQUE (user_id, training_id);
  END IF;
END $$;

-- 4. UNIQUE constraint dla user_slide_activity
-- Zapobiega duplikatom aktywności dla tego samego postępu i slajdu
DO $$
BEGIN
  -- Usuń duplikaty, zostaw tylko najstarszy rekord dla każdej pary (progress_id, slide_id)
  DELETE FROM user_slide_activity usa1
  WHERE EXISTS (
    SELECT 1 FROM user_slide_activity usa2
    WHERE usa2.progress_id = usa1.progress_id
    AND usa2.slide_id = usa1.slide_id
    AND usa2.last_activity_at < usa1.last_activity_at
  );
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_slide_activity_progress_id_slide_id_key'
    AND conrelid = 'user_slide_activity'::regclass
  ) THEN
    ALTER TABLE user_slide_activity 
    ADD CONSTRAINT user_slide_activity_progress_id_slide_id_key 
    UNIQUE (progress_id, slide_id);
  END IF;
END $$;

-- 5. UNIQUE constraint dla monthly_reports
-- Zapobiega wielu raportom dla tego samego miesiąca i roku
DO $$
BEGIN
  -- Usuń duplikaty, zostaw tylko najnowszy rekord dla każdej pary (year, month)
  DELETE FROM monthly_reports mr1
  WHERE EXISTS (
    SELECT 1 FROM monthly_reports mr2
    WHERE mr2.year = mr1.year
    AND mr2.month = mr1.month
    AND mr2.generated_at > mr1.generated_at
  );
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'monthly_reports_year_month_key'
    AND conrelid = 'monthly_reports'::regclass
  ) THEN
    ALTER TABLE monthly_reports 
    ADD CONSTRAINT monthly_reports_year_month_key 
    UNIQUE (year, month);
  END IF;
END $$;

