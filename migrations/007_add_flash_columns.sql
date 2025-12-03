-- Add coaching and rating_avg columns to flash_meetups table
ALTER TABLE flash_meetups 
ADD COLUMN IF NOT EXISTS coaching BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS rating_avg NUMERIC(3,2) DEFAULT 0;
