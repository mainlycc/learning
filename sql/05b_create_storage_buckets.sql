-- Utworzenie i konfiguracja Storage Buckets z dozwolonymi typami MIME
-- Ten skrypt tworzy buckety lub aktualizuje ich konfigurację

-- Bucket 'trainings' - pliki szkoleń (PDF/PPTX/PNG)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'trainings',
  'trainings',
  false,
  104857600, -- 100MB w bajtach
  ARRAY[
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/png'
  ]::text[]
)
ON CONFLICT (id) 
DO UPDATE SET
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/png'
  ]::text[],
  file_size_limit = 104857600;

-- Bucket 'slides' - obrazy slajdów (PNG/JPEG/WEBP)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'slides',
  'slides',
  false,
  10485760, -- 10MB w bajtach
  ARRAY[
    'image/png',
    'image/jpeg',
    'image/webp'
  ]::text[]
)
ON CONFLICT (id) 
DO UPDATE SET
  allowed_mime_types = ARRAY[
    'image/png',
    'image/jpeg',
    'image/webp'
  ]::text[],
  file_size_limit = 10485760;

-- Bucket 'reports' - raporty (PDF/CSV/XLSX)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reports',
  'reports',
  false,
  52428800, -- 50MB w bajtach
  ARRAY[
    'application/pdf',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]::text[]
)
ON CONFLICT (id) 
DO UPDATE SET
  allowed_mime_types = ARRAY[
    'application/pdf',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]::text[],
  file_size_limit = 52428800;

