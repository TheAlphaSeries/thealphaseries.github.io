# The pictures in the Bestiary and the Herbarium

These files draw every creature and plant on the site. They are not part of the website and are not published with it; what the website reads is `sprites.json` at the top of the repository, which these scripts write.

## What is here

- `engine.py` – the drawing machinery: shapes, light, the splash, and the step that turns a painted model into pixels.
- `fishkit.py` – turns a fish's "spec sheet" into a picture. A spec sheet reads like an identification guide: how deep the body is, where each fin sits, the colours, the markings, and the pose.
- `trouts.py`, `fresh.py`, `salt.py`, `pelagic.py` – the spec sheets, one per species.
- `inverts.py` – the crabs, lobster, crayfish, squid and ray, which are built from layered parts instead of a spec sheet.
- `plants.py` – the plants, each with a living and a perished picture.
- `run.py` – draws them and writes the results.

## How a picture finds its entry

By file name. The entry `bestiary/001-rainbow-trout.md` uses the picture named `rainbow-trout`; the plant `plants/101-juniper.md` uses `juniper`, and `juniper~dead` once it is marked perished. A new entry with no picture of its own borrows the general picture for whatever "sprite" kind is chosen in the editor.

## Changing or adding one

1. Edit or add its spec sheet (copy a similar species and change the numbers).
2. `python3 run.py its-name` and look at `try.png`.
3. When it looks right, `python3 run.py` to redraw everything and rewrite `sprites.json`, then commit.

Needs Python with numpy, scipy, Pillow and opencv.

## Where the details came from

Proportions, fin positions and markings follow agency and museum identification guides (state fish and wildlife departments, NOAA, the Smithsonian's Shorefishes of the Eastern Pacific, Wikipedia species pages, grower listings for the orchid). Bodies are drawn deeper than life on purpose: at this size a true-to-scale fish reads as thin.

`keeper.py` draws the figure of Chris shown on the title and Status screens (the high mage). It is separate from the rest: it writes `keeper.json`, whose colours and frames are pasted into section 12 of `index.html`.
