#!/bin/sh
# refs.sh <home> <name>...: for each mod, the layouts and other mods' files that name it.
# Hidden folders (layouts/.state, mods/.off, backups) are left out.
cd "$1" || exit 1
shift
for m in "$@"; do
  files=$(grep -rlE --include='*.js' --include='*.json' --exclude-dir='.*' --exclude-dir=node_modules \
    "[\"':]${m}[\"'.:]" layouts mods 2>/dev/null | grep -v "^mods/${m}/" | grep -v "^mods/mod-toggles/" | tr '\n' ' ')
  printf '%s\t%s\n' "$m" "$files"
done
