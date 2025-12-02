-- 007_add_profile_fields.sql

-- Add attachment_id for avatar image
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS attachment_id UUID REFERENCES attachments(id);

-- Add introduction for self description
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS introduction TEXT;
