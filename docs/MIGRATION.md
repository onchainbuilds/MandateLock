# Official repository migration — awaiting approval

Destination: **https://github.com/onchainbuilds/MandateLock**, verified in Google Chrome as private, owned by the signed-in `onchainbuilds` account, and empty on October 31, 2026. No remote mutation occurred. Only Chrome's authenticated session may be used for GitHub browser work.

## Reviewable local package

`.migration/onchainbuilds-MandateLock/` is a plain directory, not a Git checkout. `.migration/upload-manifest.json` lists every proposed upload path, byte count and SHA-256. `.migration/review.json` records the file count, scans, preserved history and evidence hashes. These are local review artifacts, not a commit or upload.

The package includes contract source and lockfiles, all 44 original native tests, all twelve original sandbox scenarios, all four original harness regressions, eight new model tests, the opt-in Phase 2B harness and test-fixture generator, both manual private-repository workflows, README, Phase 0/1A/1B/2A/2B reports, and selected Phase 2A JSON evidence. Historical reports are marked as historical. Upload copies replace personal local filesystem prefixes with placeholders and fix workspace file links; source and raw transaction evidence remain byte-identical. Referenced local diagnostic logs are deliberately not all included.

Excluded: `.git` internals, credentials, `.env`, private keys, personal machine paths, caches, `target`, generated Wasm binaries, Docker signed download diagnostics, local scratch checkouts, redundant RPC journals and complete workflow/build logs. Full evidence and original reports remain in the workspace. The selected JSON records contain synthetic sandbox account IDs, public keys and transaction signatures, not signing secrets. A signature is public transaction evidence and cannot sign a different transaction.

## Preservation

- Existing publication checkout remains clean at `a539ef3b4a243afb7376067b40b052645d5f1111`; its parent is `aafa39088174acee179dfc17647e0202b3ee4879`. Both use the project-only author identity `MandateLock Phase 2A <phase2a@mandatelock.invalid>`. Both commits' tracked content is reviewed for secrets before migration; no history rewrite is proposed.
- `artifacts/migration/phase2a-history.bundle`: complete verified local Git history; SHA-256 `0ff529ea520b93a4deb90636cb2d450ddf627621f5a94ea911446abcecb94aa8`. The bundle retains historical remote-tracking metadata, but performs no network access.
- `artifacts/migration/phase2a-complete-evidence.zip`: copy of the complete successful-run download, including original Wasm/logs/raw RPC; SHA-256 `158f19fe65523ec55a758eeb919714cced5b8f6fd86afa06470c8bf77e46ad27`. This binary archive is local only, not part of the proposed Git upload. A per-file hash manifest is included in the migration's evidence directory.
- The old repository is neither changed nor deleted. Old repository URLs in historic evidence remain truthful provenance and are not destinations for new work.

## Proposed actions after explicit approval

1. Reverify private visibility, owner, signed-in Chrome identity and destination emptiness. Stop if any differ; do not overwrite unexpected content.
2. Create a separate local Git migration checkout from the verified bundle, preserving both commits. Overlay only paths in the reviewed upload manifest; use the project-only commit identity. Existing checkout/remotes stay untouched. Review the exact commit delta again.
3. Configure **only that new checkout's** origin to `https://github.com/onchainbuilds/MandateLock.git`. Git network credentials must first independently verify as `onchainbuilds`. Current CLI credentials belong to the old account; Chrome authentication does not fix Git authentication. No token extraction from Chrome, credential copying or old-account fallback is permitted.
4. After identity/privacy/empty-repository and manifest checks pass, commit the reviewed migration delta and push `main` normally, without force. This transfers the two original commits plus one migration commit. Neither workflow has a push trigger.
5. If separately included in the user's approval, dispatch **one** manual `phase2b-security.yml` run from Chrome in the private official repository. It reruns Phase 2A, then the new Phase 2B cases. Collect evidence and report results before further work. No repeat dispatch without approval.

Steps 2–5 are proposals, not actions taken. The approval must name remote setup/upload and whether the one CI dispatch is authorized. No public NEAR deployment, public repository, frontend or unrelated project work is included.
