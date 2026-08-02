# Social & Moderation

**Status: data model only.** Tables exist for pull posts, showcases, social posts,
comments, reactions, follows, blocks, reports, badges, clubs/club members, challenges/
completions, notifications (`src/server/db/schema/social.ts`). No application code, API
routes, or UI exist yet.

## Design constraints already encoded in the schema

- `pullPosts` requires an explicit row to exist before a pull is shareable — a `Rip` never
  automatically creates a `PullPost`. Sharing is opt-in by construction: there is no
  trigger, no default-true visibility flag, and no code path that inserts a `PullPost`
  except a future explicit "share" action.
- `pullPosts.visibility` defaults to `"public"` only for the _post itself_ once a user has
  chosen to create one — shipping address, exact wallet address, supplier order number,
  private payment metadata, spend/loss totals are **not columns on `pullPosts` at all**,
  so there is no field to accidentally expose them from.
- `moderationActions` covers comment/post removal, temporary/permanent suspension, with an
  `appealNote` field.
- `reports` has a `status` enum (`open`/`actioned`/`dismissed`) and `resolvedByAdminId`.
- No direct-messaging table exists anywhere in the schema — DMs are out of scope for this
  beta per spec section 45, enforced by omission.
- No spend/loss/purchase-count leaderboard table or column combination exists — only
  collection-focused fields (showcases, badges, follower counts) are queryable for
  leaderboard purposes, per spec section 30.

## Not yet implemented

Feed rendering, follow/block/report UI and API routes, comment/reaction endpoints, image
scanning and upload validation for avatars/banners/showcase covers, username moderation,
link filtering, anti-spam rate limits (the generic `checkRateLimit()` helper exists and
would be reused here), club moderation tools, and challenge completion tracking. See
PROJECT_STATUS.md.
