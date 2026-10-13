# Half Life

Chris's journal, live at https://halflife.studio: thoughts and photographs.

The game that used to live here (quests, companions, the bestiary, the map, fishing) moved to its own private
repository, TheAlphaSeries/halflife-game.

## Writing

Everything is written in the editor at https://app.pagescms.org (sign in with GitHub, pick this repository):

- **Journal**: a post, with a title, a date, an optional cover photo and the writing. Photos can go anywhere in the
  writing; the first one is used as the cover if none is chosen. A line of `***` becomes an ornament.
- **Photo albums**: a set of photos with optional captions. Every photo in an album or a post appears under Photographs.
- **About page**.

The site updates itself a minute or two after saving.

## How it fits together

1. Saving in the editor makes a small text file in `posts/`, `albums/` or `pages/`, and puts photos in `photos/`.
2. `scripts/build-index.mjs` gathers them into `posts.json`, and `scripts/make-thumbs.sh` makes smaller copies of new
   photos in `thumbs/` and `large/`. Both run by themselves (`.github/workflows/build-index.yml`).
3. Cloudflare publishes the result (`wrangler.jsonc`, `scripts/worker.js`).

The page itself is `index.html`, `site/blog.css` (the look: colours at the top) and `site/blog.js` (the gold leaf,
silver washes and ink painted behind everything, a little differently each visit, and the pages). The portrait on the
home page is `site/portrait.jpg`; until it exists a stand-in is drawn.
