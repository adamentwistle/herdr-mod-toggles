# Mods

A dropdown under a top bar button that lists every mod the person can open, marks the ones open now, and opens or closes one with a click. `ctrl-shift-o` opens it too.

![The Mods dropdown open under its top bar button in a Herdr window, listing the mods with the open ones marked](preview.png)

## What you see

- A 280px wide popup, `frame: "none"`, drawn by the mod: `chrome` background, 1px `border`, 8px radius, a large soft shadow, 6px padding, as tall as its rows.
- One 28px row per mod, 5px radius, 8px side padding, 8px gaps: a 14px icon, the name (12.5px), the shortcut right-aligned in the person's terminal font at 11px `dim`, and a 6px `accent` dot when the mod is open.
- The icon is `mods/<name>/icon.svg` or `mods/<name>/<name>.svg`, tinted. Without one, a 14px square with a 1px `input` border and the name's first letter.
- Open rows use `foreground` for the name and icon, closed rows `muted`. The row under the pointer or chosen by arrows has a `hover` background.
- Shortcuts read like the platform writes them: `⌃⇧Q` on macOS, `Ctrl+Shift+Q` elsewhere. No other text.

## How it behaves

- Rows: first the layout's panels (mod blocks inside a `stack`, such as Files, Changes, Linear, Orchi and Herd in a side panel), then every mod a `keys()` binding opens with `mod.open` (string or object form). One row per mod; this mod is left out.
- Open state: a panel is open when its stack picks it and nothing above it is hidden (from `layout()`). Any other mod is open when `herdr-app status` lists it in `overlays`.
- Click, or Enter or Space: the dropdown closes, then a panel row runs `layout.select` and `layout.show` on the stack's parent, or `layout.hide` on it when open; an overlay row runs `mod.open`, which opens or closes it.
- Up and Down move, Esc closes, a click outside closes (Herdr's popup).
- It sets shared `mod-toggles.shown`, `mod-toggles.closedAt` and `mod-toggles.height`, so a bar button can size it and not reopen it on the press that closed it.

## Built from

- `mods/mod-toggles/mod.json`: `{"place": "none", "title": "Mods", "overlay": {"width": 280, "height": 440}}`.
- `main.js` is the view. `logic.js` holds `opens`, `panels`, `panelOpen`, `rowsFrom`, `keyLabel`, `openOverlays`, `heightFor`.
- `herdr` functions: `appHome`, `closeOverlay`, `exec`, `keys`, `layout`, `props`, `readTextFile`, `run`, `settings`, `setShared`, `theme`, `window`.
- The button: `openOverlay({mod: "mod-toggles", kind: "popup", frame: "none", at})`, with `at` from the press's `bounds`, right edges lined up, 6px below (see the README).

## Watch out

- No `herdr` function lists open overlays, so it asks `herdr-app status`; the dots fill a moment after it opens.
- A mod open as an overlay by something other than `mod.open` (another mod's `openOverlay`) shows open but `mod.open` opens a second copy instead of closing it.
- Opening it from a key or command takes the keyboard; keys typed at that moment go to it.
- The JavaScript runtime has no `structuredClone`.

## Done when

- `herdr-app check ~/.config/herdr-app/mods/mod-toggles` and `node --test` pass.
- The button drops it under itself; a click outside or Esc closes it.
- A panel's dot follows the side panel, and clicking it shows or hides that panel.
- Clicking an overlay mod opens it; opening the dropdown again shows its dot, and clicking closes it.
