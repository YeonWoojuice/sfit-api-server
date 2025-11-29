-- 003_full_schema_update.sql

-- Enable pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- 0. Backup existing tables (if they exist and haven't been backed up)
-- ============================================

DO $$ 
BEGIN
    -- Users
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        ALTER TABLE users RENAME TO users_backup;
    END IF;
    -- Clubs
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'clubs') THEN
        ALTER TABLE clubs RENAME TO clubs_backup;
    END IF;
    -- Club Members
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'club_members') THEN
        ALTER TABLE club_members RENAME TO club_members_backup;
    END IF;
    -- Flash Meetups
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'flash_meetups') THEN
        ALTER TABLE flash_meetups RENAME TO flash_meetups_backup;
    END IF;
    -- Auth Tokens
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'auth_tokens') THEN
        ALTER TABLE auth_tokens RENAME TO auth_tokens_backup;
    END IF;
EXCEPTION
    WHEN OTHERS THEN 
        RAISE NOTICE 'Backup step failed or already backed up: %', SQLERRM;
END $$;

-- ============================================
-- 1. Users & Auth
-- ============================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(30) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN', 'COACH')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED'))
);

CREATE TABLE IF NOT EXISTS auth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_id ON auth_tokens(user_id);

-- ============================================
-- 2. Meta Data (Sports, Regions, Badges)
-- ============================================

CREATE TABLE IF NOT EXISTS sports (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS regions (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent_code TEXT REFERENCES regions(code)
);
CREATE INDEX IF NOT EXISTS idx_regions_parent_code ON regions(parent_code);

CREATE TABLE IF NOT EXISTS badges (
    id SERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('USER', 'COACH')),
    "desc" TEXT
);

-- ============================================
-- 3. Profiles & User Badges
-- ============================================

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    gender TEXT CHECK (gender IN ('M', 'F', 'OTHER')),
    age INT CHECK (age >= 13),
    region_code TEXT REFERENCES regions(code),
    level TEXT CHECK (level IN ('초보', '입문', '중급', '상급')),
    sports INT[], 
    badge_summary TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_profiles_region_code ON profiles(region_code);
CREATE INDEX IF NOT EXISTS idx_profiles_sports ON profiles USING GIN(sports);

CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id INT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    unique_key TEXT UNIQUE GENERATED ALWAYS AS (user_id::text || '-' || badge_id::text) STORED
);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON user_badges(badge_id);

-- ============================================
-- 4. Attachments (Files)
-- ============================================

CREATE TABLE IF NOT EXISTS attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    mime_type TEXT,
    size BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 5. Clubs
-- ============================================

CREATE TABLE IF NOT EXISTS clubs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    explane TEXT NOT NULL,
    attachment_id UUID REFERENCES attachments(id),
    region_code TEXT NOT NULL REFERENCES regions(code),
    location TEXT,
    sport_id INT NOT NULL REFERENCES sports(id),
    days_of_week SMALLINT[], 
    start_time TIME NOT NULL,
    end_time TIME NOT NULL CHECK (start_time < end_time),
    capacity_min INT NOT NULL DEFAULT 3 CHECK (capacity_min >= 2),
    capacity_max INT NOT NULL DEFAULT 25 CHECK (capacity_max BETWEEN capacity_min AND 30),
    level_min TEXT,
    level_max TEXT,
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    rating_avg NUMERIC(3,2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    coaching BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_clubs_owner_user_id ON clubs(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_clubs_region_code ON clubs(region_code);
CREATE INDEX IF NOT EXISTS idx_clubs_sport_id ON clubs(sport_id);

CREATE TABLE IF NOT EXISTS club_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('HOST', 'MEMBER')),
    state TEXT NOT NULL DEFAULT 'MEMBER' CHECK (state IN ('MEMBER', 'LEFT', 'KICKED')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    unique_key TEXT UNIQUE GENERATED ALWAYS AS (club_id::text || '-' || user_id::text) STORED
);
CREATE INDEX IF NOT EXISTS idx_club_members_club_id ON club_members(club_id);
CREATE INDEX IF NOT EXISTS idx_club_members_user_id ON club_members(user_id);

CREATE TABLE IF NOT EXISTS club_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mode TEXT NOT NULL CHECK (mode IN ('quick', 'form')),
    answers JSONB,
    status TEXT NOT NULL DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED', 'APPROVED', 'REJECTED')),
    decided_by UUID REFERENCES users(id),
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_club_apps_unique_requested ON club_applications(club_id, user_id) WHERE status = 'REQUESTED';
CREATE INDEX IF NOT EXISTS idx_club_applications_club_id ON club_applications(club_id);
CREATE INDEX IF NOT EXISTS idx_club_applications_user_id ON club_applications(user_id);

-- ============================================
-- 6. Flash Meetups
-- ============================================

CREATE TABLE IF NOT EXISTS flash_meetups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    attachment_id UUID REFERENCES attachments(id),
    host_user_id UUID NOT NULL REFERENCES users(id),
    sport_id INT NOT NULL REFERENCES sports(id),
    region_code TEXT NOT NULL REFERENCES regions(code),
    place_text TEXT,
    level INT NOT NULL DEFAULT 1,
    capacity_min INT NOT NULL DEFAULT 3,
    capacity_max INT NOT NULL DEFAULT 25 CHECK (capacity_max BETWEEN 2 AND 30),
    days_of_week SMALLINT[],
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL CHECK (start_time < end_time),
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'CONFIRMED', 'FINISHED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_flash_meetups_host_user_id ON flash_meetups(host_user_id);
CREATE INDEX IF NOT EXISTS idx_flash_meetups_start_at ON flash_meetups(start_at);

CREATE TABLE IF NOT EXISTS flash_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meetup_id UUID NOT NULL REFERENCES flash_meetups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    state TEXT NOT NULL DEFAULT 'JOINED' CHECK (state IN ('JOINED', 'LEFT', 'NO_SHOW')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    unique_key TEXT UNIQUE GENERATED ALWAYS AS (meetup_id::text || '-' || user_id::text) STORED
);
CREATE INDEX IF NOT EXISTS idx_flash_attendees_meetup_id ON flash_attendees(meetup_id);
CREATE INDEX IF NOT EXISTS idx_flash_attendees_user_id ON flash_attendees(user_id);

-- ============================================
-- 7. Reviews & Promotions & Notifications
-- ============================================

CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    writer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    manners INT NOT NULL CHECK (manners BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reviews_club_id ON reviews(club_id);

CREATE TABLE IF NOT EXISTS promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_level TEXT NOT NULL CHECK (target_level IN ('입문', '중급', '상급', '코치')),
    evidences JSONB,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    decided_by UUID REFERENCES users(id),
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    payload JSONB,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- ============================================
-- 8. Datasets (Admin)
-- ============================================

CREATE TABLE IF NOT EXISTS datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    version INT NOT NULL DEFAULT 1,
    row_count INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dataset_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    raw_data JSONB,
    status TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
