-- ============================================================
-- Full PostgreSQL Schema — Kreeda Backend
-- This file is the canonical source of truth for fresh DB setup.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Enums ──────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE auth_provider_enum AS ENUM (
    'google', 'apple', 'facebook', 'github', 'whatsapp', 'otp', 'truecaller'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_gender_enum AS ENUM ('M', 'F', 'O', 'N');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_account_status_enum AS ENUM ('A', 'B', 'D', 'DEL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE role_name_enum AS ENUM ('player', 'parent', 'coach', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_relationship_type_enum AS ENUM ('PARENT', 'COACH', 'GUARDIAN', 'ACADEMY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_sessions_active_role_enum AS ENUM ('player', 'parent', 'coach', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE experience_level_enum AS ENUM ('beginner', 'intermediate', 'advanced', 'professional');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE playing_style_enum AS ENUM ('aggressive', 'defensive', 'balanced', 'all-rounder');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Billing enums

DO $$ BEGIN
  CREATE TYPE billing_interval_enum AS ENUM ('monthly', 'yearly', 'one_time');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE plan_type_enum AS ENUM ('platform', 'coach_package');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status_enum AS ENUM ('active', 'past_due', 'cancelled', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_order_status_enum AS ENUM ('pending', 'paid', 'failed', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_provider_enum AS ENUM ('razorpay', 'stripe', 'cashfree');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE webhook_event_status_enum AS ENUM ('pending', 'processed', 'failed', 'skipped');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE quota_reset_period_enum AS ENUM ('daily', 'monthly', 'per_subscription');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE review_request_status_enum AS ENUM (
    'pending', 'in_review', 'completed', 'cancelled', 'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Core Tables ────────────────────────────────────────────────────────────────

-- Referral System Tables

CREATE TABLE referral_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code        VARCHAR(12) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_referral_codes_user_id UNIQUE (user_id),
  CONSTRAINT uq_referral_codes_code    UNIQUE (code)
);
CREATE INDEX idx_referral_codes_user_id ON referral_codes(user_id);
CREATE INDEX idx_referral_codes_code    ON referral_codes(code);

CREATE TABLE referrals (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_granted BOOLEAN NOT NULL DEFAULT FALSE,
  metadata       JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_referrals_referred_id UNIQUE (referred_id)
);
CREATE INDEX idx_referrals_referrer_id ON referrals(referrer_id);

CREATE TABLE referral_bonuses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature_key VARCHAR(80) NOT NULL,
  bonus_count INT NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_referral_bonuses_user_feature UNIQUE (user_id, feature_key)
);
CREATE INDEX idx_referral_bonuses_user_id ON referral_bonuses(user_id);


CREATE TABLE IF NOT EXISTS roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name       role_name_enum NOT NULL
);

CREATE TABLE IF NOT EXISTS sports (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name       VARCHAR(50) NOT NULL,
  slug       VARCHAR(50) NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  post_options JSONB
);

CREATE TABLE IF NOT EXISTS users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  full_name         VARCHAR(50) NOT NULL,
  username          VARCHAR(25) NOT NULL,
  gender            user_gender_enum NOT NULL,
  profile_pic_url   TEXT,
  dob               DATE,
  bio               VARCHAR(30),
  account_status    user_account_status_enum NOT NULL DEFAULT 'A',
  email             VARCHAR,
  phone_number      VARCHAR(20),
  timezone          VARCHAR(64),
  last_login_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  token_version     INTEGER NOT NULL DEFAULT 0
  -- NOTE: last_active_role_id was removed (auth refactor — fully role-agnostic tokens)
);

CREATE TABLE IF NOT EXISTS auth_providers (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id            UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  provider           auth_provider_enum NOT NULL,
  provider_user_id   VARCHAR NOT NULL,
  provider_email     VARCHAR,
  phone_number       VARCHAR(20),
  password_hash      VARCHAR,
  is_verified        BOOLEAN NOT NULL DEFAULT FALSE,
  metadata           JSONB
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id                         UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  active_role                     user_sessions_active_role_enum,
  refresh_token_hash              VARCHAR(128) NOT NULL,
  previous_refresh_token_hash     VARCHAR(128),
  previous_refresh_token_expiry   TIMESTAMPTZ,
  expires_at                      TIMESTAMPTZ NOT NULL,
  absolute_expires_at             TIMESTAMPTZ NOT NULL,
  revoked_at                      TIMESTAMPTZ,
  last_used_at                    TIMESTAMPTZ,
  device_info                     VARCHAR(255),
  user_agent                      TEXT,
  ip_address                      INET,
  rotation_counter                INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role_id    UUID NOT NULL REFERENCES roles (id) ON DELETE CASCADE
);

-- ── Profile Tables ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS player_profiles (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id        UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  overall_score  DOUBLE PRECISION NOT NULL DEFAULT 0,
  level          INTEGER NOT NULL DEFAULT 1,
  -- Physical attributes (added: player profile refactor)
  height_cm      SMALLINT,
  weight_kg      SMALLINT,
  handedness     VARCHAR(10)  -- 'right' | 'left'
);

CREATE TABLE IF NOT EXISTS parent_profiles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS coach_profiles (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id                UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  bio                    VARCHAR(255),
  experience_years       INTEGER,
  specialization         VARCHAR(255),
  location               VARCHAR(255),
  hourly_rate            INTEGER,
  is_published           BOOLEAN NOT NULL DEFAULT FALSE,
  verified               BOOLEAN NOT NULL DEFAULT FALSE,
  hide_reviewer_identity BOOLEAN NOT NULL DEFAULT FALSE
);

-- ── Sport Tables ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sport_metrics (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sport_id   UUID NOT NULL REFERENCES sports (id) ON DELETE CASCADE,
  name       VARCHAR(100) NOT NULL,
  key        VARCHAR(100) NOT NULL,
  weight     DOUBLE PRECISION NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS player_sports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  player_user_id  UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  sport_id        UUID NOT NULL REFERENCES sports (id),
  experience_level experience_level_enum,
  playing_style    playing_style_enum,
  goals            TEXT
);

CREATE TABLE IF NOT EXISTS user_relationships (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  target_user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  relationship_type user_relationship_type_enum NOT NULL,
  metadata          JSONB
);

-- ── Coach Review Tables ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS coach_review_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  player_user_id  UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  coach_user_id   UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  post_id         TEXT NOT NULL,
  player_message  TEXT,
  status          review_request_status_enum NOT NULL DEFAULT 'pending',
  submitted_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS coach_feedback_items (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  review_request_id        UUID NOT NULL REFERENCES coach_review_requests (id) ON DELETE CASCADE,
  video_timestamp_seconds  FLOAT,
  comment                  TEXT NOT NULL,
  tags                     TEXT[] NOT NULL DEFAULT '{}',
  annotation_url           TEXT,
  drills                   JSONB NOT NULL DEFAULT '[]'
);

-- ── Coach Ratings ──────────────────────────────────────────────────────────────

-- Source of truth: one rating per completed coach review session
CREATE TABLE IF NOT EXISTS coach_ratings (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  coach_user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  review_request_id UUID        NOT NULL REFERENCES coach_review_requests (id) ON DELETE CASCADE,
  rating            SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text       TEXT        CHECK (char_length(review_text) <= 1000),
  tags              TEXT[]      NOT NULL DEFAULT '{}',
  is_flagged        BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Read model: pre-aggregated summary maintained by trigger (never written directly by app code)
CREATE TABLE IF NOT EXISTS coach_rating_summary (
  coach_user_id UUID         PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  avg_rating    NUMERIC(3,2) NOT NULL DEFAULT 0,
  total_count   INTEGER      NOT NULL DEFAULT 0,
  count_1       INTEGER      NOT NULL DEFAULT 0,
  count_2       INTEGER      NOT NULL DEFAULT 0,
  count_3       INTEGER      NOT NULL DEFAULT 0,
  count_4       INTEGER      NOT NULL DEFAULT 0,
  count_5       INTEGER      NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Trigger function: recalculates summary for ONE coach on every INSERT or UPDATE
-- Fires on UPDATE too so that admin flag/unflag operations recompute the summary immediately
CREATE OR REPLACE FUNCTION fn_update_coach_rating_summary()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
  BEGIN
    INSERT INTO coach_rating_summary (
      coach_user_id,
      avg_rating,
      total_count,
      count_1,
      count_2,
      count_3,
      count_4,
      count_5,
      updated_at
    )
    SELECT
      coach_user_id,
      ROUND(AVG(rating)::NUMERIC, 2),
      COUNT(*),
      COUNT(*) FILTER (WHERE rating = 1),
      COUNT(*) FILTER (WHERE rating = 2),
      COUNT(*) FILTER (WHERE rating = 3),
      COUNT(*) FILTER (WHERE rating = 4),
      COUNT(*) FILTER (WHERE rating = 5),
      NOW()
    FROM coach_ratings
    WHERE
      coach_user_id = COALESCE(NEW.coach_user_id, OLD.coach_user_id)
      AND is_flagged = FALSE
    GROUP BY coach_user_id
    ON CONFLICT (coach_user_id) DO UPDATE SET
      avg_rating  = EXCLUDED.avg_rating,
      total_count = EXCLUDED.total_count,
      count_1     = EXCLUDED.count_1,
      count_2     = EXCLUDED.count_2,
      count_3     = EXCLUDED.count_3,
      count_4     = EXCLUDED.count_4,
      count_5     = EXCLUDED.count_5,
      updated_at  = NOW();
    RETURN NEW;
  END;
$$;

-- Drop and recreate trigger to make the schema file idempotently re-runnable
DROP TRIGGER IF EXISTS trg_coach_rating_summary ON coach_ratings;
CREATE TRIGGER trg_coach_rating_summary
AFTER INSERT OR UPDATE ON coach_ratings
FOR EACH ROW EXECUTE FUNCTION fn_update_coach_rating_summary();



-- ── Billing: Product Catalogue ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(60) NOT NULL,
  description TEXT,
  type        plan_type_enum NOT NULL DEFAULT 'platform',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT uq_products_slug UNIQUE (slug)
);

CREATE TABLE IF NOT EXISTS plans (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  product_id   UUID NOT NULL REFERENCES products (id) ON DELETE RESTRICT,
  name         VARCHAR(100) NOT NULL,
  slug         VARCHAR(60) NOT NULL,
  description  TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  is_public    BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  badge_label  VARCHAR(50),
  trial_days   INTEGER NOT NULL DEFAULT 0,
  metadata     JSONB,
  CONSTRAINT uq_plans_slug UNIQUE (slug)
);

CREATE TABLE IF NOT EXISTS prices (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  plan_id             UUID NOT NULL REFERENCES plans (id) ON DELETE RESTRICT,
  billing_interval    billing_interval_enum NOT NULL,
  -- Amount in smallest currency unit (paise for INR, cents for USD).
  -- Always read alongside `currency` column to interpret this value.
  amount_minor_units  INTEGER NOT NULL,
  currency            VARCHAR(3) NOT NULL DEFAULT 'INR',
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  provider_plan_id    VARCHAR(100),
  valid_from          TIMESTAMPTZ,
  valid_until         TIMESTAMPTZ,
  CONSTRAINT uq_prices_plan_interval UNIQUE (plan_id, billing_interval)
);

CREATE TABLE IF NOT EXISTS features (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  key         VARCHAR(80) NOT NULL,
  label       VARCHAR(100) NOT NULL,
  -- 'boolean' = on/off flag, 'integer' = quota-limited
  value_type  VARCHAR(20) NOT NULL DEFAULT 'boolean',
  -- Optional tooltip shown next to feature on pricing page
  tooltip     VARCHAR(300),
  -- Display order on pricing cards — lower = first, shared across all plans
  sort_order  INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT uq_features_key UNIQUE (key)
);

CREATE TABLE IF NOT EXISTS plan_features (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  plan_id             UUID NOT NULL REFERENCES plans (id) ON DELETE CASCADE,
  feature_id          UUID NOT NULL REFERENCES features (id) ON DELETE RESTRICT,
  is_enabled          BOOLEAN NOT NULL DEFAULT TRUE,
  -- NULL = boolean feature; -1 = unlimited; N = N uses per billing period
  limit_value         INTEGER,
  display_label       VARCHAR(120),
  -- Per-plan tooltip override — takes priority over features.tooltip
  tooltip             VARCHAR(300),
  quota_reset_period  quota_reset_period_enum,
  CONSTRAINT uq_plan_features UNIQUE (plan_id, feature_id)
);

-- ── Billing: Subscriptions ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subscriptions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id              UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  plan_id              UUID NOT NULL REFERENCES plans (id) ON DELETE RESTRICT,
  price_id             UUID NOT NULL REFERENCES prices (id) ON DELETE RESTRICT,
  status               subscription_status_enum NOT NULL DEFAULT 'active',
  started_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end   TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  cancelled_at         TIMESTAMPTZ,
  ended_at             TIMESTAMPTZ,
  provider             payment_provider_enum,
  provider_sub_id      VARCHAR(150),
  -- Optimistic concurrency control
  version              INTEGER NOT NULL DEFAULT 0
);

-- ── Billing: Payments ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payment_orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id             UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  price_id            UUID NOT NULL REFERENCES prices (id) ON DELETE RESTRICT,
  subscription_id     UUID REFERENCES subscriptions (id) ON DELETE SET NULL,
  -- Idempotency key prevents duplicate orders on network retries
  idempotency_key     VARCHAR(100) NOT NULL,
  status              payment_order_status_enum NOT NULL DEFAULT 'pending',
  -- Server-authoritative amount. NEVER populated from client request body.
  amount_minor_units  INTEGER NOT NULL,
  currency            VARCHAR(3) NOT NULL DEFAULT 'INR',
  provider            payment_provider_enum NOT NULL,
  provider_order_id   VARCHAR(150),
  expires_at          TIMESTAMPTZ,
  -- Optimistic concurrency control
  version             INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT uq_payment_orders_idempotency UNIQUE (idempotency_key)
);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payment_order_id     UUID NOT NULL REFERENCES payment_orders (id) ON DELETE RESTRICT,
  subscription_id      UUID REFERENCES subscriptions (id) ON DELETE SET NULL,
  provider             payment_provider_enum NOT NULL,
  -- Provider's payment ID — used for refunds and reconciliation
  provider_payment_id  VARCHAR(150) NOT NULL,
  provider_order_id    VARCHAR(150),
  -- Verified against payment_orders.amount_minor_units in webhook handler
  amount_minor_units   INTEGER NOT NULL,
  currency             VARCHAR(3) NOT NULL DEFAULT 'INR',
  -- 'captured' | 'failed' | 'refunded'
  status               VARCHAR(30) NOT NULL,
  failure_code         VARCHAR(100),
  failure_description  TEXT,
  captured_at          TIMESTAMPTZ,
  CONSTRAINT uq_payment_txn_provider_payment UNIQUE (provider, provider_payment_id)
);

-- ── Billing: Quota Usage ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS quota_usage (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id       UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  feature_key   VARCHAR(80) NOT NULL,
  period_start  TIMESTAMPTZ NOT NULL,
  period_end    TIMESTAMPTZ NOT NULL,
  used_count    INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT uq_quota_usage UNIQUE (user_id, feature_key, period_start)
);

-- ── Billing: Webhook Events ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS webhook_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  provider          VARCHAR(50) NOT NULL,
  provider_event_id VARCHAR(150) NOT NULL,
  event_type        VARCHAR(100) NOT NULL,
  status            webhook_event_status_enum NOT NULL DEFAULT 'pending',
  raw_payload       JSONB NOT NULL,
  processed_at      TIMESTAMPTZ,
  error_message     TEXT,
  retry_count       INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT uq_webhook_events_provider_event UNIQUE (provider, provider_event_id)
);

-- ══════════════════════════════════════════════════════════════════════════════
-- Indexes
-- ══════════════════════════════════════════════════════════════════════════════

-- ── roles ─────────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_name_unique
  ON roles (name);

-- ── sports ────────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_sports_name_unique
  ON sports (name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sports_slug_unique
  ON sports (slug);

-- ── users ─────────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_unique
  ON users (username);
-- Partial unique to allow multiple NULLs
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique_not_null
  ON users (email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_number_unique_not_null
  ON users (phone_number) WHERE phone_number IS NOT NULL;
-- Lookup by account_status for moderation queries
CREATE INDEX IF NOT EXISTS idx_users_account_status
  ON users (account_status);

-- ── auth_providers ────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_providers_provider_user_unique
  ON auth_providers (provider, provider_user_id);
CREATE INDEX IF NOT EXISTS idx_auth_providers_user_id
  ON auth_providers (user_id);

-- ── user_sessions ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id
  ON user_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at
  ON user_sessions (expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_sessions_refresh_token_hash_unique
  ON user_sessions (refresh_token_hash);
-- Composite: fast lookup for active (non-revoked) sessions per user
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id_revoked_at
  ON user_sessions (user_id, revoked_at);
-- Partial unique: allow NULL previous_refresh_token_hash, enforce uniqueness when set
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_sessions_prev_refresh_token_hash
  ON user_sessions (previous_refresh_token_hash)
  WHERE previous_refresh_token_hash IS NOT NULL;

-- ── user_roles ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id
  ON user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id
  ON user_roles (role_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_user_role_unique
  ON user_roles (user_id, role_id);

-- ── player_profiles ───────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_player_profiles_user_id_unique
  ON player_profiles (user_id);

-- ── parent_profiles ───────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_parent_profiles_user_id_unique
  ON parent_profiles (user_id);

-- ── coach_profiles ────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_coach_profiles_user_id_unique
  ON coach_profiles (user_id);
-- Listing published coaches
CREATE INDEX IF NOT EXISTS idx_coach_profiles_is_published
  ON coach_profiles (is_published);

-- ── sport_metrics ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sport_metrics_sport_id
  ON sport_metrics (sport_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sport_metrics_sport_id_key_unique
  ON sport_metrics (sport_id, key);

-- ── player_sports ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_player_sports_player_user_id
  ON player_sports (player_user_id);
CREATE INDEX IF NOT EXISTS idx_player_sports_sport_id
  ON player_sports (sport_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_player_sports_player_sport_unique
  ON player_sports (player_user_id, sport_id);

-- ── user_relationships ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_relationships_source_user_id
  ON user_relationships (source_user_id);
CREATE INDEX IF NOT EXISTS idx_user_relationships_target_user_id
  ON user_relationships (target_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_relationships_unique
  ON user_relationships (source_user_id, target_user_id, relationship_type);

-- ── coach_review_requests ─────────────────────────────────────────────────────
-- Prevent duplicate review requests for same player+coach+post
CREATE UNIQUE INDEX IF NOT EXISTS idx_coach_review_requests_unique
  ON coach_review_requests (player_user_id, coach_user_id, post_id);
-- Coach inbox: list requests assigned to a coach filtered by status
CREATE INDEX IF NOT EXISTS idx_coach_review_requests_coach_status
  ON coach_review_requests (coach_user_id, status);
-- Player dashboard: list all requests submitted by a player
CREATE INDEX IF NOT EXISTS idx_coach_review_requests_player_user_id
  ON coach_review_requests (player_user_id);

-- ── coach_feedback_items ──────────────────────────────────────────────────────
-- All feedback items for a given review request
CREATE INDEX IF NOT EXISTS idx_coach_feedback_items_review_request_id
  ON coach_feedback_items (review_request_id);

-- ── coach_ratings ─────────────────────────────────────────────────────────────
-- One rating per completed review session (primary idempotency constraint)
CREATE UNIQUE INDEX IF NOT EXISTS uq_coach_ratings_request
  ON coach_ratings (review_request_id);
-- Coach-scoped listing: most recent first
CREATE INDEX IF NOT EXISTS idx_coach_ratings_coach_created
  ON coach_ratings (coach_user_id, created_at DESC);
-- Player rating history
CREATE INDEX IF NOT EXISTS idx_coach_ratings_player
  ON coach_ratings (player_user_id);



-- ── products ──────────────────────────────────────────────────────────────────
-- Covered by CONSTRAINT uq_products_slug (no extra index needed)
CREATE INDEX IF NOT EXISTS idx_products_type_active
  ON products (type, is_active);

-- ── plans ─────────────────────────────────────────────────────────────────────
-- Covered by CONSTRAINT uq_plans_slug
CREATE INDEX IF NOT EXISTS idx_plans_product_id
  ON plans (product_id);
CREATE INDEX IF NOT EXISTS idx_plans_is_public_sort_order
  ON plans (is_public, sort_order);

-- ── prices ────────────────────────────────────────────────────────────────────
-- Covered by CONSTRAINT uq_prices_plan_interval
CREATE INDEX IF NOT EXISTS idx_prices_plan_id
  ON prices (plan_id);
CREATE INDEX IF NOT EXISTS idx_prices_is_active
  ON prices (plan_id, is_active);

-- ── plan_features ─────────────────────────────────────────────────────────────
-- Covered by CONSTRAINT uq_plan_features
CREATE INDEX IF NOT EXISTS idx_plan_features_plan_id
  ON plan_features (plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_features_feature_id
  ON plan_features (feature_id);

-- ── subscriptions ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id
  ON subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status
  ON subscriptions (status);
-- Efficient renewal/expiry cron queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end_active
  ON subscriptions (current_period_end);
-- Look up active subscription for a user (most common entitlement check path)
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id_status_active
  ON subscriptions (user_id, status);

-- ── payment_orders ────────────────────────────────────────────────────────────
-- Covered by CONSTRAINT uq_payment_orders_idempotency
CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id
  ON payment_orders (user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_provider_order_id
  ON payment_orders (provider_order_id);
-- Cron job to clean up/expire stale pending orders
CREATE INDEX IF NOT EXISTS idx_payment_orders_status_pending
  ON payment_orders (status, expires_at);

-- ── payment_transactions ──────────────────────────────────────────────────────
-- Covered by CONSTRAINT uq_payment_txn_provider_payment
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_order_id
  ON payment_transactions (payment_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_subscription_id
  ON payment_transactions (subscription_id) WHERE subscription_id IS NOT NULL;

-- ── quota_usage ───────────────────────────────────────────────────────────────
-- Covered by CONSTRAINT uq_quota_usage (user_id, feature_key, period_start)
-- Additional index for user-only lookups (e.g. fetching all usage for a user)
CREATE INDEX IF NOT EXISTS idx_quota_usage_user_id
  ON quota_usage (user_id);

-- ── webhook_events ────────────────────────────────────────────────────────────
-- Covered by CONSTRAINT uq_webhook_events_provider_event
-- Query unprocessed/failed events for retry processor
CREATE INDEX IF NOT EXISTS idx_webhook_events_status
  ON webhook_events (status);

-- ══════════════════════════════════════════════════════════════════════════════
-- Leaderboard System
-- ══════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE perf_event_status_enum AS ENUM ('pending', 'applied', 'rejected', 'duplicate');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── player_performance_events ──────────────────────────────────────────────────
-- Audit log for every AI performance score from the model pipeline.
-- source_event_id = post_id, enforcing one score per uploaded video.
-- The UNIQUE constraint on source_event_id provides idempotency.
CREATE TABLE IF NOT EXISTS player_performance_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sport_id         UUID NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
  source_event_id  VARCHAR(150) NOT NULL,
  score            DOUBLE PRECISION NOT NULL,
  skill_scores     JSONB,
  status           perf_event_status_enum NOT NULL DEFAULT 'pending',
  applied_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_perf_event_source UNIQUE (source_event_id)
);
CREATE INDEX IF NOT EXISTS idx_perf_events_user_sport ON player_performance_events (user_id, sport_id);
CREATE INDEX IF NOT EXISTS idx_perf_events_status     ON player_performance_events (status);

-- ── player_performance_scores ──────────────────────────────────────────────────
-- Running average of AI performance scores per (user × sport).
-- This is the leaderboard source of truth for sport-specific rankings.
CREATE TABLE IF NOT EXISTS player_performance_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sport_id        UUID NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
  avg_score       DOUBLE PRECISION NOT NULL DEFAULT 0,
  prev_avg_score  DOUBLE PRECISION NOT NULL DEFAULT 0,
  video_count     INTEGER NOT NULL DEFAULT 0,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version         INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_player_perf_score_user_sport UNIQUE (user_id, sport_id)
);
-- Hot read path: rank N players in a given sport by score descending
CREATE INDEX IF NOT EXISTS idx_player_perf_score_sport_avg ON player_performance_scores (sport_id, avg_score DESC);
CREATE INDEX IF NOT EXISTS idx_player_perf_score_user_id   ON player_performance_scores (user_id);

-- ── universal_performance_scores ───────────────────────────────────────────────
-- Simple average of avg_score across ALL sports for a user.
-- Source of truth for the universal (cross-sport) leaderboard.
CREATE TABLE IF NOT EXISTS universal_performance_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  avg_score       DOUBLE PRECISION NOT NULL DEFAULT 0,
  prev_avg_score  DOUBLE PRECISION NOT NULL DEFAULT 0,
  video_count     INTEGER NOT NULL DEFAULT 0,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version         INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_universal_perf_score_user UNIQUE (user_id)
);
CREATE INDEX IF NOT EXISTS idx_universal_perf_score_avg ON universal_performance_scores (avg_score DESC);

-- ── player_skill_scores ────────────────────────────────────────────────────────
-- Running average per skill dimension (footwork, defense, smash, …) per (user × sport).
-- metric_key matches sport_metrics.key. Drives the radar chart on player profiles.
CREATE TABLE IF NOT EXISTS player_skill_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sport_id        UUID NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
  metric_key      VARCHAR(100) NOT NULL,
  avg_score       DOUBLE PRECISION NOT NULL DEFAULT 0,
  video_count     INTEGER NOT NULL DEFAULT 0,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_player_skill_score UNIQUE (user_id, sport_id, metric_key)
);
CREATE INDEX IF NOT EXISTS idx_player_skill_scores_user_sport ON player_skill_scores (user_id, sport_id);

-- ── geo_profiles ───────────────────────────────────────────────────────────────
-- Stores a player's geographic location for future geo-scoped leaderboards.
-- Table created now so activation requires zero schema migration.
-- Not queried by any leaderboard logic until the geo feature is activated.
CREATE TABLE IF NOT EXISTS geo_profiles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  country    VARCHAR(3),
  state      VARCHAR(100),
  city       VARCHAR(100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_geo_profiles_user UNIQUE (user_id)
);
CREATE INDEX IF NOT EXISTS idx_geo_profiles_country       ON geo_profiles (country);
CREATE INDEX IF NOT EXISTS idx_geo_profiles_country_state ON geo_profiles (country, state);

-- ============================================================
-- Migration: user_favourites table
-- Supports: coach favourites (target_type = 'coach')
-- Future:   video bookmarks  (target_type = 'video')
-- ============================================================

CREATE TABLE IF NOT EXISTS user_favourites (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type VARCHAR(30) NOT NULL,   -- 'coach' | 'video'
  target_id   TEXT        NOT NULL,   -- UUID string (coach user_id) or MongoDB ObjectId (video post_id)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_favourite UNIQUE (user_id, target_type, target_id)
);

-- Fast lookup: all favourites for a user + type (used by GET /favourites and the coach listing)
CREATE INDEX IF NOT EXISTS idx_user_favourites_user_type
  ON user_favourites (user_id, target_type);


-- ══════════════════════════════════════════════════════════════════════════════
-- Seed Data
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO roles (name)
VALUES ('player'), ('parent'), ('coach'), ('admin')
ON CONFLICT (name) DO NOTHING;
