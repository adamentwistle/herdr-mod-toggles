import assert from "node:assert/strict";
import test from "node:test";
import * as logic from "../mods/mod-toggles/logic.js";

const tree = { id: "root", type: "row", children: [
  { id: "tabs", type: "block", content: { mod: "tabs" } },
  { id: "panel", type: "column", hidden: false, children: [
    { id: "panel-body", type: "stack", active: "orchi", children: [
      { id: "files", type: "block", content: { mod: "files" } },
      { id: "orchi", type: "block", content: { mod: "orchi" } } ] } ] } ] };
const keyList = [
  { section: "global", keys: "cmd-p", action: "mod.open:picker" },
  { section: "global", keys: "ctrl-shift-q", action: "mod.open:jumpycritter" },
  { section: "global", keys: "ctrl-shift-y", action: "mod.open:orchi" },
  { section: "global", keys: "ctrl-shift-o", action: "mod.open:mod-toggles" },
  { section: "global", keys: "cmd-t", action: "tab.new" },
];

test("rows are the layout's panels, then mods a key opens, once each and not this one", () => {
  const rows = logic.rowsFrom(keyList, tree, { jumpycritter: "Jumpy Critter" });
  assert.deepEqual(rows.map((r) => [r.kind, r.mod, r.title]), [
    ["panel", "files", "Files"], ["panel", "orchi", "Orchi"],
    ["overlay", "picker", "Picker"], ["overlay", "jumpycritter", "Jumpy Critter"]]);
  assert.equal(rows[3].key, "ctrl-shift-q");
});

test("a panel is open when it's the stack's choice and nothing above it is hidden", () => {
  const [files, orchi] = logic.panels(tree);
  assert.equal(logic.panelOpen(tree, orchi), true);
  assert.equal(logic.panelOpen(tree, files), false);
  const hidden = structuredClone(tree); hidden.children[1].hidden = true;
  assert.equal(logic.panelOpen(hidden, orchi), false);
});

test("object bindings count too", () => {
  assert.equal(logic.opens({ command: "mod.open", args: { name: "wrapped" } }), "wrapped");
  assert.equal(logic.opens("app.quit"), null);
});

test("shortcuts read the way each platform writes them", () => {
  assert.equal(logic.keyLabel("ctrl-shift-q", "macos"), "⌃⇧Q");
  assert.equal(logic.keyLabel("cmd-p", "macos"), "⌘P");
  assert.equal(logic.keyLabel("ctrl-shift-q", "windows"), "Ctrl+Shift+Q");
  assert.equal(logic.keyLabel(null, "macos"), "");
});

test("open overlays come from herdr-app status, and a bad reply means none", () => {
  assert.ok(logic.openOverlays('{"overlays":["wrapped"]}').has("wrapped"));
  assert.equal(logic.openOverlays("nope").size, 0);
});

test("the dropdown fits its rows", () => {
  assert.equal(logic.heightFor(3), 3 * logic.ROW + logic.PAD * 2 + 2);
});
