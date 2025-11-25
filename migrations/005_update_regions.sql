-- 005_update_regions.sql

-- Insert or Update Regions
INSERT INTO regions (code, name, parent_code) VALUES
('SEOUL', '서울', NULL),
('SEOUL_GANGNAM', '강남구', 'SEOUL'),
('SEOUL_SEOCHO', '서초구', 'SEOUL'),
('SEOUL_SONGPA', '송파구', 'SEOUL'),
('SEOUL_GANGDONG', '강동구', 'SEOUL'),
('SEOUL_MAPO', '마포구', 'SEOUL'),
('SEOUL_YONGSAN', '용산구', 'SEOUL'),
('SEOUL_JONGNO', '종로구', 'SEOUL'),
('SEOUL_JUNG', '중구', 'SEOUL'),
('GYEONGGI', '경기', NULL),
('GYEONGGI_BUNDANG', '분당구', 'GYEONGGI'),
('GYEONGGI_SEONGNAM', '성남시', 'GYEONGGI'),
('GYEONGGI_SUWON', '수원시', 'GYEONGGI'),
('GYEONGGI_YONGIN', '용인시', 'GYEONGGI'),
('GYEONGGI_GOYANG', '고양시', 'GYEONGGI'),
('GYEONGGI_SEONGBUK', '성북구', 'GYEONGGI'),
('INCHEON', '인천', NULL),
('INCHEON_NAMDONG', '남동구', 'INCHEON'),
('INCHEON_YEONSU', '연수구', 'INCHEON'),
('BUSAN', '부산', NULL),
('BUSAN_HAEUNDAE', '해운대구', 'BUSAN'),
('BUSAN_SUYEONG', '수영구', 'BUSAN'),
('DAEGU', '대구', NULL),
('GWANGJU', '광주', NULL),
('DAEJEON', '대전', NULL),
('ULSAN', '울산', NULL),
('GYEONGBUK', '경북', NULL),
('CHUNGNAM', '충남', NULL),
('CHUNGBUK', '충북', NULL)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, parent_code = EXCLUDED.parent_code;
