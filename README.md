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

Friends can sign up from the Alerts row of the RECORD panel on the front page (it opens the Email alerts page, `#/alerts`); once signed up, that row reads "On" on their device. When a **new** post is
published, each of them gets one short email with its title, its opening lines and a link; editing a post never sends
anything. Every email has a link to stop them.

- The addresses are kept in the site's Cloudflare database (table `subscribers`), never shown on the site.
- `scripts/worker.js` takes sign-ups, removes people who unsubscribe, and sends the emails through Cloudflare's own Email Sending.
- Every 5 minutes the site checks its own post list; a post it has never seen is new, so edits never send anything.
- It needs the Workers paid plan with halflife.studio onboarded to Email Sending, and the `send_email` binding named
  `EMAIL` in `wrangler.jsonc`.

## Plants and fishing

Each post has a **Kind** menu in the editor. Leave it blank for an ordinary journal entry, or pick **Plants** (house
plants and bonsai) or **Fishing** (fishing tales). Those entries get their own ring colour in the tower (green for
plants, sea-glass teal for fishing), a matching card and post page, and their own list (`#/plants`, `#/fishing`),
opened from the Plants and Fishing rows of the RECORD panel. Each also has its own texture, as quests are dashed gold: plant rings are vines (the tube broken by
little nodes, with small leaves on the near side) and fishing rings are ripples (a gentle travelling wave). They keep the same entry numbers as everything else and
still appear under Posts, marked in their colour. The newest entry's pink goes to the newest ordinary entry.

The colours live in `site/blog.css` (`--leaf`, `--tide`). Adding another kind takes a line in each of
`scripts/build-index.mjs`, `.pages.yml`, `site/tower.js`, `site/blog.js` and `site/blog.css` (search for "fishing").

## Opening an entry: the note

An entry (and a quest) opens like a lore note in a game such as Phantom Blade Zero: the object on the left (above,
on a phone) and the words beside it, under "Records", the collection's name (JOURNAL, PLANTS, FISHING TALES, QUESTS),
the title, and a row of diamonds, one per note in that collection (click one to go to it).

The object is the entry's photographs, shown as a small stack of prints that open in the photo viewer: the **Note
photo** chosen in the editor first, then any photographs in the text. An entry with no photographs gets its own
relic instead: an old storage medium (floppy disk, cassette, punch card, CD-R, reel of tape, and so on, seventeen in
all) drawn by `site/relics.js` with the title handwritten on its label. Each entry's relic is its own and never
changes.

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

