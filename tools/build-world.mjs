import { spawnSync } from "node:child_process";
import { mkdirSync, copyFileSync } from "node:fs";
const result = spawnSync(
  "cargo",
  [
    "build",
    "--manifest-path",
    "engine/Cargo.toml",
    "--target",
    "wasm32-unknown-unknown",
    "--release",
  ],
  { stdio: "inherit" },
);
if (result.error)
  console.error(
    "Install Rust and run: rustup target add wasm32-unknown-unknown",
  );
if (result.status !== 0) process.exit(result.status || 1);
mkdirSync("assets", { recursive: true });
copyFileSync(
  "engine/target/wasm32-unknown-unknown/release/star_isles_terrain.wasm",
  "assets/terrain.wasm",
);
console.log("Rust terrain built → assets/terrain.wasm");
