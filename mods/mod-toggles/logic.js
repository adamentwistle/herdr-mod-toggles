// Working things out for the Mods dropdown. No herdr imports, so the tests run in node.

export const SELF = "mod-toggles";
export const ROW = 28;
export const PAD = 6;

// The mod a key action opens, or null: "mod.open:<name>" or {command: "mod.open", args: {name}}.
export function opens(action) {
  if (typeof action === "string") return action.startsWith("mod.open:") ? action.slice(9) : null;
  if (action && typeof action === "object" && action.command === "mod.open") return action.args?.name ?? null;
  return null;
}

// Every node in a layout tree, with its parent.
export function* nodes(n, parent = null) {
  if (!n || typeof n !== "object") return;
  yield [n, parent];
  for (const c of n.children ?? []) yield* nodes(c, n);
}

// Panels a layout switches between: mod blocks inside a stack. Opening one selects it and shows the stack's parent.
export function panels(tree) {
  const out = [];
  for (const [n, parent] of nodes(tree)) {
    if (n.type !== "stack" || !parent?.id) continue;
    for (const c of n.children ?? []) {
      const mod = c.content?.mod;
      if (c.id && mod) out.push({ kind: "panel", mod, stack: n.id, child: c.id, holder: parent.id });
    }
  }
  return out;
}

// Is a panel showing: its holder, its stack and every node above them shown, and it the stack's choice.
export function panelOpen(tree, p) {
  const chain = [];
  const find = (n, path) => {
    if (!n || typeof n !== "object") return false;
    if (n.id === p.stack) { chain.push(...path, n); return true; }
    return (n.children ?? []).some((c) => find(c, [...path, n]));
  };
  if (!find(tree, [])) return false;
  const stack = chain[chain.length - 1];
  return chain.every((n) => !n.hidden) && (stack.active ?? stack.children?.[0]?.id) === p.child;
}

// The rows: layout panels first, then mods a key opens as an overlay. One row per mod, this one left out.
const name = (titles, mod) => titles[mod] || mod.charAt(0).toUpperCase() + mod.slice(1).replace(/-/g, " ");

export function rowsFrom(keyList, tree, titles = {}) {
  const rows = [], seen = new Set([SELF]);
  for (const p of panels(tree)) {
    if (seen.has(p.mod)) continue;
    seen.add(p.mod);
    rows.push({ ...p, title: name(titles, p.mod), key: null });
  }
  for (const k of keyList) {
    const mod = opens(k.action);
    if (!mod || seen.has(mod)) continue;
    seen.add(mod);
    rows.push({ kind: "overlay", mod, title: name(titles, mod), key: k.keys });
  }
  return rows;
}

const MAC = { cmd: "⌘", ctrl: "⌃", alt: "⌥", shift: "⇧" };
const NAMES = { enter: "↩", escape: "esc", backspace: "⌫", left: "←", right: "→", up: "↑", down: "↓", space: "Space", tab: "⇥" };

// "ctrl-shift-q" as the platform writes it: ⌃⇧Q on macOS, Ctrl+Shift+Q elsewhere.
export function keyLabel(keys, platform) {
  if (!keys) return "";
  const parts = keys.split(/-(?=.)/);
  const key = parts.pop();
  const k = NAMES[key] ?? (key.length === 1 ? key.toUpperCase() : key[0].toUpperCase() + key.slice(1));
  if (platform === "macos") return parts.map((m) => MAC[m] ?? m).join("") + k;
  return [...parts.map((m) => (m === "cmd" ? "Win" : m[0].toUpperCase() + m.slice(1))), k].join("+");
}

// What `herdr-app status` says is open as an overlay.
export function openOverlays(statusText) {
  try { return new Set(JSON.parse(statusText).overlays ?? []); } catch { return new Set(); }
}

// The dropdown's height for n rows.
export function heightFor(n) {
  return Math.max(1, n) * ROW + PAD * 2 + 2;
}
