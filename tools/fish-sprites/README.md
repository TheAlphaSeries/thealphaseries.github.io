# Bestiary pictures

These three files draw the creatures shown in the Bestiary. They are not part of the website itself and are not published with it.

- `engine.py` – the drawing machinery: body shape, light, scales, fins, the splash, and the step that turns the result into pixels.
- `creatures.py` – one recipe per creature (trout, bass, crab and so on).
- `run.py` – draws them all and writes `fish.json` plus a preview picture, `sheet.png`.

To change a picture: edit its recipe in `creatures.py`, run `python3 run.py`, look at `sheet.png`, then paste the contents of `fish.json` into `index.html` (the `FISH_SIZE`, `FISH` and `FISH_WATER` lines in section 4).

Needs Python with numpy, scipy, Pillow and opencv.
