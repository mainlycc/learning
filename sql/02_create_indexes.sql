-- Indeksy dla lepszej wydajności zapytań

-- Indeksy dla tabeli trainings
CREATE INDEX idx_trainings_created_by ON trainings(created_by);
CREATE INDEX idx_trainings_is_active ON trainings(is_active);
CREATE INDEX idx_trainings_created_at ON trainings(created_at DESC);

-- Indeksy dla tabeli training_slides
CREATE INDEX idx_training_slides_training_id ON training_slides(training_id);
CREATE INDEX idx_training_slides_slide_number ON training_slides(training_id, slide_number);

-- Indeksy dla tabeli tests
CREATE INDEX idx_tests_training_id ON tests(training_id);
CREATE INDEX idx_tests_created_at ON tests(created_at DESC);

-- Indeksy dla tabeli test_questions
CREATE INDEX idx_test_questions_test_id ON test_questions(test_id);
CREATE INDEX idx_test_questions_order ON test_questions(test_id, order_number);

-- Indeksy dla tabeli test_question_options
CREATE INDEX idx_test_question_options_question_id ON test_question_options(question_id);
CREATE INDEX idx_test_question_options_order ON test_question_options(question_id, order_number);

-- Indeksy dla tabeli user_training_progress
CREATE INDEX idx_user_training_progress_user_id ON user_training_progress(user_id);
CREATE INDEX idx_user_training_progress_training_id ON user_training_progress(training_id);
CREATE INDEX idx_user_training_progress_status ON user_training_progress(status);
CREATE INDEX idx_user_training_progress_completed_at ON user_training_progress(completed_at DESC);

-- Indeksy dla tabeli user_slide_activity
CREATE INDEX idx_user_slide_activity_progress_id ON user_slide_activity(progress_id);
CREATE INDEX idx_user_slide_activity_slide_id ON user_slide_activity(slide_id);
CREATE INDEX idx_user_slide_activity_last_activity ON user_slide_activity(last_activity_at DESC);

-- Indeksy dla tabeli user_test_attempts
CREATE INDEX idx_user_test_attempts_user_id ON user_test_attempts(user_id);
CREATE INDEX idx_user_test_attempts_test_id ON user_test_attempts(test_id);
CREATE INDEX idx_user_test_attempts_started_at ON user_test_attempts(started_at DESC);
CREATE INDEX idx_user_test_attempts_completed_at ON user_test_attempts(completed_at DESC);

-- Indeksy dla tabeli access_policies
CREATE INDEX idx_access_policies_training_id ON access_policies(training_id);

-- Indeksy dla tabeli audit_logs
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);

-- Indeksy dla tabeli notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Indeksy dla tabeli monthly_reports
CREATE INDEX idx_monthly_reports_year_month ON monthly_reports(year, month);
CREATE INDEX idx_monthly_reports_generated_by ON monthly_reports(generated_by);
