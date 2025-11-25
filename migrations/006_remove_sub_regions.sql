-- 006_remove_sub_regions.sql

-- 1. 하위 지역 코드를 사용하는 테이블(clubs, flash_meetups, profiles)의 데이터를 상위 지역 코드로 업데이트
-- clubs
UPDATE clubs
SET region_code = (SELECT parent_code FROM regions WHERE code = clubs.region_code)
WHERE region_code IN (SELECT code FROM regions WHERE parent_code IS NOT NULL);

-- flash_meetups
UPDATE flash_meetups
SET region_code = (SELECT parent_code FROM regions WHERE code = flash_meetups.region_code)
WHERE region_code IN (SELECT code FROM regions WHERE parent_code IS NOT NULL);

-- profiles
UPDATE profiles
SET region_code = (SELECT parent_code FROM regions WHERE code = profiles.region_code)
WHERE region_code IN (SELECT code FROM regions WHERE parent_code IS NOT NULL);

-- 2. 하위 지역 삭제
DELETE FROM regions WHERE parent_code IS NOT NULL;
