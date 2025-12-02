ALTER TABLE flash_meetups DROP CONSTRAINT IF EXISTS flash_meetups_capacity_max_check;
ALTER TABLE flash_meetups ADD CONSTRAINT flash_meetups_capacity_max_check CHECK (capacity_max BETWEEN 2 AND 50);
