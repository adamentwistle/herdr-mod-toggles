// Mods: a dropdown under the top bar's Mods button. One row per mod you can open, a dot when it's open now;
// a click opens or closes it. Panels are switched in the layout; the rest open as overlays with mod.open.
import { div, svg, View } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { appHome, closeOverlay, exec, keys, layout, props, readTextFile, run, settings, setShared, theme, window } from "herdr";
import { heightFor, keyLabel, openOverlays, panelOpen, PAD, ROW, rowsFrom, SELF } from "./logic.js";

async function status() {
  for (const bin of ["herdr-app", `${appHome().replace(/\/\.config\/herdr-app$/, "")}/.local/bin/herdr-app`]) {
    const r = await exec(bin, ["status"]).catch(() => null);
    if (r?.code === 0) return r.stdout;
  }
  return "";
}

export default class Mods extends View {
  init(_props, cx) {
    this.titles = {};
    this.icons = {};
    this.open = new Set();
    this.at = 0;
    this.handle = cx.focus_handle();
    this.handle.focus();
    setShared(`${SELF}.shown`, true);
    cx.spawn(async (cx) => {
      const home = appHome();
      const mods = rowsFrom(keys(), layout()).map((r) => r.mod);
      await Promise.all(mods.map(async (m) => {
        const text = await readTextFile(`${home}/mods/${m}/mod.json`).catch(() => null);
        try { this.titles[m] = JSON.parse(text ?? "{}").title; } catch {}
        const ls = await exec("ls", [`${home}/mods/${m}`]).catch(() => null);
        const files = ls?.code === 0 ? ls.stdout.split("\n") : [];
        const icon = ["icon.svg", `${m}.svg`].find((f) => files.includes(f));
        if (icon) this.icons[m] = `mods/${m}/${icon}`;
      }));
      this.open = openOverlays(await status());
      setShared(`${SELF}.height`, heightFor(this.rows().length));
      cx.notify();
    });
  }

  close() {
    setShared(`${SELF}.shown`, false);
    setShared(`${SELF}.closedAt`, Date.now());
  }

  rows() {
    const tree = layout();
    return rowsFrom(keys(), tree, this.titles).map((r) => ({ ...r, on: r.kind === "panel" ? panelOpen(tree, r) : this.open.has(r.mod) }));
  }

  toggle(row) {
    if (!row) return;
    closeOverlay(props()?.overlay);
    if (row.kind === "overlay") run("mod.open", { name: row.mod });
    else if (row.on) run("layout.hide", { id: row.holder });
    else { run("layout.select", { stack: row.stack, child: row.child }); run("layout.show", { id: row.holder }); }
  }

  key(e, cx) {
    const rows = this.rows();
    if (e.key === "escape") closeOverlay(props()?.overlay);
    else if (e.key === "down") this.at = (this.at + 1) % rows.length;
    else if (e.key === "up") this.at = (this.at - 1 + rows.length) % rows.length;
    else if (e.key === "enter" || e.key === "space") this.toggle(rows[this.at]);
    else return;
    cx.stop_propagation?.();
    cx.notify();
  }

  render() {
    const t = theme();
    const rows = this.rows();
    const glyph = (row) => this.icons[row.mod]
      ? svg(this.icons[row.mod]).size(14).flex_none().text_color(row.on ? t.foreground : t.muted)
      : h_flex().size(14).flex_none().items_center().justify_center().rounded(3).border_1().border_color(t.input)
          .text_size(9).font_semibold().text_color(t.muted).child(row.title.slice(0, 1).toUpperCase());
    return v_flex()
      .id(SELF)
      .track_focus(this.handle)
      .on_key_down((e, cx) => this.key(e, cx))
      .w_full().p(PAD).rounded(8).bg(t.chrome).border_1().border_color(t.border).shadow_lg()
      .text_size(12.5)
      .children(rows.map((row, i) =>
        h_flex().id(`row-${row.mod}`).h(ROW).px(8).gap(8).items_center().rounded(5).cursor_pointer()
          .bg(i === this.at ? t.hover : t.chrome)
          .on_hover((over, cx) => { if (over && this.at !== i) { this.at = i; cx.notify(); } })
          .on_mouse_down("left", (_e, cx) => { cx.stop_propagation(); this.toggle(row); })
          .child(glyph(row))
          .child(div().flex_1().min_w(0).truncate().text_color(row.on ? t.foreground : t.muted).child(row.title))
          .child(div().font_family(settings().font ?? "Menlo").text_size(11).text_color(t.dim).child(keyLabel(row.key, window()?.platform)))
          .child(div().size(6).flex_none().rounded(3).bg(row.on ? t.accent : t.chrome))));
  }
}
