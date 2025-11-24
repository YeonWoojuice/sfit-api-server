-- ============================================
-- Meta Data Migration
-- meta.route.js의 fallback 데이터를 기준으로 작성
-- ============================================

-- 1. pg_trgm 확장 설치 (검색 성능 향상)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- 2. Regions 데이터 삽입
-- ============================================
INSERT INTO regions (code, name, parent_code) VALUES
-- 상위 지역 (parent: null)
('SEOUL', '서울', NULL),
('GYEONGGI', '경기', NULL),
('INCHEON', '인천', NULL),
('BUSAN', '부산', NULL),
('DAEGU', '대구', NULL),
('GWANGJU', '광주', NULL),
('DAEJEON', '대전', NULL),
('ULSAN', '울산', NULL),
('GYEONGBUK', '경북', NULL),
('CHUNGNAM', '충남', NULL),
('CHUNGBUK', '충북', NULL),

-- 서울 하위 지역 (parent: 'SEOUL')
('SEOUL_GANGNAM', '강남구', 'SEOUL'),
('SEOUL_SEOCHO', '서초구', 'SEOUL'),
('SEOUL_SONGPA', '송파구', 'SEOUL'),
('SEOUL_GANGDONG', '강동구', 'SEOUL'),
('SEOUL_MAPO', '마포구', 'SEOUL'),
('SEOUL_YONGSAN', '용산구', 'SEOUL'),
('SEOUL_JONGNO', '종로구', 'SEOUL'),
('SEOUL_JUNG', '중구', 'SEOUL'),

-- 경기 하위 지역 (parent: 'GYEONGGI')
('GYEONGGI_BUNDANG', '분당구', 'GYEONGGI'),
('GYEONGGI_SEONGNAM', '성남시', 'GYEONGGI'),
('GYEONGGI_SUWON', '수원시', 'GYEONGGI'),
('GYEONGGI_YONGIN', '용인시', 'GYEONGGI'),
('GYEONGGI_GOYANG', '고양시', 'GYEONGGI'),
('GYEONGGI_SEONGBUK', '성북구', 'GYEONGGI'),

-- 인천 하위 지역 (parent: 'INCHEON')
('INCHEON_NAMDONG', '남동구', 'INCHEON'),
('INCHEON_YEONSU', '연수구', 'INCHEON'),

-- 부산 하위 지역 (parent: 'BUSAN')
('BUSAN_HAEUNDAE', '해운대구', 'BUSAN'),
('BUSAN_SUYEONG', '수영구', 'BUSAN')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 3. Sports 데이터 삽입
-- ============================================
INSERT INTO sports (id, name, active) VALUES
(1, '야구', true),
(2, '축구', true),
(3, '골프', true),
(4, '수영', true),
(5, '러닝', true),
(6, '테니스', true)
ON CONFLICT (name) DO NOTHING;

-- sports 테이블의 id 시퀀스를 현재 최대값 이후로 설정
SELECT setval('sports_id_seq', (SELECT MAX(id) FROM sports));

-- ============================================
-- 4. 검색 성능 최적화 인덱스
-- ============================================

-- ILIKE 검색 성능 향상을 위한 trigram 인덱스
CREATE INDEX IF NOT EXISTS idx_clubs_name_trgm 
ON clubs USING gin(name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_clubs_location_trgm 
ON clubs USING gin(location gin_trgm_ops);

-- 필터링용 인덱스
CREATE INDEX IF NOT EXISTS idx_clubs_region_code 
ON clubs(region_code);

CREATE INDEX IF NOT EXISTS idx_clubs_sport_id 
ON clubs(sport_id);

-- 복합 인덱스 (region + sport 필터 조합 시 성능 향상)
CREATE INDEX IF NOT EXISTS idx_clubs_region_sport 
ON clubs(region_code, sport_id);

-- 생성일 기준 정렬 인덱스
CREATE INDEX IF NOT EXISTS idx_clubs_created_at 
ON clubs(created_at DESC);

-- ============================================
-- 5. 통계 정보 업데이트
-- ============================================
ANALYZE regions;
ANALYZE sports;
ANALYZE clubs;
