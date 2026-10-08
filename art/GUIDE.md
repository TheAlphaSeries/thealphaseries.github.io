# Art guide (instructions for Claude Code on Chris's Mac)

You are making the real pixel art for Half Life (halflife.studio), Chris's personal site: a 16-bit RPG-style blog set in Jack Vance's Dying Earth. Chris is not an engineer; explain things plainly and keep him in the loop.

## Ground rules

- Work on a git branch called `art` (create it from main). **Never commit to main** and never change anything outside `art/`. Another Claude session wires the art into the site.
- Save every finished file under `art/raw/<set>/` with the exact file names below. Commit and push the `art` branch after each finished set, so nothing is lost.
- Show Chris every result before moving on: run `open <file>` so it pops up on his screen, and ask "keep, or redo?". He judges the look; you check size, transparency and that nothing is cut off at the edges.
- Start with the keeper and get his approval before making anything else. Every later sprite copies his style.
- Don't spend generations in bulk without asking. Before a big set (fish, companions), say roughly how many generations it will use and wait for a yes.
- Use PixelLab through the `pixellab` MCP tools (`create_character`, `animate_character`). For non-character sprites (fish, plants, icons, medals, items, fishing scene), use PixelLab's HTTP API (docs at https://api.pixellab.ai/v2/docs or https://www.pixellab.ai/pixellab-api) with the same key: ask Chris to put it in an environment variable (`export PIXELLAB_KEY=...`) rather than pasting it into chat. If the API can't do a piece, tell Chris which ones to make by hand on pixellab.ai (Objects page) and where to save them.

## The look

1970s painted fantasy paperback, a world under a dying red sun, done as 16-bit pixel art: dark, warm, a little strange. One strong light from the upper right (a low red sun), deep warm shadow.

Palette (stay inside it; fish are the one exception, see below):
#150A0E near-black maroon · #4E1C22 oxblood · #34241C umber · #701618 dried blood · #B02E20 dying red · #CE5432 ember · #963414 rust · #D2A65A tarnished gold · #6A3A1E old bronze · #FFD257 ember gold · #F4E8D0 vellum · #6A3AD0 / #B98CFF orb violet (the only cold colour)

Sprite base (append to every subject line):
`16-bit fantasy RPG style, dark warm colors: oxblood red, umber brown, rust, tarnished gold, with violet magic glow, single-pixel dark outline, medium shading, lit from the upper right by a low red sun, transparent background`

Settings for characters: Humanoid, v3, camera Low Top-Down, Detail "Highly detailed" for the keeper and medium for others, outline single colour dark if offered. **Character size is 64 x 64** (PixelLab's maximum for characters that can be animated).

## 1. The keeper (Chris's own figure). Do this first.

Folder `art/raw/keeper/`. Size 64 x 64.

Subject:
`tall lean hooded sorcerer, deep cowl hiding the face completely in shadow, three small glowing violet eyes in the darkness of the hood, dark-skinned hands, long dark oxblood robe with tarnished gold trim and a gold sash, long wooden staff topped with a glowing violet gem held in his right hand, left hand open palm up and empty`

The left hand must stay EMPTY: the site draws a floating orb there in code. Chris is a Black man and this figure is him: the hands must read clearly as dark-skinned, and the face stays hidden except the three eyes.

Check before showing Chris: three eyes visible, no face, dark hands, left hand empty, staff not cut off.

Files: `keeper-stand.png` (south-east facing still), plus each animation as a horizontal strip (frames side by side, no gaps) or a folder of numbered frames:

| Animation | Direction | Frames | Action description | File |
| --- | --- | --- | --- | --- |
| Idle | south-east | 4 | breathing idle, robe gently stirring | keeper-idle.png |
| Blink | south-east | 2 | all three eyes close, then open | keeper-blink.png |
| Walk | east | 6 | walking steadily, staff swinging | keeper-walk.png |
| Cast | south-east | 6 | raises the staff overhead, free hand lifted, gem flaring | keeper-cast.png |
| Cast a line | east | 6 | swings the staff forward like casting a fishing line | keeper-fish.png |

Also save all 8 rotations PixelLab makes as `keeper-rot-<direction>.png`.

## 2. Fishing scene

Folder `art/raw/fishing/`.

| Piece | Size | Frames | Subject | File |
| --- | --- | --- | --- | --- |
| Lake backdrop | 320 x 180 | 1 | a dark lake at dusk seen from the shore, far ruined towers, low hills, transparent sky above the hills | fish-scene-lake.png |
| Water strip | 320 x 32 | 4 looping, tiles left-right | dark rippling lake water, red sunlight glinting | fish-scene-water.png |
| Pier | 128 x 64 | 1 | an old weathered wooden pier jutting out to the right, mossy posts | fish-scene-pier.png |
| Float | 16 x 16 | 3 (up, down, pulled under) | a small red and bone-white fishing float | fish-scene-float.png |
| Splash | 32 x 32 | 4 | a small splash of dark water with droplets | fish-scene-splash.png |

If a size isn't allowed, use the nearest allowed size and note it in `art/raw/NOTES.md`.

## 3. Fish (48)

Folder `art/raw/fish/`. 96 x 64 if allowed, else 64 x 64. Side view, facing right, transparent background. Small creatures fill less of the canvas than big ones.

Fish keep their real markings so anglers recognise them, dimmed as if under a red sun. Subject:
`a <name>, accurate to the real species, side view facing right, natural markings slightly dimmed under red light, faint gloss on the scales, pixel art, single-pixel dark outline, transparent background`

Optional later: a 4-frame swim loop per fish, `fish-<key>-swim.png`.

| No. | Name | File |
| --- | --- | --- |
| 001 | Rainbow Trout | fish-rainbow-trout.png |
| 002 | Sunfish | fish-sunfish.png |
| 003 | Crappie | fish-crappie.png |
| 004 | Bass | fish-bass.png |
| 005 | Catfish | fish-catfish.png |
| 006 | Striped Bass | fish-striped-bass.png |
| 007 | California Halibut | fish-halibut.png |
| 008 | Brown Trout | fish-brown-trout.png |
| 009 | Brook Trout | fish-brook-trout.png |
| 010 | Golden Trout | fish-golden-trout.png |
| 011 | Lahontan Cutthroat Trout | fish-lahontan-cutthroat-trout.png |
| 012 | Lake Trout | fish-lake-trout.png |
| 013 | Kokanee Salmon | fish-kokanee-salmon.png |
| 014 | Chinook Salmon | fish-chinook-salmon.png |
| 015 | Steelhead | fish-steelhead.png |
| 016 | Smallmouth Bass | fish-smallmouth-bass.png |
| 017 | Spotted Bass | fish-spotted-bass.png |
| 018 | Bluegill | fish-bluegill.png |
| 019 | Redear Sunfish | fish-redear-sunfish.png |
| 020 | Brown Bullhead | fish-brown-bullhead.png |
| 021 | Common Carp | fish-common-carp.png |
| 022 | Sacramento Pikeminnow | fish-sacramento-pikeminnow.png |
| 023 | American Shad | fish-american-shad.png |
| 024 | White Sturgeon | fish-white-sturgeon.png |
| 025 | Signal Crayfish | fish-signal-crayfish.png |
| 026 | Pacific Sanddab | fish-pacific-sanddab.png |
| 027 | Starry Flounder | fish-starry-flounder.png |
| 028 | Black Rockfish | fish-black-rockfish.png |
| 029 | Vermilion Rockfish | fish-vermilion-rockfish.png |
| 030 | Cabezon | fish-cabezon.png |
| 031 | Lingcod | fish-lingcod.png |
| 032 | Barred Surfperch | fish-barred-surfperch.png |
| 033 | Redtail Surfperch | fish-redtail-surfperch.png |
| 034 | Jacksmelt | fish-jacksmelt.png |
| 035 | Pacific Mackerel | fish-pacific-mackerel.png |
| 036 | Pacific Bonito | fish-pacific-bonito.png |
| 037 | Yellowtail | fish-yellowtail.png |
| 038 | Bluefin Tuna | fish-bluefin-tuna.png |
| 039 | Kelp Bass | fish-kelp-bass.png |
| 040 | California Sheephead | fish-california-sheephead.png |
| 041 | White Seabass | fish-white-seabass.png |
| 042 | Leopard Shark | fish-leopard-shark.png |
| 043 | Sevengill Shark | fish-sevengill-shark.png |
| 044 | Bat Ray | fish-bat-ray.png |
| 045 | Dungeness Crab | fish-dungeness-crab.png |
| 046 | Red Rock Crab | fish-red-rock-crab.png |
| 047 | California Spiny Lobster | fish-california-spiny-lobster.png |
| 048 | Market Squid | fish-market-squid.png |

## 4. Plants (16), landmarks (24), medals (21), curiosities (12)

All still, no animation.

**Plants**, `art/raw/plants/`, 64 x 64. Subject `a <plant> in an old clay pot, healthy and lush`; perished version `the same <plant>, wilted, brown and drooping, leaves fallen around the pot`. Files `plant-<key>.png` and `plant-<key>-dead.png` for: queen-anthurium (Queen Anthurium), philodendron-gloriosum, monstera-thai-constellation, howards-dream (an orchid), juniper (bonsai), maple-grove (bonsai forest of maples), grape (grape vine bonsai), redwood-grove (bonsai forest of redwoods).

**Landmarks**, `art/raw/landmarks/`, 32 x 32. Subject `a tiny map icon of <landmark>, recognisable at a glance but ancient and ornate, like a ruin from a far future, bold simple shapes`. Colour version only. Files `landmark-<name>.png` for: pagoda, tower, obelisk, skyline, bridge (red suspension bridge), peak, pillars, cave, museum, dome, house, lantern, buddha, boat, cablecar, tram, tree, panda, lake, cathedral, carousel, cup, note (a music note), gem.

**Medals**, `art/raw/medals/`, 32 x 32. Subject `a round <metal> medal on a short dark red ribbon, embossed with <emblem>`; metals bronze, silver, gold. Files `medal-<family>-<metal>.png`. Families and emblems: fish (a leaping fish), map (a compass rose), plant (a single leaf), quest (a crossed staff and sword), company (three small hooded figures), log (a quill over an open book), level (a five-pointed star).

**Curiosities**, `art/raw/items/`, 32 x 32. Subject `<item>, a small magical object, glowing faintly`. Files `item-<key>.png`: lamp (A Lamp That Burns Without Oil), map (A Map of a Country Since Drowned), bottle (A Bottle of the Old Sun's Light), coin (A Coin Bearing No King's Face), key (A Key to a Door Not Yet Found), compass (A Compass That Points to Regret), ring (A Ring That Tightens at a Lie), whistle (A Whistle No Dog Will Answer), book (A Book With One Page Remaining), tooth (A Tooth of Something Large), mirror (A Mirror Running a Day Behind), egg (An Egg, Warm, of Unknown Parentage).

## 5. Companions (120). Do these last.

Folder `art/raw/companions/`. 64 x 64, same settings as the keeper, using the approved keeper as the style reference. Five figures per calling; vary the creature across the five, choosing from: Human, Elf, Dwarf, Goblin, Orc, Imp, Ghost, Shade, Skeleton, Golem, Slime, Lizardfolk, Frogfolk, Birdfolk, Fishfolk, Catfolk, Foxfolk, Mothfolk, Mushroom Folk, Rootfolk.

Subject `a <creature> <calling>, <gear>, full body, standing ready for a journey`. Each gets a 2-frame idle bob (`companion-<calling>-<n>-idle.png`); a 4-frame east walk is optional. Files `companion-<calling>-<1..5>.png` (calling in lower case).

Callings and gear: Wanderer (patched cloak, walking stick, bedroll) · Knight (dented plate armour, shield, sword) · Mage (robe of stars, wand, floating book) · Rogue (dark hood, twin daggers, coin purse) · Ranger (green-brown leathers, longbow, quiver) · Cleric (white-and-gold vestments, holy symbol, mace) · Bard (feathered hat, lute) · Alchemist (leather apron, bubbling flask, goggles) · Angler (wide hat, fishing rod, creel basket) · Lamplighter (long brass pole with a flame, lantern at the belt) · Porter (enormous overloaded pack) · Cartographer (rolled maps, quill, spyglass) · Cook (apron, ladle, pot on the back) · Boatman (oar over the shoulder, rope coil) · Monk (simple robe, prayer beads, bare feet) · Berserker (furs, great axe, war paint) · Necromancer (black robe, skull-topped staff, green glow) · Merchant (rich coat, scales, bulging satchel) · Gardener (straw hat, trowel, potted seedling) · Smith (leather apron, hammer, glowing horseshoe) · Paladin (shining armour, tabard, glowing sword) · Witch (pointed hat, broom, small familiar) · Duelist (fine coat, rapier, plumed hat) · Hermit (ragged robe, lantern, long beard or veil)

Ask Chris before starting this set; it's the biggest spend. It's fine to do a few callings per session.

## When a set is done

Commit with a short message ("art: keeper"), push the `art` branch, and tell Chris: "The <set> is on the art branch; tell the other Claude session it's ready."
