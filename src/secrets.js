export const secrets = [
  {
    id: "tide-code",
    name: "The Tide Code",
    hint: "Left, right. Left, right. Then two little hops.",
    story:
      "An old cheat code, rewritten by the sea. For a moment, every grain of sand remembers being a star.",
  },
  {
    id: "harbor-echo",
    name: "A Message in a Bottle",
    hint: "The harbor has more to say. Ask again. And once more.",
    story:
      "Inside the bottle: “To whoever finds this: you do not have to turn every curiosity into something useful. Some things can simply be beautiful.”",
  },
  {
    id: "moon-fox",
    name: "The Moonlight Visitor",
    hint: "After dark, stand still in the garden. Give the quiet a little time.",
    story:
      "A small moon fox steps out of the flowers. It has no quest for you. Your company is enough.",
  },
  {
    id: "last-light",
    name: "Beyond the Last Light",
    hint: "When the lighthouse shines, keep walking east. The story has a little more coastline.",
    story:
      "Past the lighthouse, the night opens into a shower of falling stars. Not every ending needs a wall. Some leave room for another beginning.",
  },
];
export function loadSecrets(storage) {
  try {
    const data = JSON.parse(storage.getItem("star-isles-secrets-v1"));
    return new Set(
      (Array.isArray(data) ? data : []).filter((id) =>
        secrets.some((s) => s.id === id),
      ),
    );
  } catch {
    return new Set();
  }
}
export function createTideCode() {
  const sequence = [
    "ArrowLeft",
    "ArrowRight",
    "ArrowLeft",
    "ArrowRight",
    "Space",
    "Space",
  ];
  let buffer = [];
  return (code) => {
    buffer.push(code);
    buffer = buffer.slice(-sequence.length);
    return (
      buffer.length === sequence.length &&
      sequence.every((key, i) => buffer[i] === key)
    );
  };
}
