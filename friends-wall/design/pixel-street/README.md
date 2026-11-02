# Pixel street mockups

The code that draws the mockups in `docs/mockups/`. It runs in a browser. Everything is drawn pixel by pixel on a small canvas, then scaled up 4× with a dot-screen filter.

- `scene.html`: the 5-friend street. `?mode=world|game`, `?theme=day|sunset|night|spring`
- `scene10.html`: 10 friends, with a smaller hazy back row for depth
- `scene2.html`: 10 friends, either two same-size rows (`?v=rows`) or one long scrolling street (`?v=street`, `?v=pano` for the whole strip)
- `render.js`: renders all of them to `docs/mockups/`

## Fonts

The pages expect two free pixel fonts from Google Fonts, Silkscreen and VT323 (both under the SIL Open Font License), saved as `fonts/Silkscreen.woff2` and `fonts/VT323.woff2`. They aren't committed. One way to fetch them:

```bash
mkdir -p fonts && for f in Silkscreen VT323; do curl -sS -A "Mozilla/5.0 Chrome/120" "https://fonts.googleapis.com/css2?family=$f" | grep -o 'https://fonts.gstatic.com[^)]*' | tail -1 | xargs curl -sS -o fonts/$f.woff2; done
```

Then run:

```bash
node render.js
```

The characters, names, cities and messages are made-up examples.
