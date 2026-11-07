# Mods

An overlay for Herdr that lists your own mods with a switch on each, to turn one off and back on.

![Mods](preview.png)

A mod for the [Herdr](https://github.com/ogulcancelik/herdr) desktop app. Built for macOS.

Ask your agent to add it from [herdr.dev/mods](https://herdr.dev/gallery/?type=mods), or point it at this repo. It reads [the recipe](RECIPE.md) and every file first. By hand, copy `mods/mod-toggles` into `~/.config/herdr-app/mods` and merge `keys.json` into yours. `ctrl-shift-o` opens it. `mods/mod-toggles/icon.svg` is there for a bar button: `run("mod.open", { name: "mod-toggles" })`.

Herdr has no off switch for a mod, so off moves the mod's folder to `mods/.off/<name>`, where Herdr doesn't load it, and takes its keys out of `keys.json` into `mods/.off/keys.json`. On moves both back, keys in their old places. Nothing is deleted.

Herdr's own mods aren't listed. A mod that a layout shows, or that another mod opens, is listed with its switch dimmed and the name of what uses it, and can't be turned off.

It runs `ls`, `mv`, `mkdir`, `grep` and `sh` on this machine, and reads and writes `keys.json`. It makes no network calls.

`node --test` runs the checks.

MIT, see `LICENSE`.
