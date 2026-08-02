# Photos — how to get them onto the site

**Don't resize or convert anything by hand.** Run `prep-photos.sh` from the
project root and it does the whole job: resizing, WebP, GPS stripping, and
updating `index.html` so nothing jumps around as the page loads.

## The three steps

**1. Drop your full-size originals into `images/_originals/`**

Straight off the camera or phone is fine — JPEG, PNG, HEIC and TIFF all work,
and you don't need to rename anything. Bigger is better: the script downsizes
but never upscales, so a photo narrower than 1600px can't fill the large slots.

**2. Scan them**

```bash
./prep-photos.sh scan
```

Lists every photo with its dimensions, flags any that are too small, and writes
`photo-map.txt` — a form with one line per slot on the website.

**3. Fill in `photo-map.txt`, then build**

Put a filename after each `|`:

```
hero-house-lavender        | DSC_4471.jpg
pool-summer-kitchen        | IMG_2210.HEIC
```

Leave a slot blank and its placeholder stays put, so you can do this in passes
as photos come in. Then:

```bash
./prep-photos.sh build
```

## What the slots are

| Slot | What it shows |
|---|---|
| `hero-house-lavender` | The house from the gate with the lavender bank. **Your single most important photo** — first thing visitors see and the preview image on every Meta ad |
| `main-house-exterior` | The main house across the lawn, wisteria in flower |
| `main-house-kitchen` | Main house country kitchen — opens the "Main House" chapter |
| `main-house-living-room` | Main house living room |
| `main-house-dining-room` | Formal dining room |
| `main-house-master` | Main house master bedroom |
| `main-house-bedroom-2` | Main house second bedroom |
| `main-house-attic-bedroom` | Attic bedroom with the canopy bed |
| `main-house-attic-landing` | Attic landing under the beams |
| `garden-gite-kitchen` | Garden gîte (3-bed) kitchen — opens the Garden Gîte chapter |
| `garden-gite-master` | Garden gîte main bedroom |
| `garden-gite-terrace` | Garden gîte terrace |
| `courtyard-gite-kitchen` | Courtyard gîte beamed kitchen — opens the Courtyard Gîte chapter |
| `courtyard-gite-studio` | Courtyard gîte studio and mezzanine (**portrait** — sits in a tall tile) |
| `courtyard-gite-bedroom` | Courtyard gîte bedroom |
| `gite-bathroom` | Walk-in shower room |
| `pool-summer-kitchen` | Pool with the plancha / summer kitchen |
| `pool-wide` | Wide view across the pool |
| `outdoor-bar-apero` | The covered outdoor bar, *Place de l'Apéro* |
| `pergola-evening` | The pergola lounge at dusk with the candles lit |
| `garden-gazebo` | Garden borders and planting |
| `vegetable-garden` | The vegetable garden and pergola |
| `garden-path` | Path through the planting down to the pool |
| `sunflower-field` | Sunflowers in the countryside (**portrait** — sits in a tall tile) |
| `courtyard` | Courtyard, outbuildings and parking |
| `outbuilding-exterior` | The outbuilding range — opens the fourth chapter |

The favicon is generated automatically from the hero.

Two gallery tiles are double height (`g-tall`) and want **portrait** photos;
the wide tile at the top of the gallery wants a **landscape** one.

## Still worth having

The ad copy leans on the setting, so these would earn a place in the gallery:
the bakery and bar frontage, a Cognac vineyard row, La Rochelle harbour, the
village street.

## Notes

- **Don't send photos through WhatsApp.** It re-compresses everything and caps
  the long edge at about 1600px — the current batch arrived that way, and the
  hero came through at only 1024px wide. AirDrop, Google Drive, WeTransfer or
  a plain email attachment all keep the original file intact.
- **Location data is stripped.** Camera model, timestamps and GPS coordinates
  are all removed from the published files; the Display P3 colour profile is
  kept so the colours stay true.
- **The page adapts to what you supply.** Sizes that would need upscaling are
  never generated, and the script prunes the HTML to match — so a small
  original degrades quietly rather than leaving a broken image.
- **If files come out too heavy**, the script tells you and gives you the
  command to re-run at lower quality. Nothing is lost — your originals in
  `_originals/` are never modified, so you can rebuild as often as you like.
- **`_originals/` should not be deployed.** It's your working folder; only the
  generated files in `images/` need to go to the server.
