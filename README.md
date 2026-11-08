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
- Every 5 minutes the site checks its own post list; a post it has never seen is new, so edits never send anything.
- It needs the Workers paid plan with halflife.studio onboarded to Email Sending, and the `send_email` binding named
  `EMAIL` in `wrangler.jsonc`.

## Quests

Gold rings in the tower are quests: events in Chris's Google Calendar whose title starts with `Quest:`. Click one to
read it: its title, when, and its story. The story is never the event's description as written: the site has
Cloudflare's own AI retell it in the manner of Cugel the Clever, with every name, place, address, date and time
swapped for a Dying Earth invention (a completed quest may still name the country). Write the description plainly;
the veiling happens on the way to the site. Each retelling is made once and kept; editing the description makes a new
one. If the AI is unavailable the quest shows no story rather than the original words. A quest still to come sits at the top of
the tower, dashed, showing only the month; the moment its event ends it turns solid gold, shows its dates, and settles
among the posts by date. A line `Veil: …` in the description gives an upcoming quest a different public title.
Nothing else from the calendar ever reaches the site: no other events, no locations, no guests. Delete the event and
the quest leaves the site (usually within ten minutes; Google sometimes takes a few hours to update its feed).

`scripts/worker.js` (`/api/quests`) reads the calendar through its private iCal address, saved in Cloudflare as the
runtime secret `QUEST_CALENDAR`.

## Push notifications

After signing up for email, friends are asked whether they want a notification on that device too, with a few words
of help that suit it. On an iPhone the site must first be added to the home screen (Share, then Add to Home Screen),
then opened from there; Android phones and computers just ask. `sw.js` shows the notifications, `manifest.webmanifest`
and `site/icon-*.png` let the site live on a home screen, and `scripts/worker.js` keeps the devices that said yes and
sends one notification per new entry, never for edits. Nothing needs setting up: the site makes its own push key the
first time it is needed.

