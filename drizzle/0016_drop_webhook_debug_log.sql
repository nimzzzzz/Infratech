-- Drop webhook_debug_log. The table was created in migration 0015
-- as a one-shot diagnostic when Vercel runtime logs weren't
-- surfacing webhook POST entries; it captured the Clerk
-- user.updated payload shape so we could see where the LinkedIn
-- avatar URL actually lives.
--
-- The real V.2 fix (fetch-at-sign-in via clerkClient.users.getUser
-- in /post-signin) supersedes the webhook avatar write entirely, so
-- there's nothing left referencing this table. Drop it.
--
-- Idempotent: IF EXISTS guard. Reversible by re-running migration
-- 0015 (though there's no reason to).

DROP TABLE IF EXISTS webhook_debug_log;
