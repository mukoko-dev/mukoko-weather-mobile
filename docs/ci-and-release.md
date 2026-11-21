# CI and release

Trunk-based: pull requests go straight to `main`. There is no staging branch.

## Workflows

| Workflow                                    | Runs on                          | Where      | What it does                                                                                             |
| ------------------------------------------- | -------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml`                  | PRs, merge queue, push to `main` | GitHub     | `quality` (typecheck, tests, one-backend guard), `expo-doctor`, `bundle` (Android and iOS JS export)     |
| `.eas/workflows/publish-preview-update.yml` | push to every branch             | Expo (EAS) | Publishes the JavaScript to the EAS Update branch named after the git branch                             |
| `.eas/workflows/preview-build.yml`          | PRs to `main`                    | Expo (EAS) | Fingerprints the native code; builds the `preview` profile per platform only if no matching build exists |
| `.eas/workflows/release-main.yml`           | push to `main`                   | Expo (EAS) | Per platform: matching production build exists, publish OTA to `production`; else build `production`     |
| `.eas/workflows/submit-stores.yml`          | manual only                      | Expo (EAS) | Builds production Android (app bundle) and iOS, then submits to Google Play and App Store Connect        |

Lint, format, markdown, yaml and `actionlint` gates come from the org workflows, not from `ci.yml`.
EAS workflows run on Expo's infrastructure: no GitHub secrets and no `EXPO_TOKEN` are needed.

## Running the store submission

`submit-stores.yml` has no trigger. Run it on purpose:

```bash
npx eas-cli workflow:run .eas/workflows/submit-stores.yml
```

## Human actions

1. **Apple IDs.** `eas.json` `submit.production.ios` still holds `OWNER-FILL` placeholders for `ascAppId` (numeric Apple ID from App Store Connect) and `appleTeamId` (10-character Team ID). Fill them before the iOS submit job can work.
2. **EAS GitHub app.** Link the repository to the EAS project (expo.dev, project settings, GitHub) so the `.eas/workflows` triggers fire.

Android submission also needs a Google Play service account key configured in EAS, and the Play Console app created.
