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
    name: "Windward Harbor",
    en: "01 / WELCOME",
    kind: "harbor",
    text: "Welcome to my little corner of the coast. Walk east, follow your curiosity, and collect the starlight along the way. This harbor is the starting point for a tour of the things I build and explore.",
    projects: [
      {
        name: "Star Isles",
        repo: "star-isles",
        description:
          "The world you are walking through: a small pixel adventure with a Rust terrain core and a Canvas front end.",
      },
    ],
  },
  {
    x: 135,
    name: "Curiosity Library",
    en: "02 / RESEARCH & IDEAS",
    kind: "library",
    text: "A place for questions that need more than a quick answer. These projects explore how papers are written and how matching mechanisms behave under explicit assumptions.",
    projects: [
      {
        name: "Reverse-Engineer a Paper",
        repo: "reverse-engineer-a-paper",
        description:
          "A scroll-driven guide to the structure of scientific writing, with sentence-level scenes and short exercises.",
      },
      {
        name: "Stable Matching Lab",
        repo: "stable-matching-lab",
        description:
          "Experiments with deferred acceptance, strategic preference reports, costly search and exploratory market simulation.",
      },
    ],
  },
  {
    x: 245,
    name: "Playful Workshop",
    en: "03 / GAMES & INTERACTION",
    kind: "workshop",
    text: "Small ideas become things you can touch, play with and inspect. Here, a familiar puzzle becomes a decision experiment, and a dice roll becomes a little interface.",
    projects: [
      {
        name: "2048 × Jev",
        repo: "jev-2048",
        description:
          "A 2048 decision-model lab that exposes move probabilities, confidence, latency and cost. This repository is a fork of the upstream project.",
        status: "Fork / experiment",
      },
      {
        name: "3D Dice",
        repo: "dice6-3d",
        description:
          "A minimal black-and-white 3D dice interface designed for mobile interaction.",
      },
    ],
  },
  {
    x: 355,
    name: "Observation Garden",
    en: "04 / TIME & MOVEMENT",
    kind: "garden",
    text: "Pause for a moment. These visual experiments look at things that are easy to overlook: the daylight left in a day, and the movement that connects places.",
    projects: [
      {
        name: "Sunlight Ruler",
        repo: "sunlight-ruler",
        description:
          "An interactive daylight prototype built around the current time, sunrise, sunset and remaining natural light, with city switching.",
      },
      {
        name: "Mobility Flow Atlas",
        repo: "mobility-flow-atlas",
        description:
          "An interactive view of transport and population flows, with a timeline, origin–destination lines and regional summaries.",
      },
    ],
  },
  {
    x: 495,
    name: "Starlight Lighthouse",
    en: "05 / TRUST & GOVERNANCE",
    kind: "lighthouse",
    text: "A lighthouse makes a direction visible. These projects ask a related question: how can collective decisions be checked? Bring all twelve stars here and press E to light the coast.",
    projects: [
      {
        name: "PoL2 Agent Ballot",
        repo: "pol2-agent-ballot",
        description:
          "An IVXV-inspired sealed ballot protocol for AI agents, with independently auditable voting records.",
      },
      {
        name: "PoL2 Governance Compiler",
        repo: "pol2-governance-compiler",
        description:
          "A toolkit of contracts, evaluation gates and red-team checks for governance layers. It does not establish decision-model effectiveness.",
      },
    ],
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
