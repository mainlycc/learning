-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.access_policies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  training_id uuid NOT NULL,
  policy_type text NOT NULL CHECK (policy_type = ANY (ARRAY['full'::text, 'preview'::text, 'time_limited'::text])),
  time_limit_days integer,
  CONSTRAINT access_policies_pkey PRIMARY KEY (id),
  CONSTRAINT access_policies_training_id_fkey FOREIGN KEY (training_id) REFERENCES public.trainings(id)
);
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.monthly_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  generated_by uuid NOT NULL,
  generated_at timestamp with time zone DEFAULT now(),
  data jsonb NOT NULL,
  file_path text,
  CONSTRAINT monthly_reports_pkey PRIMARY KEY (id),
  CONSTRAINT monthly_reports_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'user'::text CHECK (role = ANY (ARRAY['super_admin'::text, 'admin'::text, 'user'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.test_question_options (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL,
  option_text text NOT NULL,
  is_correct boolean DEFAULT false,
  order_number integer NOT NULL,
  CONSTRAINT test_question_options_pkey PRIMARY KEY (id),
  CONSTRAINT test_question_options_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.test_questions(id)
);
CREATE TABLE public.test_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL,
  question_type text NOT NULL CHECK (question_type = ANY (ARRAY['single'::text, 'multiple'::text, 'true_false'::text, 'open'::text, 'matching'::text, 'drag_drop'::text, 'fill_gaps'::text, 'sorting'::text])),
  question_text text NOT NULL,
  points integer NOT NULL DEFAULT 1,
  order_number integer NOT NULL,
  CONSTRAINT test_questions_pkey PRIMARY KEY (id),
  CONSTRAINT test_questions_test_id_fkey FOREIGN KEY (test_id) REFERENCES public.tests(id)
);
CREATE TABLE public.tests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  training_id uuid NOT NULL,
  title text NOT NULL,
  pass_threshold integer NOT NULL DEFAULT 70,
  time_limit_minutes integer,
  max_attempts integer,
  questions_count integer NOT NULL,
  randomize_questions boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tests_pkey PRIMARY KEY (id),
  CONSTRAINT tests_training_id_fkey FOREIGN KEY (training_id) REFERENCES public.trainings(id)
);
CREATE TABLE public.training_slides (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  training_id uuid NOT NULL,
  slide_number integer NOT NULL,
  image_url text NOT NULL,
  min_time_seconds integer NOT NULL DEFAULT 30,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT training_slides_pkey PRIMARY KEY (id),
  CONSTRAINT training_slides_training_id_fkey FOREIGN KEY (training_id) REFERENCES public.trainings(id)
);
CREATE TABLE public.training_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  training_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT training_users_pkey PRIMARY KEY (id),
  CONSTRAINT training_users_training_id_fkey FOREIGN KEY (training_id) REFERENCES public.trainings(id),
  CONSTRAINT training_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.trainings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  duration_minutes integer NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL CHECK (file_type = ANY (ARRAY['PDF'::text, 'PPTX'::text])),
  slides_count integer NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true,
  CONSTRAINT trainings_pkey PRIMARY KEY (id),
  CONSTRAINT trainings_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.tutor_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'expired'::text])),
  created_by uuid NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  role text NOT NULL DEFAULT 'user'::text CHECK (role = ANY (ARRAY['user'::text, 'admin'::text, 'super_admin'::text])),
  CONSTRAINT tutor_invitations_pkey PRIMARY KEY (id),
  CONSTRAINT tutor_invitations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.user_slide_activity (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  progress_id uuid NOT NULL,
  slide_id uuid NOT NULL,
  time_spent_seconds integer DEFAULT 0,
  interactions_count integer DEFAULT 0,
  last_activity_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_slide_activity_pkey PRIMARY KEY (id),
  CONSTRAINT user_slide_activity_progress_id_fkey FOREIGN KEY (progress_id) REFERENCES public.user_training_progress(id),
  CONSTRAINT user_slide_activity_slide_id_fkey FOREIGN KEY (slide_id) REFERENCES public.training_slides(id)
);
CREATE TABLE public.user_test_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  test_id uuid NOT NULL,
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  score integer DEFAULT 0,
  passed boolean DEFAULT false,
  answers_data jsonb NOT NULL,
  CONSTRAINT user_test_attempts_pkey PRIMARY KEY (id),
  CONSTRAINT user_test_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT user_test_attempts_test_id_fkey FOREIGN KEY (test_id) REFERENCES public.tests(id)
);
CREATE TABLE public.user_training_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  training_id uuid NOT NULL,
  current_slide integer DEFAULT 1,
  total_time_seconds integer DEFAULT 0,
  completed_at timestamp with time zone,
  status text NOT NULL DEFAULT 'in_progress'::text CHECK (status = ANY (ARRAY['in_progress'::text, 'completed'::text, 'paused'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_training_progress_pkey PRIMARY KEY (id),
  CONSTRAINT user_training_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT user_training_progress_training_id_fkey FOREIGN KEY (training_id) REFERENCES public.trainings(id)
);