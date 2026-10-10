# Notes for wiring the art in

## Keeper

- Chris changed the design from the guide: **black robe**, **three violet orbs floating over the left hand** (drawn into the stills), narrow slanted eyes, and he **floats** instead of walking (ragged robe hem, no walk cycle).
- `keeper-walk.png` is replaced by `keeper-float.png` (east, 6 frames).
- Blink is 4 frames, not 2 (PixelLab's minimum): open, closing, closed, opening.
- All five strips are 64 px frames side by side with no gaps.
- His hands were recoloured to deep brown on the front view and all 8 directions and every animation were regenerated from that, so they match. The orbs were patched back into two idle frames and the last two cast frames by hand.

## Fishing scene

- `fish-scene-lake.png`: sky is transparent above the hills, as asked.
- `fish-scene-water.png`: 4 frames of 320 x 32 side by side (1280 x 32). Each frame tiles left to right. Opaque, as water should be.
- `fish-scene-float.png`: 3 frames of 16 x 16 (bob up, bob down, pulled under). Hand-drawn.
- `fish-scene-splash.png`: 4 frames of 32 x 32, plays once.

## Plants

- Each `plant-<key>-dead.png` is the healthy sprite browned and sagged by hand, so the two line up exactly when swapped.

## Companions

- 120 figures, `companion-<calling>-<1..5>.png`, 64 x 64, three-quarter view (south-east), made in PixelLab's premium mode with the keeper as the style reference.
- `companion-<calling>-<n>-idle.png`: 2 frames of 64 x 64 side by side (128 x 64). Frame 1 is the still; in frame 2 the upper body dips 1 px while the feet stay planted. Made by hand from the still, because PixelLab's idle template redrew the figures and dropped their gear. Long items that cross the waist (staffs, poles) get a 1 px kink in frame 2, which isn't noticeable at speed.
- `companion-<calling>-<n>-walk.png`: six 64 x 64 frames walking east (PixelLab v3 animation), used for the order of march on a quest. All 8 directions exist in PixelLab if they're ever wanted.

## Title screen

- `title/far.png`, `title/city.png`, `title/ledge.png` (from `art/raw/title`): three 672 x 256 layers on transparency, stacked at the foot of the title screen (`#vista` in index.html), each drifting slowly. San Francisco on the Dying Earth: the far hills hold the broken Golden Gate (moved by hand so both towers show between the buildings) and Sutro Tower; the city is the ruined skyline (Coit Tower and its Victorians, the Transamerica Pyramid, the broken Salesforce Tower), its pieces rearranged by hand so the pyramid stands clear of the keeper; on phones the layers show their right-hand side; the ledge is a Lands End cliff with an old street lamp, whose post was shortened by hand so the lamp fits under the top edge.
