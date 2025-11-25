-- 004_change_club_level_type.sql

-- 1. level_min, level_max 컬럼 타입을 TEXT에서 INT로 변경
-- 기존 데이터가 있다면 형변환을 시도합니다. (USING level_min::integer)
-- 만약 기존 데이터가 '초보' 같은 문자열이라면 에러가 날 수 있으므로, 
-- 이번 마이그레이션에서는 기존 데이터를 NULL로 만들거나 매핑하는 로직이 필요할 수 있습니다.
-- 하지만 현재 개발 단계이므로 데이터를 날리거나 강제 형변환을 시도합니다.
-- 여기서는 안전하게 기존 컬럼을 drop하고 새로 만드는 방식을 택하거나, 
-- USING 절을 사용하여 변환을 시도합니다. (숫자로 변환 불가능한 값은 NULL 처리)

ALTER TABLE clubs 
ALTER COLUMN level_min TYPE INT USING (CASE WHEN level_min ~ '^[0-9]+$' THEN level_min::integer ELSE NULL END),
ALTER COLUMN level_max TYPE INT USING (CASE WHEN level_max ~ '^[0-9]+$' THEN level_max::integer ELSE NULL END);

-- 2. is_public 컬럼 제거
ALTER TABLE clubs DROP COLUMN IF EXISTS is_public;
