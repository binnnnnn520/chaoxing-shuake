# MultiVideo Side Panel

Edge MV3 side-panel extension for collecting multiple video links, confirming the pending list, and running up to six video tasks through inline playback or degraded background webpage control.

## Development

1. `npm install`
2. `npm run test`
3. `npm run typecheck`
4. `npm run build`

## Load In Edge

1. Open `edge://extensions`.
2. Enable Developer mode.
3. Select Load unpacked.
4. Choose this repository's `dist` directory after running `npm run build`.

## Manual QA

1. Run `npm run fixtures`.
2. Open the extension side panel in Edge.
3. Paste these fixture URLs as separate lines:
   - `http://127.0.0.1:4173/sample.mp4`
   - `http://127.0.0.1:4173/webpage-link.html`
4. Start both tasks and verify that the `.mp4` URL renders inline, while the webpage URL runs through background/degraded mode.
5. Close and reopen the side panel and verify task state remains visible.

## Verification

Run:

```powershell
npm run test
npm run typecheck
npm run build
npm run fixtures
npm run e2e
```

`npm run e2e` expects the fixture server to be running at `http://127.0.0.1:4173`.
The Playwright check uses the installed Microsoft Edge channel instead of downloading a separate Chromium binary.
