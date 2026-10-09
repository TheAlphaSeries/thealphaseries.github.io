# Sprites that need fixing

Running list. Updated 2026-10-09 after the first fix round. Everything below is saved and usable as a stand-in.

## Still open

- `companions/companion-witch-3.png` (Ghost) and `companion-witch-5.png` (Catfolk): the small familiar (crow, owl) still doesn't come through. Two regenerations each tried; PixelLab drops it every time. A hand-drawn familiar on the shoulder is the next option.
- `landmarks/landmark-pagoda.png`: the new one is tall and clear, but its spire and base touch the top and bottom edges.
- `landmarks/landmark-museum.png`, `landmark-pillars.png`, `landmark-tree.png`: touch the canvas edge by 0 to 1 px.
- `medals/`: emblems are small and a bit soft at 32 px; the fish, leaf and three-figures emblems are the hardest to read. Acceptable, but a hand-drawn emblem set would be sharper.
- `companions/*-idle.png`: a simple 1 px dip made by hand. A real breathing idle would need PixelLab's skeleton mode, 2 to 4 generations each (240 to 480 for all 120).

## Round 2 (art upgrade)

- Plants: all eight redrawn with PixelLab's Pro model in natural colours (each the best of 16 candidates); wilted versions browned from them by hand.
- Companions: each is now dyed one of nine colour schemes by its seed (figures.js, ART_DYES), so figures of one calling vary.
- Fish: shown on a stage with water; fish breach, crabs scuttle, the squid jets, the ray glides (03-bestiary.js, leap()).
- Title screen: a three-layer landscape (far hills, ruined city, ledge) drifting slowly under the title (title/, art/raw/title).

## Fixed in round 1

- Keeper: hands recoloured to deep brown on the front view; all 8 directions and all five animations regenerated from it. The face no longer shows in the cast, the orbs stay in every frame (patched by hand in four frames), and all strips are now 64 px frames.
- Fishing scene: water rebuilt by hand (rippling, loops cleanly); splash redrawn by hand as a water crown; sun reflection removed from the lake; pier moss recoloured into the palette.
- Fish: crappie, sunfish, brook trout, halibut, lake trout, chinook, shad, lingcod, mackerel, sheephead, red rock crab regenerated; striped bass given horizontal stripes by hand; sevengill shark's front dorsal fin removed by hand.
- Plants: Queen Anthurium redone with long hanging velvet leaves (plus a new wilted version); philodendron, monstera, maple and grape wilted versions now droop.
- Landmarks: house, cathedral, pagoda, cable car redone; bridge recoloured into the palette.
- Medals: quest ribbon recoloured to match the others.
- Curiosities: map, egg, lamp, tooth redone (map's water recoloured into the palette); whistle gem recoloured red.
- Companions: Golem Knight and Golem Cleric now clearly stone; Fishfolk Angler now has a fish head; Goblin Witch has her toad.
