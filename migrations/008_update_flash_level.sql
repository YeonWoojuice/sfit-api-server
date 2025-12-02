-- 008_update_flash_level.sql
-- flash_meetups 테이블에서 level 컬럼을 삭제하고 level_min, level_max 컬럼을 추가합니다.

ALTER TABLE flash_meetups 
DROP COLUMN IF EXISTS level;

ALTER TABLE flash_meetups
ADD COLUMN level_min INT NOT NULL DEFAULT 1,
ADD COLUMN level_max INT NOT NULL DEFAULT 5;
