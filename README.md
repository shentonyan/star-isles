# ✦ Star Isles

**A small world. A little wonder.** An explorable pixel coast and a walk-through collection of Shenton's projects.

[Play online](https://shentonyan.github.io/star-isles/) · [Source](https://github.com/shentonyan/star-isles)

![Sunset at Windward Harbor](preview.png)

Walk east, meet the coast's residents, collect twelve stars and light the lighthouse. No timers, combat or failure penalties. All interface text, dialogue, maps and help are in English.

## Places and projects

Each stop has a theme. Press **E** near a sign to read project descriptions and open source links. Featured repositories do not imply sole authorship; forks are labelled.

| Place                | Theme                        | Featured repositories                                                                                                                                        |
| -------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Windward Harbor      | Welcome and the world itself | [Star Isles](https://github.com/shentonyan/star-isles)                                                                                                       |
| Curiosity Library    | Research and ideas           | [Reverse-Engineer a Paper](https://github.com/shentonyan/reverse-engineer-a-paper), [Stable Matching Lab](https://github.com/shentonyan/stable-matching-lab) |
| Playful Workshop     | Games and interaction        | [2048 × Jev](https://github.com/shentonyan/jev-2048) (fork), [3D Dice](https://github.com/shentonyan/dice6-3d)                                               |
| Observation Garden   | Time and movement            | [Sunlight Ruler](https://github.com/shentonyan/sunlight-ruler), [Mobility Flow Atlas](https://github.com/shentonyan/mobility-flow-atlas)                     |
| Starlight Lighthouse | Trust and governance         | [PoL2 Agent Ballot](https://github.com/shentonyan/pol2-agent-ballot), [PoL2 Governance Compiler](https://github.com/shentonyan/pol2-governance-compiler)     |

Descriptions were checked against repository READMEs and public descriptions. The collection includes research tools, experiments and prototypes. It does not claim validated real-world outcomes.

## Controls

| Action                                           | Keys          |
| ------------------------------------------------ | ------------- |
| Move                                             | ← → / A D     |
| Jump and climb slopes                            | Space / W / ↑ |
| Read signs, meet residents, light the lighthouse | E             |
| Map and travel to discovered places              | M             |

On mobile, use the on-screen controls. Stars are collected on contact. Bring all twelve to the eastern lighthouse and press E. Progress is saved in the current browser; clearing site data clears the save. Sound is off by default. The top bar switches between sunset and night.

## Run locally

Requires Node.js 22 or later. No npm dependencies are needed.

```sh
npm run dev
```

Open the printed address (normally http://127.0.0.1:4173). A compiled Rust/WebAssembly terrain kernel is included.

## Rust and Canvas

`engine/src/lib.rs` is a dependency-free Rust terrain generator compiled to WebAssembly. The browser calls `terrain_height` directly. JavaScript handles rendering, input, collisions, the camera, quests and saves. If WebAssembly cannot load, an equivalent JavaScript formula is used and the footer shows compatibility mode.

No backend, accounts or analytics. Google Fonts is optional; system fonts are used if it cannot load.

Rebuild the kernel:

```sh
rustup target add wasm32-unknown-unknown
npm run build:world
```

Run checks:

```sh
npm test
cargo test --manifest-path engine/Cargo.toml
```

Node checks terrain bounds, slopes, collectible placement, saves and Rust/JavaScript parity. Rust checks continuity and boundaries. See [QA.md](QA.md) for browser verification.

## Make it yours

- `src/world.js`: place names, themes, descriptions and project cards.
- `src/game.js`: pixel art, movement, interactions and quests.
- `style.css`: typography, colors and responsive layout.
- `engine/src/lib.rs`: terrain formula; keep the JavaScript fallback in sync.

## GitHub Pages

Select **GitHub Actions** in **Settings → Pages → Source**. Pushes to `main` run checks, build Rust and deploy the static site. Repository subpaths are supported.

## Inspiration and license

Inspired by [Mars-tin's explorable pixel homepage](https://mars-tin.github.io/world/): a homepage as a place you can walk into. The code, pixel graphics, layout and writing here were independently created. The original site's code, assets and biography were not copied. Scenes are drawn procedurally with Canvas.

MIT License · Copyright © 2026 Shenton YAN.
