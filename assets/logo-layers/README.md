# Nyxa logo layers

The logo is split into 4 layers so each can be animated separately.

| Layer | File | What it is |
|---|---|---|
| 1 (bottom) | `nyxa-stars-*` | The 4 sparkle stars and 6 dots |
| 2 | `nyxa-moon-*` | The crescent moon, complete (the part hidden behind Nyx is filled in) |
| 3 | `nyxa-nyx-*` | Nyx with her book |
| 4 (top) | `nyxa-book-*` | A plain book (rounded rectangle and spine) for the "falls into her hands" moment |

- `*-brass` uses the website colours (brass `#D4A856`). `*-gold` uses the original app-icon gold.
- `nyxa-logo-layered-*.svg` is one file with all four layers as named groups: `stars`, `moon`, `nyx`, `book`. The book group is hidden by default.
- PNGs are 2048 × 2048 with a transparent background.

## How to use them

- **Same canvas.** Every file is the same size (1024 × 1024 for SVG, 2048 × 2048 for PNG). Place them all at the same x/y and size and they line up exactly. Then animate each one on its own.
- **Stacking order:** stars, then moon, then Nyx, then book on top.
- **The plain book's resting spot is in her hands.** For the "catch", start it above the screen and animate it down to its resting position (0, 0 offset), then fade it out as it reaches her own book.
- **Nyx sits on a slate shape.** That shape (`#171C22`, the website background) fills in her hair, which is see-through in the original drawing. On the slate site it's invisible. On any other background colour, change that shape's colour to match.
- **Keep Nyx's moves small** (a few pixels for "settling on the moon"). The filled-in part of the moon behind her is a flat patch, so if she moves far off the moon you'll see the join.
