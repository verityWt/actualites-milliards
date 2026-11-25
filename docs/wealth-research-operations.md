# Wealth Research — deployment and verification register

Updated: 2026-11-25 (Europe/Brussels)

## Architecture in use
- Repository: verityWt/actualites-milliards (Cloudflare Pages builds from main).
- Production discovery Worker: actualites-wealth-research; **not updated by this PR**.
- Production KV namespace: actualites-wealth-research-v1 (separate from staging).
- Staging Worker: actualites-wealth-research-staging.
- Staging KV: actualites-wealth-research-staging; namespace 94f08eee8ba14504a960b7c3d585a941.
- Staging Worker deployment version: e588e4e1-2dbe-4725-8433-1e2f0f9a37c4.
- Worker source at staging deployment: GitHub PR #1 branch, commit 643983d53a5c4971707245d87a24c70ed68a50d7.
- Staging Worker uses two ES modules: wealth-research.mjs and research-intelligence.mjs.
- The staging worker's workers.dev subdomain is enabled. No scheduled cron has been configured for staging. Production cron remains */15 * * * *.

## Evidence from production
The production KV status read on 2026-11-25 returned:
- lastSuccess: 2026-11-25T14:00:31.543Z
- lastAttempt: 2026-11-25T14:30:32.282Z
- state: error
- reason: provider HTTP 429
- lead entries: 17

Separate title-only analysis of the 17 stored records (using the PR classification logic):
- 2 contained a known person's full name.
- 3 contained a monitored event-category cue.
- 0 satisfied both checks.
- 2 duplicate normalized-title groups.
- 0 evidence-verified events (the pipeline does not yet verify documents).

These classification counts are code-derived and are **not yet production metrics**.

## Why publication is blocked
Discovery is not evidence. Every candidate currently remains pending_review / discovery_only. A confirmed event requires source acquisition, event entity resolution, extraction of exact claims, evidence anchoring with URL and timestamps, source lineage checks, temporal reconciliation, and an explicit publish gate.

## CI blocker
GitHub Actions checks on PR #1 are failing before visible job steps. The connector returned empty steps and failed to retrieve hosted logs. Root cause unknown; do not declare successful CI or merge on this basis. Cloudflare Pages builds of branch previews can independently succeed but do not prove unit tests.

## Promotion checklist
- [ ] GitHub Actions runner issue diagnosed; CI tests and build green
- [ ] Worker-focused tests run and documented
- [ ] Cloudflare staging /status endpoint confirmed over HTTPS
- [ ] Staging test collection successful, including a 429 backoff scenario
- [ ] Verify production code and stage source match reviewed commit
- [ ] Merge PR #1 after review
- [ ] Deploy reviewed ES modules to production Worker, preserving production KV binding and existing cron
- [ ] Verify first scheduled production collection post deployment
- [ ] Check public Pages deployed commit, actualites.fr DNS/domain mapping separately

## Editorial guardrails
- A GDELT result is a discovery candidate, not a verified fact.
- The same title across different domains does not mean independent corroboration.
- A title match is not evidence of a person's relationship to an event.
- No personal psychological/clinical scores, private-life inferences or invented wealth projections.
- Next Billionaires remains without ranked predictions until shareholdings and valuations have dated sources.
