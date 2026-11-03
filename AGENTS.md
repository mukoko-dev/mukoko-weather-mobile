# Expo HAS CHANGED

Read the exact versioned docs at <https://docs.expo.dev/versions/v58.0.0/> before writing any code.
The SDK 58 release notes and upgrade steps are at <https://expo.dev/changelog/sdk-58>; the Expo Router migration is at <https://docs.expo.dev/router/migrate/sdk-57-to-58/>.

## One backend only

The app talks to the Cloudflare weather API and nothing else: no website's server, no database, no weather provider (owner, 2026-11-01). The base URL and every route live in `src/api/client.ts`. Never add a database client or URL: if the app needs data the API does not serve, ask for an API route. `scripts/check-cloudflare-only.mjs` (run by `npm test`) fails on a retired host, a database URL or package, or a direct provider call.

## Track big work in GitHub issues

Any substantial build, migration, investigation or multi-step task gets a GitHub issue in the repo that owns it — before or as work starts — so another session, agent or person can pick it up.

- The issue holds the goal, the owner's decisions (verbatim where given), the plan, acceptance criteria, owner-only steps and links.
- Every PR references its issue: `Closes #n` when the merge completes it, `Refs #n` for partial work, or `No issue: <reason>` for a trivial change. The org's `issue attached` check enforces this on the PR description. A staging-to-main release PR repeats the `Closes #n` line of every issue its PRs close, or those issues stay open.
- Post progress, decisions and a hand-off note (what's done, what's left, branch names) as issue comments — at each merge and before a session or agent finishes.
- Work spanning repos gets a tracking issue that links the per-repo issues.
- Never put secrets, credential status or exploitable detail in issues on public repos.

## The rulesets hold the authority

This file describes how work is done here; it enforces nothing and overrides nothing. The GitHub rulesets are the rules (owner, 2026-11-03). Where this file differs from them, the rulesets win and this file is the one to fix.

Read them with `gh api repos/mukoko-dev/mukoko-weather-mobile/rulesets?includes_parents=true`. As of 2026-11-03 they enforce, on `staging` and `main`:

- **Pull requests only.** No direct pushes, no deletion, no force-push; review threads must be resolved; zero approving reviews are required.
- **Linear history on `staging`.** The merge queue squashes (`merge-queue-staging`, `merge-queue-main`); `gh pr merge` only queues a PR, and a PR that conflicts with its base never enters the queue.
- **Required checks.** The org lint workflow (`lint / actionlint`, `markdownlint`, `yamllint`, `vite-plus / fmt`, `check`, `test`, `build`), plus the enterprise `dependency-review` and `release-version-check` workflows.
- **Issue reference.** The `issue attached` check, described above.

If a ruleset changes, update this list in the same change.

## Releases

`staging` is released to `main` by pull request. A direct merge conflicts on `.github/workflows/staging-version.yml`, so cut the release branch from `origin/main` and set its tree to `origin/staging` (`git read-tree -u --reset origin/staging`; `git diff origin/staging` must be empty). The owner approves major versions only; a release or merge below a major needs no approval (owner, 2026-11-03).

## Dev skills and progress reports

Load the Mzizi **dev skills** before starting work: `mzizi_get_skills category=dev` on the Mzizi MCP (`mcp.mzizi.dev`), or `@nyuchi/mzizi-skills` from npm. They are `digital-hygiene` and `progress-report`.

- **Digital hygiene.** Check free disk before starting, clone only under `$TMPDIR`, share build caches, and audit, then delete, your clones once the work merges (`digital-hygiene` skill).
- **Clone isolation.** Clone only into a directory unique to you; never touch another agent's.
- **Progress reports.** All dev work runs on a 10-minute progress-report loop (`progress-report` skill): measured bars, what changed, and a final "Needs you:" line.
- **Before you merge.** The rulesets only require green checks and resolved threads. Beyond that, practice here is to run `/code-review` and resolve its findings, and to check a change in the running app before it merges; neither is enforced, so say so in the PR if you skip one.
