import {
  TILE as T,
  WORLD_WIDTH,
  heightAt,
  places,
  starPositions,
  readSave,
} from "./world.js";
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
    ? "灯塔已亮。愿你始终心怀好奇。"
    : save.stars.size === 12
      ? "星光集齐！去远方的灯塔按 E"
      : "收集散落的星光，点亮远方的灯塔";
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
    $("soundButton").textContent = "声音不可用";
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
  ctx.restore();
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
      ? "欢迎回来，星光还在等你。"
      : "向右出发吧。碰到星光就能收集，路牌附近按 E。",
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
    '<div class="eyebrow">TAKE YOUR TIME</div><h2>走慢一点，也没关系。</h2><p>← → / A D：左右移动<br>空格 / W / ↑：跳跃，登上小坡<br>E：阅读路牌、与居民交谈、点亮灯塔<br>M：打开地图，传送到已经发现的地点<br>手机：使用屏幕下方的方向与跳跃按钮</p><p>沿海岸收集 12 颗星光，到最东边的灯塔按 E。进度会自动保存在当前浏览器。没有战斗，也没有惩罚。</p><span class="tag">五个地点 · 十二颗星 · 一片海</span>',
  );
}
$("helpButton").onclick = help;
function showMap() {
  openPanel(
    '<div class="eyebrow">THE COASTAL ATLAS</div><h2>沿着海岸，去远方。</h2><p>步行发现新的地方。点选已经去过的地点，即可搭乘海风回去。</p><div class="map-grid">' +
      places
        .map(
          (p, i) =>
            `<button data-place="${i}" ${save.visited.has(i) ? "" : "disabled"}>${save.visited.has(i) ? "✦" : "◇"} ${p.name}<small>${p.en} · ${save.visited.has(i) ? "已发现 / 点击传送" : "沿海岸继续探索"}</small></button>`,
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
  if (p.kind === "lighthouse" && save.stars.size === 12 && !save.lit) {
    save.lit = true;
    night = true;
    $("timeButton").textContent = "夜晚";
    persist();
    updateHUD();
    burst(p.x * T, terrain(p.x) * T - 120, 100);
    note(880, 1);
    toast("灯塔亮了。谢谢你，把散落的光带回这里。");
  }
  let text = p.text;
  if (p.kind === "lighthouse" && save.lit)
    text =
      "你把散落的星光带回了灯塔。海面有了方向，旅人有了归途。这个小小的世界，因为你的到来亮了一点。谢谢你走到这里。";
  openPanel(
    `<div class="eyebrow">${p.en}</div><h2>${p.name}</h2><p>${text}</p>${p.links ? p.links.map(([label, repo]) => `<a href="https://github.com/shentonyan/${repo}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`).join("<br>") : ""}${p.kind === "lighthouse" ? `<p class="tag">${save.lit ? "✦ 已点亮 · 旅途完成" : `星光 ${save.stars.size} / 12`}</p>` : ""}`,
  );
}
$("soundButton").onclick = () => {
  sound = !sound;
  $("soundButton").textContent = `声音：${sound ? "开" : "关"}`;
  $("soundButton").setAttribute("aria-pressed", String(sound));
  if (sound) note(523, 0.3);
};
$("timeButton").onclick = () => {
  night = !night;
  $("timeButton").textContent = night ? "夜晚" : "日落";
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
  const direction =
    Number(keys.has("ArrowRight") || keys.has("KeyD")) -
    Number(keys.has("ArrowLeft") || keys.has("KeyA"));
  player.vx = direction * 145;
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
        toast("十二颗星光集齐了！向东走，到灯塔按 E。");
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
        toast(`发现 ${p.name} · 已加入地图`);
        note(440, 0.25);
      }
    }
  });
  $("prompt").hidden = !near;
  if (near)
    $("prompt").textContent =
      near.kind === "lighthouse" && save.stars.size === 12 && !save.lit
        ? "[ E ] 把星光交给灯塔"
        : `[ E ] 探索${near.name}`;
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
  }),
});
