# How the site works

`index.html` is the skeleton of the screen: the windows, the menu, the title screen. The look is `site.css`. Everything
the page does is in the scripts here, read in the order of their numbers; each is one part of the page, and they share
one scope, so a function in one may be used by any that follows.

HOW THIS PAGE WORKS

Nothing you write lives in this file. Every entry, fish, album, map pin
and quest is its own small file in a folder (posts/, bestiary/, albums/,
places/, quests/, pages/), made with the editor at app.pagescms.org.
scripts/build-index.mjs gathers them all into posts.json, and this page
loads that one file when it opens (see section 15).

The fish and plant pictures are one image, sprites.png, with a short list
beside it (sprites.json) saying where each picture is. Both are loaded at
the same moment. They are drawn by the scripts in tools/sprites.

The screen is a set of windows. The big one (#main) shows one screen at a
time; each screen is drawn by a function named show...(): showFiles (the
home screen), showQuestLog, showBestiary, showPhotos, showAlbum, showMap, showPage.
Two things can pop out over the windows: #reader (an entry or a quest)
and #zoom (an enlarged photo). The title screen (#intro) covers it all
until Start is pressed.

Everything on the page is built as elements, never pasted in as raw HTML,
so nothing typed into the editor can run as code.

Privacy: the site is public. Quests carry no dates on purpose. What the page keeps about a visitor, and where,
is set out at the end of this file.

## The files

| File | What it holds |
| --- | --- |
| `01-content.js` | What gets loaded from posts.json, and the small helpers every part uses |
| `02-home.js` | The home screen, the quest log, simple pages, and the Chronicle |
| `03-bestiary.js` | The Bestiary, the Herbarium, and the leaping fish |
| `04-text.js` | Turning what the editor saves into paragraphs, photos and links |
| `05-popout.js` | The pop-out window: entries, remarks, quests, reports, companions, cards, equipment |
| `06-photos.js` | The photo viewer and the albums |
| `07-map.js` | The map: coastline, pins, landmarks |
| `08-status.js` | The Status screen and the honours |
| `09-menu.js` | The menu, the keyboard, and the title screen |
| `10-figure.js` | The pixel figure of the keeper and how he moves |
| `11-sky.js` | The sky behind the windows |
| `12-music.js` | The music |
| `13-moments.js` | Banners for what is new since the last visit |
| `14-touches.js` | The old-game touches: help line, sounds, NEW marks, gamepad, the keeper speaking |
| `15-sayings.js` | The day's saying, and the strangers who pass on the road |
| `16-fishing.js` | The fishing game: cast, wait, hook, fight, land |
| `17-start.js` | Loading and start: fetches everything, tidies it, draws the first screen |
| `site.css` | The look. Colours and fonts are set once near the top (the lines starting with `--`); each part of the screen has its own block below. |

## The pictures

The fish, plants, keeper, companions, landmarks, medals, curiosities and the fishing scene are PixelLab art, turned into
`sprites.png`/`sprites.json`, `keeper.png`, `companions.png`, `icons.png` and `scene/` by the scripts in `tools/sprites`
(see its README). Each part of the page that uses them keeps its older drawn pictures as a fallback while the sheet
loads, or if it ever fails to.

## Rules the scripts keep

- Everything on the page is built as elements, never pasted in as raw HTML, so nothing typed into the editor or sent
  by a visitor can run as code.
- Anything loaded from outside (posts.json, sprites.json, the server's answers) is tidied on the way in
  (`17-start.js`, `05-popout.js`), so one odd record cannot break a screen.
- What a visitor's browser remembers (music off, what they have opened, what the page last showed them, their own
  figure, their creel) stays on their device. The site sends nothing about them anywhere.
