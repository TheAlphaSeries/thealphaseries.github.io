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
