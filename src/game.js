import {
  TILE as T,
  WORLD_WIDTH,
  heightAt,
  places,
  starPositions,
  readSave,
} from "./world.js";
import { secrets, loadSecrets, createTideCode } from "./secrets.js";
const $ = (id) => document.getElementById(id),
  canvas = $("game"),
  ctx = canvas.getContext("2d", { alpha: false });
let terrain = heightAt;
try {
  const response = await fetch(
    new URL("../assets/terrain.wasm", import.meta.url),
  );
  if (!response.ok) throw Error("WASM unavailable");
  const { instance } = await WebAssembly.instantiate(
    await response.arrayBuffer(),
  );
  terrain = (x) => instance.exports.terrain_height(Math.max(0, Math.floor(x)));
} catch {
  $("engine").textContent = "CANVAS WORLD · COMPATIBILITY MODE";
}
let W = 640,
  H = 360,
  scale = 2,
  playing = false,
  night = false,
  sound = false,
  audio,
  clock = 0,
  camera = 0,
  toastTimer,
  checkpoint = 35 * T;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
let storage;
try {
  storage = localStorage;
} catch {
  storage = { getItem: () => null, setItem: () => {} };
}
const save = readSave(storage),
  keys = new Set(),
  player = { x: 35 * T, y: 0, vx: 0, vy: 0, ground: false, facing: 1 };
player.y = terrain(35) * T - 25;
const particles = [];
const discoveries = loadSecrets(storage),
  tideCode = createTideCode();
let harborVisits = 0,
  gardenStill = 0,
  secretGlow = 0,
  meteorTime = 0;
function discover(id) {
  if (discoveries.has(id)) return;
  discoveries.add(id);
  try {
    storage.setItem("star-isles-secrets-v1", JSON.stringify([...discoveries]));
  } catch {}
  const secret = secrets.find((s) => s.id === id);
  toast(
    `Secret found: ${secret.name} · ${discoveries.size} / ${secrets.length}`,
  );
  burst(player.x + 5, player.y, reduced ? 0 : 35);
  note(1046, 0.6);
}
function fieldNotes() {
  openPanel(
    `<div class="eyebrow">THE THINGS BETWEEN THE STARS</div><h2>Field notes · ${discoveries.size} / ${secrets.length}</h2><p>There is more to this coast than its twelve stars. These discoveries are saved separately from your journey.</p>${secrets.map((s) => `<article class="project-card"><strong>${discoveries.has(s.id) ? "✦ " + s.name : "◇ An undiscovered secret"}</strong><p>${discoveries.has(s.id) ? s.story : s.hint}</p></article>`).join("")}`,
  );
}
let currentPlace = 0,
  near = null,
  jumpBuffer = 0,
  coyote = 0;
function resize() {
  scale = Math.max(1, Math.min(3, Math.floor(innerWidth / 600) || 1));
  W = Math.ceil(innerWidth / scale);
  H = Math.ceil(innerHeight / scale);
  canvas.width = W;
  canvas.height = H;
  ctx.imageSmoothingEnabled = false;
}
addEventListener("resize", resize);
resize();
function persist() {
  try {
    storage.setItem(
      "star-isles-v1",
      JSON.stringify({
        stars: [...save.stars],
        visited: [...save.visited],
        lit: save.lit,
      }),
    );
  } catch {
    /* Private browsing still allows a complete session. */
  }
}
function toast(text) {
  $("toast").textContent = text;
  $("toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("show"), 3600);
}
function updateHUD() {
  $("starCount").textContent = `✦ ${save.stars.size} / 12`;
  $("progress").style.width = `${(save.stars.size / 12) * 100}%`;
  $("questText").textContent = save.lit
    ? "The coast is glowing. Stay curious."
    : save.stars.size === 12
      ? "All stars found! Press E at the lighthouse."
      : "Gather the stars. Light the lighthouse.";
}
function note(freq = 660, duration = 0.2) {
  if (!sound) return;
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume();
    const osc = audio.createOscillator(),
      gain = audio.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.045, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      audio.currentTime + duration,
    );
    osc.connect(gain).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + duration);
  } catch {
    sound = false;
    $("soundButton").textContent = "Sound unavailable";
  }
}
function burst(x, y, n = 18) {
  for (let i = 0; i < n; i++)
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 90,
      vy: -Math.random() * 95,
      life: 1 + Math.random(),
      color: i % 3 ? "#f9d68b" : "#faf5dc",
    });
}
function rect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h));
}
function poly(points, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
}
function glow(x, y, r, color) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, "transparent");
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
function star(x, y, s = 4, color = "#ffe7a5") {
  poly(
    [
      [x, y - s],
      [x + s * 0.35, y - s * 0.3],
      [x + s, y],
      [x + s * 0.35, y + s * 0.3],
      [x, y + s],
      [x - s * 0.35, y + s * 0.3],
      [x - s, y],
      [x - s * 0.35, y - s * 0.3],
    ],
    color,
  );
}
function cloud(x, y, s) {
  const col = night ? "#769699" : "#e0d6b2";
  rect(x, y, 54 * s, 7 * s, col);
  rect(x + 10 * s, y - 6 * s, 33 * s, 8 * s, col);
  rect(x + 20 * s, y - 11 * s, 15 * s, 8 * s, col);
}
function tree(x, y, seed = 0) {
  const h = 35 + (seed % 4) * 5;
  rect(x - 3, y - h + 8, 6, h - 6, "#654e3b");
  rect(x + 2, y - h + 8, 2, h - 6, "#98704a");
  poly(
    [
      [x, y - h - 33],
      [x - 23, y - h + 8],
      [x + 23, y - h + 8],
    ],
    night ? "#295d54" : "#447c61",
  );
  poly(
    [
      [x - 1, y - h - 19],
      [x - 29, y - h + 22],
      [x + 29, y - h + 22],
    ],
    night ? "#275147" : "#376a50",
  );
  poly(
    [
      [x - 2, y - h - 9],
      [x - 33, y - h + 34],
      [x + 31, y - h + 34],
    ],
    night ? "#244a40" : "#315f48",
  );
  rect(x - 13, y - h + 12, 12, 2, night ? "#48765c" : "#629575");
}
function building(p, x, y) {
  if (p.kind === "harbor") {
    for (let i = 0; i < 7; i++) {
      rect(x - 75 + i * 14, y - 2, 13, 6, "#967c55");
      rect(x - 72 + i * 14, y + 4, 3, 28, "#665c44");
    }
    rect(x - 37, y - 64, 5, 64, "#645f48");
    rect(x - 37, y - 65, 27, 3, "#645f48");
    poly(
      [
        [x - 30, y - 60],
        [x - 12, y - 50],
        [x - 30, y - 43],
      ],
      "#d8b77c",
    );
    rect(x + 20, y - 15, 8, 15, "#695b40");
    rect(x + 10, y - 25, 28, 16, "#bfa46e");
    rect(x + 13, y - 22, 22, 2, "#dec590");
  } else if (p.kind === "library" || p.kind === "workshop") {
    rect(x - 32, y - 49, 64, 49, p.kind === "library" ? "#c6b184" : "#a5a787");
    rect(x - 29, y - 46, 58, 43, p.kind === "library" ? "#d7c398" : "#bbbd96");
    poly(
      [
        [x - 42, y - 49],
        [x - 13, y - 78],
        [x + 18, y - 78],
        [x + 43, y - 49],
      ],
      p.kind === "library" ? "#ad775d" : "#607a72",
    );
    rect(x - 24, y - 51, 51, 3, "#594f43");
    rect(x + 14, y - 87, 8, 21, "#786d55");
    rect(x - 7, y - 28, 16, 28, "#675d48");
    rect(x - 4, y - 25, 10, 22, "#8a7958");
    rect(x + 2, y - 15, 2, 2, "#f9d68b");
    for (const wx of [-22, 17]) {
      rect(x + wx, y - 34, 11, 14, "#605b47");
      rect(x + wx + 2, y - 32, 7, 10, night ? "#f5c87d" : "#e7d8ab");
      rect(x + wx + 5, y - 32, 1, 10, "#7f765b");
    }
    if (night) glow(x, y - 20, 60, "#ffd27c22");
    rect(x - 19, y - 45, 40, 8, "#78634b");
    ctx.fillStyle = "#f1d8a2";
    ctx.font = "5px monospace";
    ctx.textAlign = "center";
    ctx.fillText(
      p.kind === "library" ? "BOOKS & IDEAS" : "MAKE SOMETHING",
      x + 1,
      y - 39,
    );
  } else if (p.kind === "garden") {
    rect(x - 27, y - 13, 54, 5, "#ac936b");
    rect(x - 27, y - 24, 54, 8, "#b59b70");
    rect(x - 23, y - 8, 4, 8, "#695f49");
    rect(x + 18, y - 8, 4, 8, "#695f49");
    for (let i = 0; i < 12; i++) {
      const xx = x - 65 + i * 12;
      rect(xx, y - 8 - (i % 3) * 3, 1, 12, "#668163");
      rect(
        xx - 2,
        y - 10 - (i % 3) * 3,
        5,
        4,
        ["#e6b2a5", "#e2cb8a", "#aab8d4"][i % 3],
      );
    }
  } else {
    poly(
      [
        [x - 17, y],
        [x - 12, y - 100],
        [x + 12, y - 100],
        [x + 19, y],
      ],
      "#c9c6a5",
    );
    poly(
      [
        [x + 5, y],
        [x + 7, y - 100],
        [x + 12, y - 100],
        [x + 19, y],
      ],
      "#a3ab94",
    );
    rect(x - 17, y - 107, 34, 9, "#5a7669");
    rect(x - 13, y - 127, 26, 20, save.lit ? "#ffdd86" : "#72968b");
    rect(x - 16, y - 130, 32, 4, "#567565");
    poly(
      [
        [x - 20, y - 130],
        [x, y - 144],
        [x + 20, y - 130],
      ],
      "#53766a",
    );
    rect(x - 1, y - 151, 2, 9, "#b9b798");
    for (let i = 0; i < 3; i++) rect(x - 3, y - 83 + i * 23, 6, 9, "#647c72");
    rect(x - 5, y - 21, 10, 21, "#5d7165");
    if (save.lit) {
      glow(x, y - 116, 100, "#ffd77960");
      if (!reduced) {
        ctx.globalAlpha = 0.12;
        poly(
          [
            [x, y - 120],
            [x + Math.cos(clock * 0.4) * 500, y - 160],
            [x + Math.cos(clock * 0.4 + 0.2) * 500, y - 70],
          ],
          "#ffe3a0",
        );
        ctx.globalAlpha = 1;
      }
    }
  }
  // A tiny sign at each stop.
  rect(x + 49, y - 18, 3, 18, "#6b6047");
  rect(x + 39, y - 25, 24, 12, "#b49a67");
  rect(x + 43, y - 21, 15, 2, "#756b4c");
}
function npc(x, y) {
  rect(x - 4, y - 15, 8, 9, "#d3a07d");
  rect(x - 5, y - 17, 10, 4, "#6c5c49");
  rect(x - 6, y - 20, 12, 3, "#b59866");
  rect(x - 5, y - 7, 10, 7, "#8d9e8a");
  rect(x - 4, y, 3, 4, "#53695f");
  rect(x + 1, y, 3, 4, "#53695f");
}
function draw() {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, night ? "#142d40" : "#538782");
  sky.addColorStop(0.6, night ? "#375768" : "#c2b994");
  sky.addColorStop(1, night ? "#627b78" : "#e3c99f");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  // Stars, a low sun, and slowly travelling clouds.
  if (night) {
    for (let i = 0; i < 65; i++) {
      const sx =
        (((i * 127.3 - camera * 0.025) % (W + 20)) + W + 20) % (W + 20);
      rect(
        sx,
        18 + ((i * 37) % Math.max(20, H * 0.48)),
        i % 7 === 0 ? 2 : 1,
        1,
        "#d5d8bd",
      );
    }
  }
  const sunX = W * 0.74 - camera * 0.018,
    sunY = H * 0.29;
  glow(sunX, sunY, 78, night ? "#dae7bb11" : "#ffe5b333");
  ctx.fillStyle = night ? "#d9d9bc" : "#f7d8a1";
  ctx.beginPath();
  ctx.arc(sunX, sunY, night ? 14 : 28, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 8; i++) {
    let x =
      ((((i * 183 - camera * 0.09 + (reduced ? 0 : clock * 1.5)) % (W + 170)) +
        W +
        170) %
        (W + 170)) -
      100;
    ctx.globalAlpha = 0.35;
    cloud(x, H * 0.13 + (i % 3) * 19, 0.65 + (i % 3) * 0.25);
  }
  ctx.globalAlpha = 1;
  const sea = H * 0.64;
  // Layered silhouettes, deliberately quiet behind the foreground.
  for (let layer = 0; layer < 3; layer++) {
    const points = [[0, H]];
    for (let x = 0; x <= W + 8; x += 8) {
      const wx = x + camera * (0.035 + layer * 0.055);
      points.push([
        x,
        sea -
          18 +
          layer * 23 -
          Math.max(
            0,
            Math.sin(wx * 0.007 + layer * 3) * 55 +
              Math.sin(wx * 0.019 + layer) * 19,
          ),
      ]);
    }
    points.push([W, H]);
    poly(
      points,
      [
        night ? "#355d65" : "#789d8e",
        night ? "#2c555d" : "#659486",
        night ? "#264c53" : "#4c8177",
      ][layer],
    );
  }
  rect(0, sea + 30, W, H, night ? "#2a5660" : "#5b938b");
  for (let i = 0; i < 40; i++) {
    const y = sea + 35 + ((i * 17) % Math.max(30, H - sea));
    let x =
      ((((i * 93 - camera * 0.18 + (reduced ? 0 : clock * (i % 2 ? 3 : -2))) %
        (W + 70)) +
        W +
        70) %
        (W + 70)) -
      35;
    rect(x, y, 8 + (i % 6) * 8, 1, night ? "#60867f" : "#8fb4a0");
  }
  // The camera follows the player along the entire continuous coast.
  const vertical = H * 0.72 - terrain(Math.floor(player.x / T)) * T;
  ctx.save();
  ctx.translate(-Math.floor(camera), Math.floor(vertical));
  const left = Math.max(0, Math.floor(camera / T) - 2),
    right = Math.min(WORLD_WIDTH, Math.ceil((camera + W) / T) + 2);
  for (let tile = left; tile < right; tile++) {
    const x = tile * T,
      y = terrain(tile) * T;
    rect(x, y, T, 260, night ? "#3c5748" : "#6d7954");
    rect(x, y + 8, T, 14, night ? "#566346" : "#929366");
    rect(x, y, T, 5, night ? "#658761" : "#9ca66c");
    rect(x, y + 5, T, 3, night ? "#476d50" : "#64835a");
    for (let j = 0; j < 9; j++) {
      const xx = x + ((tile * 7 + j * 11) % 15),
        yy = y + 26 + ((j * 23 + tile * 17) % 200);
      rect(
        xx,
        yy,
        2 + (j % 3),
        2,
        j % 2 ? (night ? "#4b6048" : "#828760") : night ? "#334c43" : "#596e50",
      );
    }
    if (tile % 3 === 0) {
      rect(x + 6, y - 4, 1, 4, "#91a06c");
      rect(x + 3, y - 3, 1, 3, "#70895a");
    }
    if (tile % 13 === 0) {
      rect(x + 8, y - 7, 1, 7, "#6b865d");
      rect(x + 6, y - 8, 5, 3, tile % 2 ? "#d3bd7f" : "#d1a79a");
    }
  }
  // Procedural trees; keep buildings and collectibles unobscured.
  for (let tile = left - 3; tile < right + 3; tile++)
    if (
      tile > 5 &&
      tile < WORLD_WIDTH - 5 &&
      tile % 7 === 0 &&
      !places.some((p) => Math.abs(p.x - tile) < 7) &&
      !starPositions.some((x) => Math.abs(x - tile) < 2)
    )
      tree(tile * T, terrain(tile) * T, tile);
  for (const p of places) {
    if (p.x * T < camera - 130 || p.x * T > camera + W + 130) continue;
    building(p, p.x * T, terrain(p.x) * T);
    if (p.kind !== "lighthouse") npc((p.x - 3) * T, terrain(p.x - 3) * T);
  }
  starPositions.forEach((tile, i) => {
    if (save.stars.has(i)) return;
    const x = tile * T,
      y = terrain(tile) * T - 30 + (reduced ? 0 : Math.sin(clock * 2 + i) * 3);
    glow(x, y, 18, "#fce2a330");
    star(x, y, 5);
    rect(x - 1, y - 1, 2, 2, "#fff5d2");
  });
  // Little fireflies in the garden and around the lighthouse.
  for (let i = 0; i < 22; i++) {
    const x =
        (320 + i * 8) * T + Math.sin((reduced ? 0 : clock * 0.4) + i) * 20,
      y = terrain(320 + i * 8) * T - 23 - ((i * 19) % 45);
    ctx.globalAlpha = 0.35 + Math.sin((reduced ? 0 : clock * 2) + i) * 0.3;
    glow(x, y, 7, "#dff39c66");
    rect(x, y, 1, 1, "#f7eda8");
  }
  ctx.globalAlpha = 1;
  // Scarfed explorer, drawn from tiny rectangles rather than an image asset.
  const px = Math.round(player.x),
    py = Math.round(player.y),
    step =
      player.ground && Math.abs(player.vx) > 10 ? Math.sin(clock * 14) * 3 : 0;
  ctx.fillStyle = "#173c4040";
  ctx.beginPath();
  ctx.ellipse(px + 5, terrain((px + 5) / T) * T, 8, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  rect(px, py + 17, 4, 7 + step, "#33494a");
  rect(px + 7, py + 17, 4, 7 - step, "#33494a");
  rect(px - 1, py + 8, 13, 11, "#e7d1a0");
  rect(px + 9, py + 9, 5, 10, "#698780");
  rect(px + 1, py, 10, 9, "#ddb48d");
  rect(px, py, 12, 3, "#596957");
  rect(px - 3, py + 2, 17, 3, "#9c956b");
  rect(px + 4 + (player.facing > 0 ? 4 : -2), py + 5, 2, 2, "#354b4a");
  rect(px - 2, py + 9, 14, 3, "#ce8160");
  rect(px + (player.facing > 0 ? -9 : 12), py + 10, 8, 3, "#ce8160");
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life);
    rect(p.x, p.y, 2, 2, p.color);
  }
  ctx.globalAlpha = 1;
  if (discoveries.has("moon-fox") && night) {
    const fx = 355 * T + 25,
      fy = terrain(355) * T;
    glow(fx, fy - 8, 24, "#dcebc52a");
    rect(fx - 8, fy - 10, 16, 7, "#d6ddc5");
    rect(fx + 3, fy - 15, 8, 8, "#e5e8d0");
    poly(
      [
        [fx + 3, fy - 14],
        [fx + 3, fy - 21],
        [fx + 7, fy - 14],
      ],
      "#d6ddc5",
    );
    poly(
      [
        [fx + 8, fy - 14],
        [fx + 11, fy - 21],
        [fx + 11, fy - 14],
      ],
      "#d6ddc5",
    );
    rect(fx + 8, fy - 12, 2, 2, "#34524e");
    rect(fx - 7, fy - 3, 3, 3, "#d6ddc5");
    rect(fx + 3, fy - 3, 3, 3, "#d6ddc5");
    poly(
      [
        [fx - 7, fy - 6],
        [fx - 20, fy - 13],
        [fx - 16, fy - 3],
      ],
      "#e5e8d0",
    );
  }
  ctx.restore();
  if (secretGlow > 0) {
    for (let i = 0; i < 16; i++)
      star(
        (i * 73 + 19) % W,
        25 + ((i * 47) % Math.max(30, H * 0.55)),
        2,
        "#fce2a3",
      );
  }
  if (meteorTime > 0) {
    for (let i = 0; i < 8; i++) {
      const progress = reduced
        ? 0.45
        : ((18 - meteorTime) * 0.38 + i * 0.137) % 1;
      const mx = W * 0.1 + ((i * 79) % W) - progress * 90,
        my = 20 + progress * H * 0.45;
      ctx.strokeStyle = "#f9dfa2";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(mx + 18, my - 9);
      ctx.lineTo(mx, my);
      ctx.stroke();
      star(mx, my, 2);
    }
  }
  if (!playing) {
    const shade = ctx.createLinearGradient(0, 0, W, 0);
    shade.addColorStop(0, "#153d45c9");
    shade.addColorStop(0.55, "#143e4425");
    shade.addColorStop(1, "transparent");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, W, H);
  }
  // Subtle frame vignette.
  const vig = ctx.createLinearGradient(0, H * 0.75, 0, H);
  vig.addColorStop(0, "transparent");
  vig.addColorStop(1, "#143c4477");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
}
function openPanel(html) {
  keys.clear();
  $("panelContent").innerHTML = html;
  if (!$("panel").open) $("panel").showModal();
}
function closePanel() {
  $("panel").close();
  keys.clear();
  canvas.focus({ preventScroll: true });
}
$("closePanel").onclick = closePanel;
$("panel").addEventListener("click", (e) => {
  if (e.target === $("panel")) {
    const r = $("panel").getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      closePanel();
  }
});
$("panel").addEventListener("close", () => keys.clear());
function start() {
  playing = true;
  document.body.classList.add("playing");
  canvas.focus({ preventScroll: true });
  toast(
    save.stars.size
      ? "Welcome back. The stars are still waiting."
      : "Head east. Touch stars to collect them. Press E near a sign.",
  );
}
$("start").onclick = start;
$("home").onclick = (e) => {
  e.preventDefault();
  playing = false;
  keys.clear();
  document.body.classList.remove("playing");
};
function help() {
  openPanel(
    '<div class="eyebrow">TAKE YOUR TIME</div><h2>Take your time.</h2><p>← → / A D: move<br>Space / W / ↑: jump and climb slopes<br>E: read signs, meet residents and light the lighthouse<br>M: open the map and return to discovered places<br>Mobile: use the buttons at the bottom of the screen</p><p>Collect 12 stars along the coast, then press E at the eastern lighthouse. Progress is saved in this browser. No combat. No penalties.</p><span class="tag">Five places · Twelve stars · One coast</span>',
  );
  $("panelContent").insertAdjacentHTML(
    "beforeend",
    `<p><button id="fieldNotes">Field notes · ${discoveries.size} / ${secrets.length} secrets</button></p>`,
  );
  $("fieldNotes").onclick = fieldNotes;
}
$("helpButton").onclick = help;
function showMap() {
  openPanel(
    '<div class="eyebrow">THE COASTAL ATLAS</div><h2>Follow the coast.</h2><p>Walk to discover each place. Select a visited destination to travel back with the sea breeze.</p><div class="map-grid">' +
      places
        .map(
          (p, i) =>
            `<button data-place="${i}" ${save.visited.has(i) ? "" : "disabled"}>${save.visited.has(i) ? "✦" : "◇"} ${p.name}<small>${p.en} · ${save.visited.has(i) ? "Visited / travel here" : "Keep exploring"}</small></button>`,
        )
        .join("") +
      "</div>",
  );
  $("panelContent")
    .querySelectorAll("[data-place]")
    .forEach(
      (b) =>
        (b.onclick = () => {
          const i = Number(b.dataset.place);
          if (!save.visited.has(i)) return;
          teleport(i);
          closePanel();
          if (!playing) start();
        }),
    );
}
$("mapButton").onclick = showMap;
function teleport(i) {
  player.x = places[i].x * T;
  player.y = terrain(places[i].x) * T - 25;
  player.vx = player.vy = 0;
  checkpoint = player.x;
  camera = Math.max(0, Math.min(WORLD_WIDTH * T - W, player.x - W * 0.4));
}
function interact() {
  if (!near) return;
  const p = near;
  if (p.kind === "harbor") {
    harborVisits++;
    if (harborVisits === 3) discover("harbor-echo");
  }
  if (p.kind === "lighthouse" && save.stars.size === 12 && !save.lit) {
    save.lit = true;
    night = true;
    $("timeButton").textContent = "Night";
    persist();
    updateHUD();
    burst(p.x * T, terrain(p.x) * T - 120, 100);
    note(880, 1);
    toast("The lighthouse is lit. Thank you for bringing the light home.");
  }
  let text = p.text;
  if (p.kind === "lighthouse" && save.lit)
    text =
      "You brought the scattered stars home. The sea has a light to follow, and travelers have a way back. This little world is brighter because you stopped by. Thank you for coming this far.";
  openPanel(
    `<div class="eyebrow">${p.en}</div><h2>${p.name}</h2><p>${text}</p>${p.projects ? `<div class="project-list">${p.projects.map((project) => `<article class="project-card"><a href="https://github.com/shentonyan/${project.repo}" target="_blank" rel="noopener noreferrer">${project.name} ↗</a>${project.status ? `<span class="tag">${project.status}</span>` : ""}<p>${project.description}</p></article>`).join("")}</div>` : ""}${p.kind === "lighthouse" ? `<p class="tag">${save.lit ? "✦ Lighthouse lit · Journey complete" : `Starlight ${save.stars.size} / 12`}</p>` : ""}`,
  );
}
$("soundButton").onclick = () => {
  sound = !sound;
  $("soundButton").textContent = `Sound: ${sound ? "on" : "off"}`;
  $("soundButton").setAttribute("aria-pressed", String(sound));
  if (sound) note(523, 0.3);
};
$("timeButton").onclick = () => {
  night = !night;
  $("timeButton").textContent = night ? "Night" : "Sunset";
};
const handled = [
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Space",
  "KeyA",
  "KeyD",
  "KeyW",
  "KeyE",
  "KeyM",
];
function press(code, repeat = false) {
  if ($("panel").open) return;
  if (playing && !repeat && tideCode(code)) {
    secretGlow = 12;
    discover("tide-code");
  }
  if (["KeyM", "KeyE"].includes(code)) {
    if (!repeat) {
      if (code === "KeyM") showMap();
      else if (playing) interact();
    }
    return;
  }
  keys.add(code);
  if (!repeat && ["Space", "KeyW", "ArrowUp"].includes(code)) jumpBuffer = 0.14;
}
addEventListener("keydown", (e) => {
  if ($("panel").open) return;
  if (handled.includes(e.code)) {
    e.preventDefault();
    press(e.code, e.repeat);
  }
});
addEventListener("keyup", (e) => keys.delete(e.code));
addEventListener("blur", () => keys.clear());
document.addEventListener("visibilitychange", () => {
  keys.clear();
  last = performance.now();
});
document.querySelectorAll("[data-key]").forEach((b) => {
  b.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    b.setPointerCapture(e.pointerId);
    press(b.dataset.key);
  });
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
    b.addEventListener(event, () => keys.delete(b.dataset.key));
});
function update(dt) {
  if (!reduced) clock += dt;
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 80 * dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
  if (!playing || $("panel").open) return;
  secretGlow = Math.max(0, secretGlow - dt);
  meteorTime = Math.max(0, meteorTime - dt);
  const direction =
    Number(keys.has("ArrowRight") || keys.has("KeyD")) -
    Number(keys.has("ArrowLeft") || keys.has("KeyA"));
  player.vx = direction * 145;
  const inGarden = Math.abs(player.x - 355 * T) < 58;
  gardenStill =
    inGarden &&
    night &&
    direction === 0 &&
    player.ground &&
    !keys.has("Space") &&
    !keys.has("KeyW") &&
    !keys.has("ArrowUp")
      ? gardenStill + dt
      : 0;
  if (gardenStill >= 8) discover("moon-fox");
  if (save.lit && player.x > 535 * T && !discoveries.has("last-light")) {
    night = true;
    $("timeButton").textContent = "Night";
    meteorTime = 18;
    discover("last-light");
  }
  if (direction) player.facing = direction;
  jumpBuffer = Math.max(0, jumpBuffer - dt);
  coyote = player.ground ? 0.1 : Math.max(0, coyote - dt);
  if (jumpBuffer > 0 && coyote > 0) {
    player.vy = -255;
    player.ground = false;
    jumpBuffer = 0;
    coyote = 0;
    note(300, 0.09);
  }
  // Solid column collision: abrupt steps require jumping; downward steps allow walking.
  const nextX = Math.max(
    8,
    Math.min(WORLD_WIDTH * T - 20, player.x + player.vx * dt),
  );
  const feet = player.y + 25,
    head = player.y + 2;
  const floorNext = Math.min(
    terrain(Math.floor((nextX + 1) / T)) * T,
    terrain(Math.floor((nextX + 10) / T)) * T,
  );
  if (floorNext >= feet - 1 || head + 24 <= floorNext + 1) player.x = nextX;
  player.vy = Math.min(400, player.vy + 650 * dt);
  const nextY = player.y + player.vy * dt;
  const floor = Math.min(
    terrain(Math.floor((player.x + 1) / T)) * T,
    terrain(Math.floor((player.x + 10) / T)) * T,
  );
  if (nextY + 25 >= floor && player.vy >= 0) {
    player.y = floor - 25;
    player.vy = 0;
    player.ground = true;
  } else {
    player.y = nextY;
    player.ground = false;
  }
  if (player.y > 900) {
    player.x = checkpoint;
    player.y = terrain(player.x / T) * T - 25;
    player.vy = 0;
  }
  const target = Math.max(
    0,
    Math.min(WORLD_WIDTH * T - W, player.x - W * 0.38),
  );
  camera += (target - camera) * Math.min(1, dt * 5);
  starPositions.forEach((tile, i) => {
    if (save.stars.has(i)) return;
    const sx = tile * T,
      sy = terrain(tile) * T - 30;
    if (Math.abs(player.x + 5 - sx) < 18 && Math.abs(player.y + 12 - sy) < 30) {
      save.stars.add(i);
      burst(sx, sy);
      note(520 + save.stars.size * 44);
      persist();
      updateHUD();
      if (save.stars.size === 12)
        toast("All twelve stars! Head east and press E at the lighthouse.");
    }
  });
  let nearest = 0;
  places.forEach((p, i) => {
    if (
      Math.abs(player.x - p.x * T) < Math.abs(player.x - places[nearest].x * T)
    )
      nearest = i;
  });
  if (currentPlace !== nearest) {
    currentPlace = nearest;
    $("place").textContent = places[nearest].name;
  }
  near = null;
  places.forEach((p, i) => {
    if (Math.abs(player.x - p.x * T) < 58) {
      near = p;
      if (!save.visited.has(i)) {
        save.visited.add(i);
        checkpoint = p.x * T;
        persist();
        toast(`Discovered ${p.name} · Added to your map`);
        note(440, 0.25);
      }
    }
  });
  $("prompt").hidden = !near;
  if (near)
    $("prompt").textContent =
      near.kind === "lighthouse" && save.stars.size === 12 && !save.lit
        ? "[ E ] Light the lighthouse"
        : `[ E ] Explore ${near.name}`;
}
let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.033);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}
updateHUD();
camera = Math.max(0, player.x - W * 0.62);
requestAnimationFrame(frame);
// Small, read-only diagnostics for automated smoke checks and bug reports.
window.starIsles = Object.freeze({
  snapshot: () => ({
    x: player.x,
    y: player.y,
    playing,
    stars: save.stars.size,
    visited: [...save.visited],
    lit: save.lit,
    wasm: terrain !== heightAt,
    place: places[currentPlace].name,
    secrets: [...discoveries],
  }),
});
