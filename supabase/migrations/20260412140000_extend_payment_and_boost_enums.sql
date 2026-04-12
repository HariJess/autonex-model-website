-- Enum extensions (separate file so values are committed before use in follow-up migration)

ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'under_review';
ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'rejected';
ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'cancelled';

ALTER TYPE public.boost_type ADD VALUE IF NOT EXISTS 'agency_spotlight';
