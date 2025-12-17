-- Storage Policies dla Supabase Storage

-- Policy dla bucketu trainings (pliki szkoleń PDF/PPTX/PNG)
CREATE POLICY "Admins can upload trainings" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'trainings' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Authenticated users can view trainings" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'trainings' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Admins can update trainings" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'trainings' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can delete trainings" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'trainings' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Policy dla bucketu slides (obrazy slajdów)
CREATE POLICY "Admins can upload slides" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'slides' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Authenticated users can view slides" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'slides' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Admins can update slides" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'slides' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can delete slides" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'slides' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Policy dla bucketu reports (raporty PDF/CSV/XLSX)
CREATE POLICY "Admins can manage reports" ON storage.objects
  FOR ALL USING (
    bucket_id = 'reports' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Authenticated users can view reports" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'reports' AND
    auth.role() = 'authenticated'
  );
