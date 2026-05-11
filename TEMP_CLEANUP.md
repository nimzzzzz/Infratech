# Temporary Production Data — Phase D.5 Smoke Test Unblock

**Date created:** 2026-05-11
**Cleanup owner:** Nima
**Cleanup trigger:** Phase B.2 PR 2 ships (vendor row creation on submission)

## Reason this exists

Phase D.5 (production smoke test) was blocked by an unbuilt feature, not a
bug. A fresh production user signing up via LinkedIn OAuth has:

- `vendor_members.onboarded = true` (legal modal accepted in PR 1)
- `vendor_members.vendor_id = NULL` (no vendor row yet)

Three page-level guards bounce that user in a loop between
`/dashboard/onboarding` and `/dashboard/onboarding/submit`:

1. `lib/auth/session.ts` closed-shape `getVendorSession`: `!vendor` → redirect to `/dashboard/onboarding`
2. `app/dashboard/page.tsx`: `listings.length === 0` → redirect to `/dashboard/onboarding`
3. `app/dashboard/onboarding/submit/page.tsx:49`: `!vendor` → redirect to `/dashboard/onboarding`

Phase B.2 PR 2 is the planned fix — it ships `POST /api/submissions` which
creates the `vendors` row on first submission, plus rewrites Guard 3 and
the stale `skipCompanyStep` heuristic at submit/page.tsx:54. Until PR 2
ships, fresh signups can't complete a submission.

To unblock the D.5 smoke test for the operator (Nima), a placeholder
`vendors` row was inserted manually on production and the operator's
`vendor_members.vendor_id` repointed at it. This is a one-off — DO NOT
use the same workaround for any other vendor signup; ship PR 2 instead.

## Exact rows to clean up after PR 2 ships

### 1. Delete the placeholder `vendors` row

```sql
DELETE FROM vendors WHERE id = 97;
```

Row details at time of insert:
- `id = 97`
- `slug = 'nima-test-vendor'`
- `name = 'Nima Test Vendor'`
- `contact_email = 'nima.f.sedaghati@gmail.com'`
- `claimed_at = 2026-05-11T16:47:05.410Z`

### 2. Null the operator's `vendor_members.vendor_id`

```sql
UPDATE vendor_members
SET vendor_id = NULL, updated_at = NOW()
WHERE id = 89 AND vendor_id = 97;
```

Row details:
- `vendor_members.id = 89`
- `clerk_user_id = 'user_3DaAtHR4cJAw60tTmwYWhgh031Q'`

### 3. Decide what to do with any rows the operator created downstream

When the operator (Nima) tested the wizard, they likely created:

- A row in `submissions` linked to `vendor_id = 97`
- A row in `apps` if the wizard's last step persists one before review

After PR 2 ships and the operator re-runs the flow as a real signup,
delete these test artifacts:

```sql
-- Check first:
SELECT id, vendor_id, app_id, status, created_at
FROM submissions WHERE vendor_id = 97;

SELECT id, slug, name, vendor_id, status, created_at
FROM apps WHERE vendor_id = 97;

-- Then delete in this order to satisfy FK constraints:
DELETE FROM app_screenshots WHERE app_id IN (SELECT id FROM apps WHERE vendor_id = 97);
DELETE FROM app_stages       WHERE app_id IN (SELECT id FROM apps WHERE vendor_id = 97);
DELETE FROM app_capabilities WHERE app_id IN (SELECT id FROM apps WHERE vendor_id = 97);
DELETE FROM app_industries   WHERE app_id IN (SELECT id FROM apps WHERE vendor_id = 97);
DELETE FROM app_pricing_models WHERE app_id IN (SELECT id FROM apps WHERE vendor_id = 97);
DELETE FROM apps        WHERE vendor_id = 97;
DELETE FROM submissions WHERE vendor_id = 97;
DELETE FROM vendor_regions WHERE vendor_id = 97;
-- Then run step 2 (null vendor_id on vendor_members) and step 1 (delete vendor)
```

### 4. Delete the one-off scripts

```
scripts/d5-step2-select-member.mjs
scripts/d5-step4-slug-check.mjs
scripts/d5-step5-insert-vendor.mjs
scripts/d5-step6-update-member.mjs
scripts/d5-step7-verify.mjs
```

### 5. Delete this file

```
TEMP_CLEANUP.md
```

## What PR 2 must do so this workaround is never reused

- `POST /api/submissions` creates the `vendors` row when
  `vendor_members.vendor_id` is null, then the `submissions` row.
  Wrapped in a transaction so both succeed or neither does.
- Remove or rewrite the `!vendor` redirect at
  `app/dashboard/onboarding/submit/page.tsx:49` so vendor-less users
  can enter the wizard.
- Fix the `skipCompanyStep` heuristic at
  `app/dashboard/onboarding/submit/page.tsx:54`. Currently:
  `asParam === "returning" || vendorMember.onboarded`. Should be:
  `asParam === "returning" || vendor != null`. The current check is
  stale from before the B.1 schema split — `onboarded` now means
  "accepted legal", not "has a vendor row".
- The wizard's "Your company" step must collect company info and pass
  it to the new endpoint when `vendor` is null. When `vendor` is
  populated, prefill from it (current behavior).
- Once PR 2 is live, re-run the D.5 smoke test as a brand-new vendor
  (different LinkedIn account, ideally) end-to-end to confirm the
  real path works without manual DB intervention.

## Audit trail

DB writes that landed on production:

| When (UTC) | Statement | Result |
|---|---|---|
| 2026-05-11 16:47:05 | `INSERT INTO vendors (...) RETURNING id` | id = 97 |
| 2026-05-11 16:51:18 | `UPDATE vendor_members SET vendor_id=97 WHERE id=89 AND vendor_id IS NULL` | 1 row affected |

Both verified via post-write SELECTs (see
`scripts/d5-step7-verify.mjs`).
