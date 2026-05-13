-- vendor_members.avatar_url — LinkedIn profile picture URL from Clerk.
-- V.2 (2026-05-13). Populated by the webhook on user.created /
-- user.updated from Clerk's `image_url` payload field. Nullable: a
-- vendor_member created via lazy-create paths that didn't carry an
-- avatar (or a user without one on LinkedIn) gets NULL — the
-- UserAvatar component falls back to initials when the URL is null
-- or fetch errors out.
--
-- Hand-written, idempotent. Same pattern as migration 0012.

ALTER TABLE vendor_members
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;
