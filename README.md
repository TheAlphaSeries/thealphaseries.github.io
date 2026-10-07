# Half Life

The Half Life site, live at https://halflife.studio.

## Adding things

Everything is written in the editor at https://app.pagescms.org (sign in with GitHub, pick this repository).
Saving there creates or changes a file in one of the folders below. The site updates itself a minute or two later.

## How it fits together

1. You save something in the editor. That is a small text file in a folder here.
2. `scripts/build-index.mjs` gathers every file into `posts.json`, and `scripts/make-thumbs.sh` makes smaller copies of new photos.
   Both run by themselves (see `.github/workflows/build-index.yml`).
3. Cloudflare publishes the result to halflife.studio (`wrangler.jsonc`).
4. `index.html` is the whole site. It loads `posts.json` and draws everything from it.

## What's here

| | |
|---|---|
| `index.html` | The whole site: look, layout, music, behaviour. It starts with a comment explaining how it works and a list of its sections. |
| `posts/` | Log entries, one file each. |
| `bestiary/` | One file per fish, caught or not yet caught. `pages/bestiary.md` is the blurb at the top. |
| `albums/` | Photo albums. |
| `places/` | Map pins. A pin can carry a write-up and a list of landmarks. |
| `plants/` | The Herbarium: one file per plant, bonsai or house plant, living or perished. `pages/bonsai.md` and `pages/houseplants.md` are the notices at the top of each collection. |
| `quests/` | The quest log. No dates or real place names: the site is public. |
| `pages/about.md` | The About text. |
| `pages/status.md` | The name, class and blurb on the Status screen. Its numbers are counted by the site. |
| `photos/` | Photos as uploaded. `thumbs/` and `large/` are smaller copies made automatically; do not edit those. |
| `posts.json` | The list the site loads. Rebuilt automatically; do not edit by hand. |
| `sprites.json` | Every Bestiary and Herbarium picture. Written by the scripts in `tools/sprites`; do not edit by hand. |
| `tools/sprites/` | The scripts that draw those pictures. Not published. See the README inside. |
| `map-land.json`, `map-bay.json` | Coastlines for the map (the world, and finer detail around San Francisco, Hong Kong and Shanghai). |
| `og.png` | The picture shown when the link is shared. |
| `.pages.yml` | The editor's forms. |
| `scripts/` | The index builder, the photo shrinker, and a tiny file Cloudflare needs. |
| `.assetsignore` | Folders that are part of this repository but not part of the public site. |

## Privacy

The site and this repository are public. Past trips are shown as they were. Anything in the future is kept vague:
quests have no dates, and their names and objectives do not name real places. The home marker on the map is the
middle of the neighbourhood, not an address.

The page stores nothing about visitors, with one exception they choose themselves: a friend can petition to join a
quest by typing a name of their choosing, an e-mail address and a short note. Only those three things, the quest, the
time and a random number (from which their pixel figure is drawn) are kept. The e-mail address is seen only at
`/keeper.html` and is never shown on the site or sent to visitors; the same address always gets the same figure.
No cookie is kept, and nobody has an account. Petitions wait unseen until accepted or denied at `/keeper.html`
(passphrase only); a denied petition is deleted. The program behind this is `scripts/worker.js`, and the data is in
a small Cloudflare database named `halflife-quests`.

An accepted companion is shown on the site by the name they gave, the post they hold and the day they asked.

In the visitor's own browser, and nowhere else, the page keeps two small notes: whether they turned the music off, and
what the page last showed them (the level, and which quests, medals, fish and entries were already there), so that it
can announce what is new on their next visit. Neither note is sent anywhere.

The page that used to live in this repository (Polymath Robotics Terminal) is kept on the `polymath-terminal-backup` branch.
