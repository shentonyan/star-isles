# Release verification

Checked on 2026-10-21 (Asia/Hong_Kong).

- Desktop browser: Microsoft Edge, 1440 × 900.
- Mobile emulation: 390 × 844, touch enabled. Layout fits viewport and touch movement works. This is emulation, not a physical-device test.
- Walked the entire coast using keyboard movement and jumps, with no teleport shortcuts for collection.
- Collected all 12 stars and discovered all five landmarks.
- Map offers only discovered destinations; teleported back to the lighthouse.
- Pressed E to light the lighthouse; checked ending visuals.
- Reloaded and verified completion survives in browser storage.
- Opened the library and verified project links appear.
- Observed no uncaught browser errors during the full journey.
- Blocked WebAssembly loading and confirmed compatibility mode starts and movement still works.
- Compared all 560 Rust/WebAssembly terrain heights to the JavaScript fallback.
- Node tests cover terrain continuity, map/collectible bounds, corrupt saves, complete saves and shipped WebAssembly parity.
- GitHub Actions runs Rust native unit tests on Linux and rebuilds the WebAssembly artifact for deployment. Local Windows native Rust tests require the MSVC linker; the local WebAssembly build succeeds without it.

Screenshots: `preview.png` (title), `ending.png` (completed lighthouse), `mobile.png` (mobile gameplay).
