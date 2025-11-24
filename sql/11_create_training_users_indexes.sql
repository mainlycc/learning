-- Indeksy dla tabeli training_users

CREATE INDEX idx_training_users_training_id ON training_users(training_id);
CREATE INDEX idx_training_users_user_id ON training_users(user_id);
CREATE INDEX idx_training_users_created_at ON training_users(created_at DESC);

