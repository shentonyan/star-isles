export const TILE = 16;
export const WORLD_WIDTH = 560;
export function heightAt(x) {
  const t = Math.max(0, Math.min(WORLD_WIDTH - 1, Math.floor(x)));
  return (
    31 +
    Math.round(
      Math.sin(t * 0.035) * 2 +
        Math.sin(t * 0.093) * 1.2 +
        Math.sin(t * 0.011) * 3,
    )
  );
}
export const places = [
  {
    x: 35,
    name: "风起码头",
    en: "THE ARRIVAL",
    kind: "harbor",
    text: "海风刚刚好。欢迎来到我的小小世界。向右走，捡起沿途的星光；空格可以跳上山坡。世界很小，但值得慢慢走。",
  },
  {
    x: 135,
    name: "好奇心书屋",
    en: "THE LIBRARY",
    kind: "library",
    text: "有些问题，值得一遍遍追问。这里收藏着关于研究、写作与探索的项目。",
    links: [
      ["论文写作探索", "reverse-engineer-a-paper"],
      ["Jev 项目", "AnyJev"],
    ],
  },
  {
    x: 245,
    name: "造物工坊",
    en: "THE WORKSHOP",
    kind: "workshop",
    text: "把一个小念头，做成真的东西。代码、实验和不一定有用但很好玩的发明，都从这里开始。",
    links: [
      ["全部 GitHub 项目", ""],
      ["2048 实验台", "jev-2048"],
    ],
  },
  {
    x: 355,
    name: "听风花园",
    en: "THE QUIET GARDEN",
    kind: "garden",
    text: "不必每一步都有目的。有时坐下来听风，也是往前走。试着停留一会儿，看看萤火虫和远处的云。",
  },
  {
    x: 495,
    name: "星光灯塔",
    en: "THE LIGHTHOUSE",
    kind: "lighthouse",
    text: "有人把没说出口的愿望，留给了星星。收集 12 颗星光，然后在这里按 E，让这片海重新亮起来。",
  },
];
export const starPositions = [
  57, 84, 110, 158, 185, 216, 270, 298, 330, 385, 425, 464,
];
export function overlaps(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}
export function readSave(storage) {
  try {
    const s = JSON.parse(storage.getItem("star-isles-v1"));
    const stars = new Set(
      (Array.isArray(s?.stars) ? s.stars : []).filter(
        (v) => Number.isInteger(v) && v >= 0 && v < 12,
      ),
    );
    return {
      stars,
      visited: new Set([
        0,
        ...(Array.isArray(s?.visited) ? s.visited : []).filter(
          (v) => Number.isInteger(v) && v >= 0 && v < 5,
        ),
      ]),
      lit: s?.lit === true && stars.size === 12,
    };
  } catch {
    return { stars: new Set(), visited: new Set([0]), lit: false };
  }
}
