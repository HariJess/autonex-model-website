-- Mission 2.A — Extend listing_status enum with 'hidden_pending_review'.
--
-- This value is reserved for Mission 2.B (auto-masking when a listing gets
-- 3+ pending reports). Added now in a standalone migration because Postgres
-- requires ALTER TYPE ADD VALUE to be committed before the new value can be
-- used in subsequent DDL or functions within the same transaction.

ALTER TYPE public.listing_status ADD VALUE IF NOT EXISTS 'hidden_pending_review';
