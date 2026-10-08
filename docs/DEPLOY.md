# Static deployment

## GitHub Pages

The website is published by `.github/workflows/deploy.yml`. The workflow builds on Ubuntu with Node 22, installs with `npm ci`, runs `npm run build`, uploads `dist` and publishes through the `github-pages` environment. It runs on pushes to `main` or a manual **Actions → Deploy birthday website to GitHub Pages → Run workflow**. Publishing is restricted to `main`.

Site URL: https://sarawut2001.github.io/Happy_Birthday/

Repository Pages source must be **GitHub Actions**. Build permissions are read-only; the separate publish job has `pages: write` and `id-token: write`. No additional token or environment secret is stored in the repository. Concurrent deployments are queued without cancelling an in-progress publication.

To roll back, revert the relevant commit and push to `main`. The same workflow publishes the rebuilt previous version. To redeploy the current version, run the workflow manually on `main`.

The `main` branch contains the complete React/Vite website, runtime GLB models, nine memory photographs, a puzzle photograph and the prepared presentation MP4/poster. The user approved publishing this prepared media in the public repository on 2026-10-08. Raw files under `image/`, duplicate local checkouts, browser screenshots, `node_modules/` and `dist/` remain local.

## Build settings

- Node.js: 22.12 or newer (verified locally with 22.17.1).
- Install: `npm ci`.
- Build: `npm run build`.
- Output directory: `dist`.
- Project/root directory: the repository root.
- Environment variables: none required.

`prebuild` retrieves the two licensed audio recordings from their original Mixkit URLs when absent, validates their SHA-256 hashes, then generates the thirteen original sound effects. Build needs outbound access to `assets.mixkit.co` on the first run. Downloaded audio stays excluded from Git and is included in the completed website under `dist/assets/audio/`. Preparation fails explicitly if a recording cannot be retrieved or its bytes change.

The prepared photos, video and models are already committed. Deployment does not require macOS, Swift or media conversion. `npm run photos:prepare` and `npm run video:prepare` are optional local tools for replacing media later; they require the ignored originals under `image/` and the video tool requires macOS.

Vite uses `base: './'`. Upload all contents of `dist/`, including the nested assets. The website has no server API or history-based page routes. The PIN is a story interaction and is checked in the browser.

## Local production preview

```sh
npm ci
npm run build
npm run preview -- --port 4173
```

Check the full journey, the music toggle, the universe photos/puzzle and presentation playback. Media uses browser-supported H.264/AAC MP4 with full 16:9 display. Current QA covers headless Chromium; physical iPad/Safari performance is still to be checked.

Existing build warning: the shared Three engine chunk exceeds Vite's size warning threshold. The build succeeds.
