-- Add introduction and attachment_id to coach_requests
ALTER TABLE coach_requests 
ADD COLUMN IF NOT EXISTS introduction TEXT,
ADD COLUMN IF NOT EXISTS attachment_id UUID REFERENCES attachments(id);
