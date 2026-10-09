# Notes for wiring the art in

## Keeper

- Chris changed the design from the guide: **black robe**, **three violet orbs floating over the left hand** (drawn into the stills), narrow slanted eyes, and he **floats** instead of walking (ragged robe hem, no walk cycle).
- `keeper-walk.png` is replaced by `keeper-float.png` (east, 6 frames).
- Blink is 4 frames, not 2 (PixelLab's minimum): open, closing, closed, opening.
- All strips are 64 px frames side by side with no gaps, **except `keeper-fish.png`, which uses 80 x 80 frames** so the staff isn't cut off mid-swing. The figure sits 8 px further in from each edge of those frames.

## Fishing scene

- `fish-scene-lake.png`: sky is transparent above the hills, as asked.
- `fish-scene-water.png`: 4 frames of 320 x 32 side by side (1280 x 32). Each frame tiles left to right. Opaque, as water should be.
- `fish-scene-float.png`: 3 frames of 16 x 16 (bob up, bob down, pulled under). Hand-drawn.
- `fish-scene-splash.png`: 4 frames of 32 x 32, plays once.

## Plants

- Each `plant-<key>-dead.png` is the healthy sprite browned and sagged by hand, so the two line up exactly when swapped.
