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

The page itself is `index.html`, `site/blog.css` (the look: colours at the top), `site/blog.js` (the pages, the menu
and the readout) and `site/tower.js` (the tower). The tower draws every post as a band of glowing rings, after the
security tower in *Ghost in the Shell 2: Innocence* and [gits-file-visualizer](https://github.com/iliabaranov/gits-file-visualizer)
(Apache-2.0), which draws a computer's files that way: each sentence is an arc, each paragraph a ring, the newest post at
the top. Nothing about it needs updating by hand; a new post simply appears in it. The portrait is on the About page,
`site/portrait-5.webp`.

## Email alerts

Friends can leave an email address in the box at the foot of each post (and on About). When a **new** post is
published, each of them gets one short email with its title, its opening lines and a link; editing a post never sends
anything. Every email has a link to stop them.

- The addresses are kept in the site's Cloudflare database (table `subscribers`), never shown on the site.
- `scripts/worker.js` takes sign-ups, removes people who unsubscribe, and sends the emails through Cloudflare's own Email Sending.
- `.github/workflows/alert.yml` notices a new file in `posts/`, waits until it is live, then asks the site to send.
- It needs the Workers paid plan with halflife.studio onboarded to Email Sending, the `send_email` binding named
  `EMAIL` in `wrangler.jsonc`, and `NOTIFY_SECRET` set in Cloudflare and saved in GitHub.

## Quests

Gold rings in the tower are quests: events in Chris's Google Calendar whose title starts with `Quest:`. They are
placed by date among the posts; ones still to come sit at the top, dashed, and show only a veiled name and the month
(put `Veil: …` in the event's description to choose that name). Once a quest is over, its real title and dates show.
Nothing else from the calendar ever reaches the site: no other events, no locations, no notes.

`scripts/worker.js` (`/api/quests`) reads the calendar through its private iCal address, saved in Cloudflare as the
secret `QUEST_CALENDAR`, and checks it again at most every ten minutes.

