
INSERT INTO storage.buckets (id, name, public) VALUES ('event-assets', 'event-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read event-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-assets');

CREATE POLICY "Public upload event-assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'event-assets');

CREATE POLICY "Public update event-assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'event-assets');

CREATE POLICY "Public delete event-assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'event-assets');
