-- ============================================
-- Rename description columns to 'explain'
-- ============================================

-- 1. Clubs 테이블: explane → explain
ALTER TABLE clubs RENAME COLUMN explane TO explain;

-- 2. Flash Meetups 테이블: description → explain
ALTER TABLE flash_meetups RENAME COLUMN description TO explain;

-- 통계 정보 업데이트
ANALYZE clubs;
ANALYZE flash_meetups;
