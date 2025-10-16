-- Przykładowe dane testowe dla platformy e-learningowej

-- UWAGA: Przed uruchomieniem tego skryptu upewnij się, że:
-- 1. Masz utworzonego użytkownika w Supabase Auth
-- 2. Zalogowałeś się jako ten użytkownik w SQL Editor (auth.uid() musi zwracać prawidłowy UUID)
-- 3. Zaktualizowałeś jego rolę na super_admin w tabeli profiles:
--    UPDATE profiles SET role = 'super_admin' WHERE email = 'twoj-email@example.com';
-- 4. Utworzyłeś buckety storage: trainings, slides, reports

-- Ten skrypt używa auth.uid() - funkcji Supabase, która zwraca ID zalogowanego użytkownika
-- Jeśli nie jesteś zalogowany, wszystkie INSERT-y będą się nie powieść

-- SPRAWDŹ CZY JESTEŚ ZALOGOWANY:
-- SELECT auth.uid(); -- To powinno zwrócić UUID, nie NULL

-- Jeśli auth.uid() zwraca NULL, wykonaj następujące kroki:
-- 1. W Supabase Dashboard → Authentication → Users → znajdź swojego użytkownika
-- 2. Skopiuj jego UUID
-- 3. Zastąp auth.uid() poniższymi UUID w każdej linii

-- Przykładowe szkolenia
-- ZASTĄP 'TWOJ-UUID-TUTAJ' rzeczywistym UUID użytkownika z tabeli profiles:
INSERT INTO trainings (title, description, duration_minutes, file_path, file_type, slides_count, created_by, is_active) VALUES
('Bezpieczeństwo w miejscu pracy', 'Podstawowe zasady bezpieczeństwa i higieny pracy', 45, 'trainings/bhp-basics.pdf', 'PDF', 20, 'TWOJ-UUID-TUTAJ', true),
('Ochrona danych osobowych RODO', 'Szkolenie z zakresu ochrony danych osobowych zgodnie z RODO', 60, 'trainings/rodo-training.pdf', 'PDF', 25, 'TWOJ-UUID-TUTAJ', true),
('Komunikacja w zespole', 'Efektywna komunikacja i współpraca w zespole', 30, 'trainings/team-communication.pptx', 'PPTX', 15, 'TWOJ-UUID-TUTAJ', true);

-- Przykładowe slajdy dla pierwszego szkolenia
INSERT INTO training_slides (training_id, slide_number, image_url, min_time_seconds) VALUES
((SELECT id FROM trainings WHERE title = 'Bezpieczeństwo w miejscu pracy' LIMIT 1), 1, 'slides/bhp-slide-1.png', 30),
((SELECT id FROM trainings WHERE title = 'Bezpieczeństwo w miejscu pracy' LIMIT 1), 2, 'slides/bhp-slide-2.png', 45),
((SELECT id FROM trainings WHERE title = 'Bezpieczeństwo w miejscu pracy' LIMIT 1), 3, 'slides/bhp-slide-3.png', 30),
((SELECT id FROM trainings WHERE title = 'Bezpieczeństwo w miejscu pracy' LIMIT 1), 4, 'slides/bhp-slide-4.png', 60),
((SELECT id FROM trainings WHERE title = 'Bezpieczeństwo w miejscu pracy' LIMIT 1), 5, 'slides/bhp-slide-5.png', 30);

-- Przykładowe slajdy dla drugiego szkolenia
INSERT INTO training_slides (training_id, slide_number, image_url, min_time_seconds) VALUES
((SELECT id FROM trainings WHERE title = 'Ochrona danych osobowych RODO' LIMIT 1), 1, 'slides/rodo-slide-1.png', 45),
((SELECT id FROM trainings WHERE title = 'Ochrona danych osobowych RODO' LIMIT 1), 2, 'slides/rodo-slide-2.png', 60),
((SELECT id FROM trainings WHERE title = 'Ochrona danych osobowych RODO' LIMIT 1), 3, 'slides/rodo-slide-3.png', 30),
((SELECT id FROM trainings WHERE title = 'Ochrona danych osobowych RODO' LIMIT 1), 4, 'slides/rodo-slide-4.png', 45),
((SELECT id FROM trainings WHERE title = 'Ochrona danych osobowych RODO' LIMIT 1), 5, 'slides/rodo-slide-5.png', 30);

-- Przykładowe testy
INSERT INTO tests (training_id, title, pass_threshold, time_limit_minutes, max_attempts, questions_count, randomize_questions) VALUES
((SELECT id FROM trainings WHERE title = 'Bezpieczeństwo w miejscu pracy' LIMIT 1), 'Test z bezpieczeństwa pracy', 70, 30, 3, 5, true),
((SELECT id FROM trainings WHERE title = 'Ochrona danych osobowych RODO' LIMIT 1), 'Test z RODO', 80, 45, 2, 8, false);

-- Przykładowe pytania dla pierwszego testu
INSERT INTO test_questions (test_id, question_type, question_text, points, order_number) VALUES
((SELECT id FROM tests WHERE title = 'Test z bezpieczeństwa pracy' LIMIT 1), 'single', 'Jakie jest najważniejsze wyposażenie ochronne na budowie?', 2, 1),
((SELECT id FROM tests WHERE title = 'Test z bezpieczeństwa pracy' LIMIT 1), 'multiple', 'Które z poniższych czynności wymagają szkolenia BHP?', 3, 2),
((SELECT id FROM tests WHERE title = 'Test z bezpieczeństwa pracy' LIMIT 1), 'true_false', 'Czy pracownik może odmówić wykonania pracy zagrażającej bezpieczeństwu?', 1, 3),
((SELECT id FROM tests WHERE title = 'Test z bezpieczeństwa pracy' LIMIT 1), 'open', 'Opisz procedurę postępowania w przypadku wypadku przy pracy.', 5, 4),
((SELECT id FROM tests WHERE title = 'Test z bezpieczeństwa pracy' LIMIT 1), 'sorting', 'Uporządkuj kroki postępowania w przypadku pożaru:', 4, 5);

-- Przykładowe odpowiedzi dla pytań
INSERT INTO test_question_options (question_id, option_text, is_correct, order_number) VALUES
-- Pytanie 1 - single choice
((SELECT id FROM test_questions WHERE question_text LIKE '%wyposażenie ochronne%' LIMIT 1), 'Kask ochronny', true, 1),
((SELECT id FROM test_questions WHERE question_text LIKE '%wyposażenie ochronne%' LIMIT 1), 'Rękawice robocze', false, 2),
((SELECT id FROM test_questions WHERE question_text LIKE '%wyposażenie ochronne%' LIMIT 1), 'Buty bezpieczne', false, 3),
((SELECT id FROM test_questions WHERE question_text LIKE '%wyposażenie ochronne%' LIMIT 1), 'Okulary ochronne', false, 4),

-- Pytanie 2 - multiple choice
((SELECT id FROM test_questions WHERE question_text LIKE '%szkolenia BHP%' LIMIT 1), 'Praca na wysokości', true, 1),
((SELECT id FROM test_questions WHERE question_text LIKE '%szkolenia BHP%' LIMIT 1), 'Obsługa maszyn', true, 2),
((SELECT id FROM test_questions WHERE question_text LIKE '%szkolenia BHP%' LIMIT 1), 'Praca z chemikaliami', true, 3),
((SELECT id FROM test_questions WHERE question_text LIKE '%szkolenia BHP%' LIMIT 1), 'Mycie rąk', false, 4),

-- Pytanie 3 - true/false
((SELECT id FROM test_questions WHERE question_text LIKE '%odmówić wykonania pracy%' LIMIT 1), 'Prawda', true, 1),
((SELECT id FROM test_questions WHERE question_text LIKE '%odmówić wykonania pracy%' LIMIT 1), 'Fałsz', false, 2),

-- Pytanie 5 - sorting
((SELECT id FROM test_questions WHERE question_text LIKE '%kroki postępowania w przypadku pożaru%' LIMIT 1), 'Ocena sytuacji i własnego bezpieczeństwa', false, 1),
((SELECT id FROM test_questions WHERE question_text LIKE '%kroki postępowania w przypadku pożaru%' LIMIT 1), 'Alarmowanie służb ratowniczych', false, 2),
((SELECT id FROM test_questions WHERE question_text LIKE '%kroki postępowania w przypadku pożaru%' LIMIT 1), 'Ewakuacja z zagrożonego miejsca', false, 3),
((SELECT id FROM test_questions WHERE question_text LIKE '%kroki postępowania w przypadku pożaru%' LIMIT 1), 'Próba gaszenia (jeśli bezpieczne)', false, 4);

-- Przykładowe polityki dostępu
INSERT INTO access_policies (training_id, policy_type, time_limit_days) VALUES
((SELECT id FROM trainings WHERE title = 'Bezpieczeństwo w miejscu pracy' LIMIT 1), 'full', NULL),
((SELECT id FROM trainings WHERE title = 'Ochrona danych osobowych RODO' LIMIT 1), 'full', NULL),
((SELECT id FROM trainings WHERE title = 'Komunikacja w zespole' LIMIT 1), 'time_limited', 30);

-- Przykładowe powiadomienia
INSERT INTO notifications (user_id, type, title, message, read) VALUES
('4a4b8577-1dfe-4884-a318-ac37b604947e', 'system', 'Witamy w platformie e-learningowej', 'Platforma została pomyślnie skonfigurowana i jest gotowa do użycia.', false),
('4a4b8577-1dfe-4884-a318-ac37b604947e', 'training', 'Nowe szkolenie dostępne', 'Dodano nowe szkolenie: "Bezpieczeństwo w miejscu pracy"', false),
('4a4b8577-1dfe-4884-a318-ac37b604947e', 'reminder', 'Przypomnienie o szkoleniu', 'Nie zapomnij o ukończeniu szkolenia BHP w ciągu 30 dni.', false);

-- Przykładowe logi audytowe
INSERT INTO audit_logs (user_id, action_type, resource_type, resource_id, metadata) VALUES
('4a4b8577-1dfe-4884-a318-ac37b604947e', 'system_initialized', 'system', NULL, '{"message": "System został zainicjalizowany", "version": "1.0.0"}'),
('4a4b8577-1dfe-4884-a318-ac37b604947e', 'training_created', 'training', (SELECT id FROM trainings WHERE title = 'Bezpieczeństwo w miejscu pracy' LIMIT 1), '{"title": "Bezpieczeństwo w miejscu pracy", "duration": 45}'),
('4a4b8577-1dfe-4884-a318-ac37b604947e', 'test_created', 'test', (SELECT id FROM tests WHERE title = 'Test z bezpieczeństwa pracy' LIMIT 1), '{"title": "Test z bezpieczeństwa pracy", "questions_count": 5}');
