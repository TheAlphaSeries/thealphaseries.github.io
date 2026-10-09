# Sprites that need fixing

Running list. Each file here is saved and usable as a stand-in, but needs another pass.

## Keeper (`keeper/`)

- `keeper-idle.png`: the three orbs mostly vanish (faint sparkles in 2 frames); hands come out tan/gold instead of dark brown.
- `keeper-blink.png`: staff gem goes dark during the blink; hands tan/gold.
- `keeper-float.png`: orbs gone; boots step a little, so it reads more like walking than floating; hands tan/gold.
- `keeper-cast.png`: a pale face appears inside the hood (must stay hidden); staff never goes overhead; orbs gone; hands tan/gold.
- `keeper-fish.png`: orbs gone; hands tan/gold.

Planned fix: the site draws the three orbs in code over every animation; recolour hands to dark brown by hand (free); regenerate cast (and maybe float) with stronger wording.

## Fishing scene (`fishing/`)

- `fish-scene-water.png`: the water is flat noisy texture without much shape; the 4 frames shimmer rather than flow.
- `fish-scene-splash.png`: reads a bit like a dark crown or flame rather than water; it also never fully settles into ripples.
- `fish-scene-lake.png`: has a reflection of a sun in the water (the sky and sun were cut out). If the site's sun sits elsewhere, the reflection will look wrong.
- `fish-scene-pier.png`: the moss is green, outside the palette (minor).

## Fish (`fish/`)

- `fish-sunfish.png`: now very small, with a pinkish halo around the outline.
- `fish-crappie.png`: looks like a bass; a real crappie is deep-bodied and speckled.
- `fish-striped-bass.png`: has vertical bars like a perch; a striped bass has thin horizontal stripes.
- `fish-halibut.png`: touches the top and bottom edges.
- `fish-brook-trout.png`: small and its markings (pale worm-like squiggles, red spots with blue halos) don't read.
- `fish-lake-trout.png`: tail touches the left edge.
- `fish-chinook-salmon.png`: touches both left and right edges.
- `fish-american-shad.png`: comes out bright turquoise (not dimmed), and the row of dark spots behind the gill is missing.
- `fish-lingcod.png`: touches the left and right edges.
- `fish-pacific-mackerel.png`: missing its wavy dark tiger stripes on the back.
- `fish-california-sheephead.png`: cartoonish, with odd white markings and fins that look like little legs.
- `fish-sevengill-shark.png`: looks like a generic great white; needs the broad head, seven gill slits and single far-back dorsal fin.
- `fish-red-rock-crab.png`: reads more like a hermit crab or armadillo than a crab.

## Plants (`plants/`)

- `plant-queen-anthurium.png`: drawn as a common red-flowered anthurium; the Queen Anthurium has long, narrow, hanging dark velvet leaves and no red flower. (Its wilted version inherits this.)
- All `plant-*-dead.png`: made by hand from the healthy sprite (leaves browned and sagged slightly, a few fallen leaves added), because PixelLab kept redrawing them green and healthy. They read as dried out, but the leaves don't really hang limp; a hand-drawn droop would sell it more.
