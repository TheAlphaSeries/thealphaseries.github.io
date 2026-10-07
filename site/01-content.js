/* ==========================================================================
   1. CONTENT
   Filled in from posts.json when the page opens (section 15). Empty until then.
   ========================================================================== */
let ABOUT = "";          /* the About text, loaded from posts.json */
let BESTIARY_INTRO = "";   /* the short blurb at the top of the Bestiary, loaded from posts.json */
let ALBUMS = [];         /* photo albums, newest first, loaded from posts.json */
let STATUS = { name: "", class: "", home: "", body: "" };   /* the character on the Status screen, loaded from posts.json */
let PLANTS = [];         /* the herbarium: bonsai and house plants, loaded from posts.json */
let PLANT_INTRO = { bonsai: "", house: "" };   /* the notice at the top of each collection */
let QUESTS = [];         /* things set out to do, with objectives, loaded from posts.json */
let PLACES = [];         /* map pins, loaded from posts.json */
let BESTIARY = [];       /* the creatures, loaded from posts.json */
let sorted = [];         /* the entries, newest first, loaded from posts.json */
let loadNote = "Loading...";
/* Parts of the site put on the shelf: built, kept, and switched off. To bring one back, set it to false here. The
   Equipment screen (site/05-popout.js, showEquipment) is shelved: its menu command, its button on Status and its
   Help text stay away, while the pieces entered in the editor are kept. */
const SHELVED = { equipment: true };   /* shown in the log while there is nothing to list */
const HELP = `## Touch or mouse

Select an entry to open it. Select Back, or tap outside the window, to close it.

## Keyboard

- Up / Down: move cursor
- Left / Right: switch window
- Enter: confirm
- Esc: cancel

## Map

Drag to move. Pinch, or use + and -, to zoom. Point at a pin or a name to see the place and its landmarks. Each landmark is drawn as a small picture: in colour once visited, a dark locked shape until then. Where they crowd together some shrink to dots; zoom in to see them. Point at one to name it.

## Experience

Nearly everything here pays experience: an entry written, a species caught (rarer pays more), a plant kept alive, a landmark seen, a place reached, a quest fulfilled. It adds up to the level, and the Status screen shows exactly where every point came from. Each collection also keeps its own standing, a rank earned by doing that one thing; the top rank of a collection is reached by finishing it.

## Quests

The Quests tab is the full log: what is in hand, and what has been fulfilled. Each quest has a difficulty and pays experience when it is finished; harder ones and Great Works pay more. Open a quest to see who travels with it. Some quests have named posts to fill: choose Apply beside an open one. Otherwise choose Petition to join. Either way you give a name of your choosing and an e-mail address. No account is needed, only what you write is kept, and the address is seen by the keeper alone. Each newcomer chooses a calling and a curiosity to set out with, and is then drawn a figure by lot, with a past to match. They may draw again as often as they please before sending; once sent it is theirs, and signing again with the same address keeps it. The keeper accepts or declines in his own time. Those accepted are entered under The Company at the foot of the Quest Log, each with a figure and a page of their own.

## A quest fulfilled

A finished quest opens with its report: a grade, the experience it paid, everyone who was there and what it earned them, and the keeper's account of how it went. Companions have a level of their own; it rises with every quest they see through. Choose Share to make a card of the report, or of any companion, to send to a friend.

## The annals

A companion's page carries their annals: an account of what they have actually done, written afresh from the record each time it is opened, so it grows as they do.

## A line in the water

Choose Cast a line in the Bestiary to fish from the keeper's pier. Press (a tap, or Space) to cast; wait for the float to jerk and press again to hook; then hold to lift the green zone and let go to sink it, keeping the fish inside until the line is drawn in. Only what the keeper has caught can be caught. Your creel is kept on your own device.

## Like an old game

The bar at the top says what the highlighted command does. Anything you have not opened yet is marked NEW, with a dot on its command; if an entry is waiting, the title screen offers Continue. A gamepad works: the pad or stick moves, A confirms, B goes back. On the Status screen, choose the keeper's portrait to hear from him. The Bestiary can be narrowed to the caught or the at-large, and put in order of number, rarity or name.

## The log

Each entry is kept like a save file: its number, and how things stood when it was written. Those of the company may leave a remark under an entry; the keeper reads each before it is shown. Now and then someone passes on the road as you read. Under the entries is the day's saying, which changes at midnight in San Francisco.

## The sky

The sky behind the windows is the keeper's own: it follows the hour and the season where he is. The sun is old, and sometimes gutters.

## Chronicle

The Chronicle is everything recorded here, in the order it happened, newest first. Choose a row to go to the thing itself.

## Honours

Medals for particular feats are shown on the Status screen: in colour once won, a dark locked shape until then. They pay no experience.

## What is new

When something has been earned since you last looked in, a banner says so. To know what is new, this page keeps short notes in your own browser of what it last showed you and what you have opened. The notes never leave your device.`;

/* ==========================================================================
   2. HELPERS
   ========================================================================== */
const $ = (s) => document.querySelector(s);                       /* find one thing on the page */
const text = (v) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");        /* whatever was loaded, as plain text ("" if it is not text) */
const amount = (v) => { const n = parseFloat(v); return Number.isFinite(n) && n > 0 ? n : null; };   /* a positive number, or nothing */
const count = (n, word) => n + " " + word + (n === 1 ? "" : "s");                                /* "1 photo", "3 photos" */
/* make a new element: its tag, its class, and the text inside it */
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const store = {   /* the visitor's saved choices; storage can be blocked, so never let it throw */
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
};
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/* "2026-10-04" as "Oct 4, 2026"; anything that is not a real date gives "" */
const day = (d) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || ""); return m && MONTHS[+m[2] - 1] && +m[3] >= 1 && +m[3] <= 31 ? MONTHS[+m[2] - 1] + " " + +m[3] + ", " + m[1] : ""; };

const stage = $("#stage"), main = $("#main"), menu = $("#menu"), reader = $("#reader"), rwin = $("#readerwin"), zoomBox = $("#zoom"), introBox = $("#intro");
let view = "files";      /* which screen the main window shows: files, quests, chron, bestiary, plants, photos, album, map, status, about or help */
let current = null;      /* the entry open in the pop-out window, if any */

/* put an entry's name after # in the address (so the link can be shared), or clear it */
function setHash(h) { try { history.replaceState(null, "", h ? "#" + h : location.pathname + location.search); } catch (e) {} }
function opt(text, onClick, cls) {   /* a selectable menu option */
  const b = el("button", "opt" + (cls ? " " + cls : ""), text); b.type = "button";
  if (onClick) b.addEventListener("click", onClick);
  return b;
}
/* Anything layered on top (title screen, open entry, enlarged photo) makes the menu behind it unreachable. */
function syncLayers() { stage.inert = !introBox.classList.contains("done") || !reader.hidden || !zoomBox.hidden; }
