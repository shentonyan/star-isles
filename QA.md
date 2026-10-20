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

## English interface and project curation

- Checked all five place panels against their nine configured repository links.
- Inspected the English title on desktop and a 390 × 844 mobile viewport, plus the project-card panel on desktop.
- Verified the map, help, collection prompts, lighthouse ending and sound toggle use English.
- Scanned the shipped HTML, game text, world data and README for remaining Chinese text; none found.
- Used a seeded save to inspect every destination and the ending; existing save keys and place indices are unchanged.
- Each project has a short purpose statement. The 2048 × Jev repository is explicitly marked as a fork.
- Curated descriptions were checked against current repository READMEs, or public repository descriptions where no README was available.
- Browser checks completed without uncaught page errors. Mobile content fits the viewport.

## Hidden discoveries

- Triggered the tide code with normal keyboard events.
- Interacted with the harbor three times and verified bottle discovery.
- Waited eight active seconds at the garden at night and verified the fox appears.
- Walked east from a completed lighthouse save and triggered the meteor shower.
- Checked Field notes reports all four finds, then reloaded and verified discovery persistence.
- Inspected the moon fox and Field notes screenshots; no uncaught browser errors during the checks.
- Existing movement, terrain, stars and quest completion are unchanged. Night-garden timing advances only during active play.
