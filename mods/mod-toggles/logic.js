// Working things out for the Mods overlay. No herdr imports, so the tests run in node.

export const SELF = "mod-toggles";
export const OFF = ".off";

// Folder names that are yours: not shipped by Herdr (installed.json), not hidden, not this mod.
export function ownMods(names, installed) {
  return names.filter((n) => n && !n.startsWith(".") && n !== SELF && !Object.hasOwn(installed, n)).sort();
}

// Does a key action belong to the mod `name`?
export function actionFor(action, name) {
  if (typeof action === "string") return action === `mod.open:${name}` || action.startsWith(`${name}.`);
  if (action && typeof action === "object") return action.command === "mod.open" && action.args?.name === name || String(action.command ?? "").startsWith(`${name}.`);
  return false;
}

// Takes the mod's keys out: its `mod:<name>` section and any binding that opens or drives it.
// `removed.at` remembers the key each one came before, so it goes back in the same place.
export function stripKeys(keys, name) {
  const out = {}, removed = {}, at = {};
  for (const [section, binds] of Object.entries(keys)) {
    if (section === `mod:${name}`) { removed[section] = binds; continue; }
    const kept = {}, entries = Object.entries(binds ?? {});
    entries.forEach(([k, a], i) => {
      if (!actionFor(a, name)) { kept[k] = a; return; }
      (removed[section] ??= {})[k] = a;
      const next = entries.slice(i + 1).find(([, b]) => !actionFor(b, name));
      if (next) (at[section] ??= {})[k] = next[0];
    });
    out[section] = kept;
  }
  if (Object.keys(removed).length && Object.keys(at).length) removed.at = at;
  return { keys: out, removed };
}

// Puts them back where they were. A key taken since stays with what took it.
export function restoreKeys(keys, removed) {
  const out = JSON.parse(JSON.stringify(keys));
  const { at = {}, ...sections } = removed ?? {};
  for (const [section, binds] of Object.entries(sections)) {
    const s = out[section] ?? {};
    const back = Object.entries(binds).filter(([k]) => !(k in s));
    const placed = {};
    for (const [k, a] of Object.entries(s)) {
      for (const [bk, ba] of back) if (at[section]?.[bk] === k) placed[bk] = ba;
      placed[k] = a;
    }
    for (const [bk, ba] of back) if (!(bk in placed)) placed[bk] = ba;
    out[section] = placed;
  }
  return out;
}

// Which mods can't go off: one a layout shows, or another mod's code names.
// `refs` maps a mod to the files that name it, as paths under the home.
export function lockedBy(name, refs) {
  for (const f of refs[name] ?? []) {
    const m = f.match(/^layouts\/([^/]+)\.json$/);
    if (m) return m[1];
    const d = f.match(/^mods\/([^/]+)\//);
    if (d && d[1] !== name && d[1] !== SELF) return d[1];
  }
  return null;
}

// Lines of "name<TAB>file file ..." from refs.sh.
export function parseRefs(text) {
  const refs = {};
  for (const line of (text ?? "").split("\n")) {
    const [name, files = ""] = line.split("\t");
    if (name) refs[name] = files.split(" ").filter(Boolean);
  }
  return refs;
}

// JSON written the way the file already was: its indent, and a final newline only if it had one.
export function asBefore(value, before) {
  const indent = before?.match(/\n([ \t]+)"/)?.[1] ?? "    ";
  return JSON.stringify(value, null, indent) + (before == null || before.endsWith("\n") ? "\n" : "");
}
