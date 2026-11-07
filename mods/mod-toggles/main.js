// Mods: your own mods, each with a switch. Off moves the folder to mods/.off/<name>, which
// Herdr doesn't load, and puts its keys aside; on moves both back. Nothing is deleted.
// Herdr's shipped mods aren't listed. A mod a layout shows, or another mod opens, can't go off.
import { View, div } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { appHome, exec, readTextFile, writeTextFile, props, closeOverlay, theme, nextCommand } from "herdr";
import { OFF, SELF, ownMods, stripKeys, restoreKeys, lockedBy, parseRefs, asBefore } from "./logic.js";

async function readJson(path, fallback) {
  const text = await readTextFile(path).catch(() => null);
  if (text == null) return { text: null, value: fallback };
  try { return { text, value: JSON.parse(text) }; } catch { return { text, value: fallback }; }
}

async function list(dir) {
  const r = await exec("ls", ["-1", dir]);
  return r.code === 0 ? r.stdout.split("\n").filter(Boolean) : [];
}

export default class Toggles extends View {
  init(_props, cx) {
    this.rows = null;
    this.at = 0;
    this.busy = false;
    this.problem = null;
    this.handle = cx.focus_handle();
    this.handle.focus();
    this.load(cx);
    // Keys can drive it too: mod-toggles.up, .down, .flip (the chosen row) or .flip:<folder>.
    cx.spawn(async (cx) => {
      for (;;) {
        const c = await nextCommand();
        if (c === "focus") this.handle.focus();
        else if (c.startsWith("flip:")) this.flip(this.rows?.find((r) => r.name === c.slice(5)), cx);
        else if (c === "flip") this.key({ key: "enter" }, cx);
        else if (c === "up" || c === "down") this.key({ key: c }, cx);
        cx.notify();
      }
    });
  }

  load(cx) {
    cx.spawn(async (cx) => {
      try { await this.read(); } catch (e) { this.problem = String(e?.message ?? e); }
      cx.notify();
    });
  }

  async read() {
    {
      const home = appHome();
      const installed = (await readJson(`${home}/installed.json`, {})).value;
      const on = ownMods(await list(`${home}/mods`), installed);
      const off = ownMods(await list(`${home}/mods/${OFF}`), installed).filter((n) => !on.includes(n));
      const r = await exec("sh", [`${home}/mods/${SELF}/refs.sh`, home, ...on]);
      const refs = parseRefs(r.stdout);
      const titles = {};
      for (const n of on) titles[n] = (await readJson(`${home}/mods/${n}/mod.json`, {})).value.title;
      for (const n of off) titles[n] = (await readJson(`${home}/mods/${OFF}/${n}/mod.json`, {})).value.title;
      this.rows = [...on.map((n) => ({ name: n, on: true, lock: lockedBy(n, refs) })), ...off.map((n) => ({ name: n, on: false, lock: null }))]
        .map((row) => ({ ...row, title: titles[row.name] || row.name }))
        .sort((a, b) => a.title.localeCompare(b.title));
      this.at = Math.min(this.at, Math.max(0, this.rows.length - 1));
    }
  }

  flip(row, cx) {
    if (!row || row.lock || this.busy) return;
    this.busy = true;
    this.problem = null;
    cx.spawn(async (cx) => {
      try {
        await (row.on ? this.turnOff(row.name) : this.turnOn(row.name));
      } catch (e) {
        this.problem = String(e?.message ?? e);
      }
      this.busy = false;
      this.load(cx);
    });
  }

  async move(from, to) {
    const there = await exec("test", ["-e", to]);
    if (there.code === 0) throw new Error(`${to} already exists`);
    const r = await exec("mv", [from, to]);
    if (r.code !== 0) throw new Error(r.stderr.trim() || "mv failed");
  }

  async turnOff(name) {
    const home = appHome(), stash = `${home}/mods/${OFF}/keys.json`;
    await exec("mkdir", ["-p", `${home}/mods/${OFF}`]);
    const keys = await readJson(`${home}/keys.json`, {});
    const { keys: next, removed } = stripKeys(keys.value, name);
    if (Object.keys(removed).length) {
      const saved = await readJson(stash, {});
      saved.value[name] = removed;
      await writeTextFile(stash, JSON.stringify(saved.value, null, 4) + "\n", saved.text);
      await writeTextFile(`${home}/keys.json`, asBefore(next, keys.text), keys.text);
    }
    await this.move(`${home}/mods/${name}`, `${home}/mods/${OFF}/${name}`);
  }

  async turnOn(name) {
    const home = appHome(), stash = `${home}/mods/${OFF}/keys.json`;
    await this.move(`${home}/mods/${OFF}/${name}`, `${home}/mods/${name}`);
    const saved = await readJson(stash, {});
    if (!saved.value[name]) return;
    const keys = await readJson(`${home}/keys.json`, {});
    await writeTextFile(`${home}/keys.json`, asBefore(restoreKeys(keys.value, saved.value[name]), keys.text), keys.text);
    delete saved.value[name];
    if (Object.keys(saved.value).length) await writeTextFile(stash, JSON.stringify(saved.value, null, 4) + "\n", saved.text);
    else await exec("rm", ["-f", stash]);
    await exec("rmdir", [`${home}/mods/${OFF}`]);
  }

  key(e, cx) {
    const rows = this.rows ?? [];
    if (e.key === "escape") closeOverlay(props()?.overlay);
    else if (e.key === "down") this.at = Math.min(rows.length - 1, this.at + 1);
    else if (e.key === "up") this.at = Math.max(0, this.at - 1);
    else if (e.key === "enter" || e.key === "space") this.flip(rows[this.at], cx);
    else return;
    cx.stop_propagation?.();
    cx.notify();
  }

  render(cx) {
    const t = theme();
    const pill = (row) =>
      h_flex().w(30).h(18).rounded(9).px(2).items_center().border_1()
        .border_color(row.on ? t.accent : t.input).bg(row.on ? t.accent : t.raised)
        .child(row.on ? div().flex_1() : div())
        .child(div().size(12).rounded(6).bg(row.on ? t.accent_foreground : t.muted))
        .child(row.on ? div() : div().flex_1());
    const rows = this.rows ?? [];
    return v_flex()
      .id("mod-toggles")
      .track_focus(this.handle)
      .on_key_down((e, cx) => this.key(e, cx))
      .size_full().min_h(0).bg(t.popover).text_size(13).py(10)
      .child(div().px(16).pb(8).text_size(15).font_semibold().text_color(t.foreground).child("Mods"))
      .child(
        v_flex().id("mod-list").flex_1().min_h(0).overflow_y_scrollbar().px(6).children(
          rows.map((row, i) =>
            h_flex().id(`row-${row.name}`).h(34).px(10).gap(10).items_center().rounded(6)
              .bg(i === this.at ? t.hover : t.popover)
              .cursor_pointer()
              .on_click((_e, cx) => { this.at = i; this.flip(row, cx); cx.notify(); })
              .child(div().flex_1().text_color(row.on ? t.foreground : t.muted).child(row.title))
              .child(row.lock ? div().text_size(11).text_color(t.dim).child(row.lock) : div())
              .child(div().opacity(row.lock ? 0.35 : 1).child(pill(row))),
          ),
        ),
      )
      .child(this.problem ? div().px(16).pt(6).text_size(11).text_color(t.blocked).child(this.problem) : div());
  }
}
