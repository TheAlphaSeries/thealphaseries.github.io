# Half Life

The Half Life site, live at https://halflife.studio.

## Posting

Entries are written in the editor at https://app.pagescms.org (sign in with GitHub, pick this repository).
Saving there creates a file in `posts/`, and any photos go in `photos/`. The site updates itself a minute or two later.

## What's here

- `index.html` is the whole site: layout, look, music and behavior.
- `posts/` holds one file per entry. `pages/about.md` is the About text. `bestiary/` holds one file per creature.
- `photos/` holds uploaded photos.
- `posts.json` is the list the site loads. It is rebuilt automatically by `scripts/build-index.mjs` whenever an entry changes; don't edit it by hand.
- `.pages.yml` is the editor's settings.

The page that used to live in this repository (Polymath Robotics Terminal) is kept on the `polymath-terminal-backup` branch.
