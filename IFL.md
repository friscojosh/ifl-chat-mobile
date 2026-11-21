# IFL Chat mobile

IFL Chat for iPhone and Android: a fork of the Mattermost mobile app (`ifl/main`, upstream base in `ifl/UPSTREAM`) that connects only to `https://chat.iflgm.com`, signs in with "Sign in with iflgm.com", shows each GM's team chip and gets pushes through IFL's own push proxy. Server: `friscojosh/ifl-chat`. Design and plan: ifl-website `docs/superpowers/specs/2026-11-21-ifl-chat-apps-design.md`, `docs/superpowers/plans/2026-11-21-ifl-chat-apps.md`.

New IFL code: `app/utils/ifl/`, `app/components/ifl/` (inside existing path aliases), `ifl/` (assets, fastlane settings, scripts) and `.github/workflows/ifl-*.yml`. Upstream edits are hooks marked `// IFL:` (`{/* IFL: */}` in JSX), listed below. Nothing generated at build time is committed: CI copies `ifl/assets` to `assets/override` (git-ignored upstream) and `ifl/fastlane.env` to `fastlane/.env.ifl`, and fastlane rewrites identifiers with `COMMIT_CHANGES_TO_GIT=false`.

## Hooks into upstream files

| Location | Purpose |
| --- | --- |

## Overrides (no code)

`scripts/generate-assets.js` copies `assets/override/<path>` over `assets/base/<path>` into `dist/assets/` (JSON shallow-merged); a file with no base counterpart is ignored, so every override keeps a base file's path and name.

## Build and release

See "Releases". `ifl-ci.yml` runs types, lint and the IFL tests on every push and pull request, and builds a debug-signed Android release APK with the placeholder `ifl/ci/google-services.json`. Upstream test and build workflows are disabled.

## Upstream releases

1. Before merging a release, compare its `app/constants/supported_server.ts` `FULL_VERSION` with the server fork's Mattermost version; if the app needs a newer server, merge the server first.
2. `git fetch upstream --tags`, `git checkout ifl/main`, `git merge <tag>`; keep every `// IFL:` hook.
3. `rm -rf assets/override && cp -R ifl/assets assets/override && rm -rf assets/override/src && npm ci && npm run tsc && npx jest app/utils/ifl app/components/ifl`.
4. Set `ifl/UPSTREAM`; push; run the release.

## License

Mattermost mobile is Apache-2.0 (`LICENSE.txt`, `NOTICE.txt`, kept unchanged).
