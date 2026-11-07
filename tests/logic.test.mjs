import assert from "node:assert/strict";
import test from "node:test";
import * as logic from "../mods/mod-toggles/logic.js";

const keys = {
  global: { "cmd-p": "mod.open:picker", "ctrl-shift-q": "mod.open:jumpycritter", "ctrl-shift-u": "mod.open:pageme", "ctrl-shift-j": { command: "jumpycritter.jump" } },
  "mod:jumpycritter": { space: "jumpycritter.jump" },
  terminal: { "cmd-c": "terminal.copy" },
};

test("only your own mods are listed, not Herdr's, hidden ones or this one", () => {
  const installed = { picker: {}, tabs: {} };
  assert.deepEqual(logic.ownMods(["tabs", "picker", ".off", ".linear.before-link", "mod-toggles", "wrapped", "crawlspace"], installed), ["crawlspace", "wrapped"]);
});

test("off takes out every key that opens or drives the mod, and nothing else", () => {
  const { keys: next, removed } = logic.stripKeys(keys, "jumpycritter");
  assert.deepEqual(next.global, { "cmd-p": "mod.open:picker", "ctrl-shift-u": "mod.open:pageme" });
  assert.equal(next["mod:jumpycritter"], undefined);
  assert.deepEqual(next.terminal, keys.terminal);
  assert.equal(removed.global["ctrl-shift-q"], "mod.open:jumpycritter");
  assert.ok(removed["mod:jumpycritter"]);
});

test("on puts the keys back exactly where they were", () => {
  const { keys: next, removed } = logic.stripKeys(keys, "jumpycritter");
  const back = logic.restoreKeys(next, removed);
  assert.deepEqual(Object.keys(back.global), Object.keys(keys.global));
  assert.deepEqual(back, keys);
});

test("a key taken while the mod was off stays with what took it", () => {
  const { keys: next, removed } = logic.stripKeys(keys, "jumpycritter");
  next.global["ctrl-shift-q"] = "app.quit";
  assert.equal(logic.restoreKeys(next, removed).global["ctrl-shift-q"], "app.quit");
});

test("a mod a layout shows or another mod names is locked, and says by what", () => {
  const refs = logic.parseRefs("herd\tlayouts/main-linear.json mods/panel-buttons/main.js \nplan-view\tmods/orchi/main.js \njumpycritter\t\n");
  assert.equal(logic.lockedBy("herd", refs), "main-linear");
  assert.equal(logic.lockedBy("plan-view", refs), "orchi");
  assert.equal(logic.lockedBy("jumpycritter", refs), null);
});

test("keys.json is written back in its own style", () => {
  assert.equal(logic.asBefore({ a: { b: 1 } }, '{\n  "a": {}\n}'), '{\n  "a": {\n    "b": 1\n  }\n}');
  assert.ok(logic.asBefore({}, '{\n    "a": 1\n}\n').endsWith("\n"));
});
