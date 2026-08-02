#!/bin/bash
# ---------------------------------------------------------------------------
# prep-photos.sh — turn a pile of camera/phone photos into the exact set of
# web-ready files index.html expects.
#
#   1.  ./prep-photos.sh scan     inventory images/_originals, write photo-map.txt
#   2.  edit photo-map.txt        pair each website slot with one of your photos
#   3.  ./prep-photos.sh build    produce every size, in JPEG + WebP
#
# Handles HEIC (iPhone), auto-rotation, strips GPS/EXIF, never upscales, and
# syncs the width/height attributes in index.html so there's no layout shift.
# ---------------------------------------------------------------------------
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="$HERE/images/_originals"
OUT="$HERE/images"
MAP="$HERE/photo-map.txt"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

JPEG_QUALITY=80     # 78-82 is the sweet spot for photography at these sizes
WEBP_QUALITY=72     # WebP looks cleaner than JPEG at the same number

# slot | widths | what it is
SLOTS='
hero-house-lavender|800 1600 2400|House from the gate with the lavender bank (also the social/OG preview)
aerial-property|800 1600|Aerial view over the whole property
aerial-exterior|800 1600|Aerial view of the house and countryside
main-house-exterior|800 1600|The main house from the garden, wisteria in flower
main-house-kitchen|800 1600|Main house country kitchen
main-house-living-room|800 1600|Main house living room with the panelled wall
main-house-dining-room|800 1600|Main house formal dining room
main-house-master|800 1600|Main house master bedroom
main-house-bedroom-2|800 1600|Main house second bedroom
main-house-attic-bedroom|800 1600|Main house attic bedroom with the canopy bed
main-house-attic-landing|800 1600|Attic landing under the beams
garden-gite-kitchen|800 1600|Garden gite (3-bed) kitchen and dining
garden-gite-living-room|800 1600|Garden gite living room
garden-gite-living-2|800 1600|Garden gite living room, second view
garden-gite-bedroom-2|800 1600|Garden gite second bedroom
garden-gite-bedroom-3|800 1600|Garden gite third bedroom
garden-gite-master|800 1600|Garden gite main bedroom
garden-gite-terrace|800 1600|Garden gite private terrace
garden-gite-bathroom|800 1600|Garden gite bathroom
courtyard-gite-kitchen|800 1600|Courtyard gite beamed kitchen with the mezzanine stair
courtyard-gite-studio|800 1600|Courtyard gite studio and mezzanine
courtyard-gite-bedroom|800 1600|Courtyard gite bedroom up the stairs
courtyard-gite-bathroom|800 1600|Courtyard gite walk-in shower room
courtyard-gite-exterior|800 1600|Courtyard gite from outside
pool-summer-kitchen|800 1600|Pool with the plancha / summer kitchen
pool-wide|800 1600|Wide view across the pool
outdoor-bar-apero|800 1600|The covered outdoor bar, "Place de l'\''Apero"
pergola-evening|800 1600|The pergola lounge at dusk, candles lit
pergola-seating|800 1600|Pergola seating by the pool
garden-gazebo|800 1600|Lawn, silver birches and the gazebo
garden-border|800 1600|Flowering border with the stone urn
vegetable-garden|800 1600|The vegetable garden and pergola
garden-path|800 1600|Path through the planting to the pool
sunflower-field|800 1600|Sunflowers in the fields around the village
courtyard|800 1600|Courtyard, outbuildings and parking
outbuilding-exterior|800 1600|The outbuilding range
area-village-square|800 1600|The square at Couture-d'\''Argenson
area-sunflowers|800 1600|Sunflowers at sunset
area-la-rochelle|800 1600|La Rochelle harbour
area-la-rochelle-port|800 1600|The old port at La Rochelle
area-niort|800 1600|Niort across the Sevre
area-poitiers|800 1600|Poitiers, Notre-Dame-la-Grande
area-thouars|800 1600|Thouars town hall
area-deux-sevres|800 1600|A river in the Deux-Sevres
area-nanteuil|800 1600|Medieval street at Nanteuil
area-rochefoucauld|800 1600|Chateau de La Rochefoucauld
area-verteuil|800 1600|Verteuil-sur-Charente village
'

if [ -t 1 ]; then
  c_ok=$'\033[32m'; c_warn=$'\033[33m'; c_err=$'\033[31m'; c_dim=$'\033[2m'; c_off=$'\033[0m'
else
  c_ok=''; c_warn=''; c_err=''; c_dim=''; c_off=''
fi
say()  { printf '%s\n' "$*"; }
ok()   { printf '%s✓%s %s\n' "$c_ok" "$c_off" "$*"; }
warn() { printf '%s!%s %s\n' "$c_warn" "$c_off" "$*"; }
die()  { printf '%s✗%s %s\n' "$c_err" "$c_off" "$*" >&2; exit 1; }

need() { command -v "$1" >/dev/null 2>&1 || die "Missing '$1'. Install with: brew install $2"; }

px() { sips -g pixelWidth -g pixelHeight "$1" 2>/dev/null \
       | awk '/pixelWidth/{w=$2} /pixelHeight/{h=$2} END{print w" "h}'; }

human() { awk -v b="$1" 'BEGIN{ if (b>1048576) printf "%.1fMB", b/1048576; else printf "%dKB", b/1024 }'; }

# ---------------------------------------------------------------------------
cmd_scan() {
  [ -d "$SRC" ] || die "No folder at $SRC"
  local files=() f
  while IFS= read -r f; do files+=("$f"); done < <(
    find "$SRC" -maxdepth 1 -type f \
      \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.webp' \
         -o -iname '*.heic' -o -iname '*.heif' -o -iname '*.tif' -o -iname '*.tiff' \) \
      ! -name '.*' | sort
  )

  [ ${#files[@]} -gt 0 ] || die "No photos found in $SRC
Drop your full-size originals in there first (JPEG, PNG, HEIC and TIFF all work)."

  say ""
  say "Found ${#files[@]} photo(s) in images/_originals:"
  say ""
  for f in "${files[@]}"; do
    local dim; dim="$(px "$f")"
    local w="${dim%% *}" h="${dim##* }"
    local size; size="$(human "$(stat -f%z "$f")")"
    local flag=""
    [ "${w:-0}" -lt 1600 ] 2>/dev/null && flag="  ${c_warn}(narrow — under 1600px wide)${c_off}"
    printf '  %-38s %5sx%-5s %8s%s\n' "$(basename "$f")" "${w:-?}" "${h:-?}" "$size" "$flag"
  done
  say ""

  if [ -f "$MAP" ]; then
    warn "photo-map.txt already exists — leaving it alone."
    say "  Delete it and re-run scan if you want a fresh template."
    return
  fi

  {
    echo "# ---------------------------------------------------------------"
    echo "# photo-map.txt — pair each website slot with one of your photos."
    echo "#"
    echo "# Put the filename (as it appears in images/_originals) after the |"
    echo "# Leave a slot blank to skip it — the current placeholder stays put."
    echo "# Lines starting with # are ignored."
    echo "#"
    echo "# Your photos:"
    for f in "${files[@]}"; do echo "#     $(basename "$f")"; done
    echo "# ---------------------------------------------------------------"
    echo ""
    printf '%s\n' "$SLOTS" | while IFS='|' read -r slot widths desc; do
      [ -n "$slot" ] || continue
      echo "# $desc"
      printf '%-26s | \n' "$slot"
      echo ""
    done
  } > "$MAP"

  ok "Wrote photo-map.txt"
  say ""
  say "Next: open photo-map.txt, put a filename after each |, then run:"
  say "  ${c_dim}./prep-photos.sh build${c_off}"
  say ""
}

# ---------------------------------------------------------------------------
# Normalise any input to a clean, upright, metadata-free full-size JPEG.
prepare_master() {
  local src="$1" master="$TMP/master.jpg"
  sips -s format jpeg -s formatOptions 100 "$src" --out "$master" >/dev/null 2>&1 \
    || die "Could not read $(basename "$src")"
  if command -v exiftool >/dev/null 2>&1; then
    # Bake in rotation, then strip everything (incl. GPS) but keep the colour profile.
    exiftool -q -overwrite_original -all= -tagsfromfile @ -icc_profile "$master" >/dev/null 2>&1 || true
  fi
  printf '%s' "$master"
}

cmd_build() {
  need sips sips
  need cwebp webp
  [ -f "$MAP" ] || die "No photo-map.txt yet. Run: ./prep-photos.sh scan"

  command -v exiftool >/dev/null 2>&1 \
    || warn "exiftool not found — GPS coordinates will NOT be stripped (brew install exiftool)"

  # Clear previously generated files. Without this, an earlier placeholder can
  # sit in place of a photo that failed to generate and look like it worked.
  local stale=0 f
  for f in "$OUT"/*-800.jpg "$OUT"/*-1600.jpg "$OUT"/*-2400.jpg \
           "$OUT"/*-800.webp "$OUT"/*-1600.webp "$OUT"/*-2400.webp; do
    [ -e "$f" ] || continue
    rm -f "$f"; stale=$((stale+1))
  done
  [ "$stale" -gt 0 ] && say "  ${c_dim}Cleared $stale previously generated file(s)${c_off}"
  say ""

  printf '%s\n' "$SLOTS" | while IFS='|' read -r slot widths desc; do
    [ -n "$slot" ] || continue

    # find this slot's line in the map
    local chosen
    chosen="$(grep -E "^[[:space:]]*${slot}[[:space:]]*\|" "$MAP" 2>/dev/null | head -1 | cut -d'|' -f2- | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' || true)"

    if [ -z "$chosen" ]; then
      printf '  %s— %-26s not mapped, keeping placeholder%s\n' "$c_dim" "$slot" "$c_off"
      continue
    fi

    local src="$SRC/$chosen"
    [ -f "$src" ] || { warn "$slot → '$chosen' not found in images/_originals — skipped"; continue; }

    local master; master="$(prepare_master "$src")"
    local dim; dim="$(px "$master")"
    local sw="${dim%% *}" sh="${dim##* }"

    printf '  %-26s ← %s %s(%sx%s)%s\n' "$slot" "$chosen" "$c_dim" "$sw" "$sh" "$c_off"

    local w first=1
    for w in $widths; do
      local target="$w"
      if [ "$sw" -lt "$w" ]; then
        if [ "$first" -eq 1 ]; then
          # Smallest size for this slot: emit at the original's own width rather
          # than leave the slot empty. Still never upscales.
          target="$sw"
          printf '      %s%-5s using original width %spx (no upscaling)%s\n' "$c_warn" "$w" "$sw" "$c_off"
        else
          printf '      %s%-5s skipped — original is only %spx wide%s\n' "$c_warn" "$w" "$sw" "$c_off"
          first=0
          continue
        fi
      fi
      first=0
      local jpg="$OUT/${slot}-${w}.jpg"
      local webp="$OUT/${slot}-${w}.webp"

      if ! sips --resampleWidth "$target" -s format jpeg -s formatOptions "$JPEG_QUALITY" \
                "$master" --out "$jpg" >/dev/null 2>&1; then
        printf '      %s%-5s FAILED to resize%s\n' "$c_err" "$w" "$c_off"
        continue
      fi

      local wb_txt="—"
      if cwebp -quiet -q "$WEBP_QUALITY" -m 6 "$jpg" -o "$webp" >/dev/null 2>&1 && [ -s "$webp" ]; then
        wb_txt="$(human "$(stat -f%z "$webp")")"
      else
        printf '      %s%-5s WebP encode failed — JPEG still written%s\n' "$c_warn" "$w" "$c_off"
        rm -f "$webp"
      fi

      printf '      %-5s jpg %-9s webp %-9s\n' "$w" "$(human "$(stat -f%z "$jpg")")" "$wb_txt"
    done

    # favicon comes off the hero
    if [ "$slot" = "hero-house-lavender" ]; then
      sips --resampleHeightWidth 64 64 -s format png "$master" --out "$OUT/favicon.png" >/dev/null 2>&1 || true
    fi
  done

  say ""
  sync_html
  say ""
  ok "Done. Hard-refresh the page to see them (Cmd+Shift+R)."
  say ""
  # LCP check. Phones with sizes="100vw" pull the 1600 variant, and every
  # browser that matters takes the WebP — so that's the file that decides LCP.
  local herow="$OUT/hero-house-lavender-1600.webp"
  [ -f "$herow" ] || herow="$OUT/hero-house-lavender-1600.jpg"
  if [ -f "$herow" ]; then
    local hb; hb="$(stat -f%z "$herow")"
    say "  Hero image mobile will load: $(basename "$herow") — $(human "$hb")"
    if [ "$hb" -gt 300000 ]; then
      warn "That's heavy for a 2.5s LCP on mobile data."
      say "  Try:  WEBP_QUALITY=62 JPEG_QUALITY=72 ./prep-photos.sh build"
    else
      ok "Comfortably inside your LCP budget."
    fi
  fi
}

# ---------------------------------------------------------------------------
# Keep index.html honest about what actually exists on disk:
#   - width/height match the real files, so nothing shifts as the page loads
#   - srcset/preload candidates that were never generated (because the original
#     wasn't big enough) are dropped, so no browser can request a missing file
sync_html() {
  local html="$HERE/index.html"
  [ -f "$html" ] || return 0
  command -v python3 >/dev/null 2>&1 || return 0

  python3 - "$html" "$OUT" <<'PY'
import re, subprocess, sys, os
html_path, img_dir = sys.argv[1], sys.argv[2]
html = original = open(html_path, encoding='utf-8').read()

def have(fname):
    return os.path.exists(os.path.join(img_dir, os.path.basename(fname)))

def dims(fname):
    p = os.path.join(img_dir, os.path.basename(fname))
    if not os.path.exists(p):
        return None
    out = subprocess.run(['sips', '-g', 'pixelWidth', '-g', 'pixelHeight', p],
                         capture_output=True, text=True).stdout
    w = re.search(r'pixelWidth:\s*(\d+)', out)
    h = re.search(r'pixelHeight:\s*(\d+)', out)
    return (int(w.group(1)), int(h.group(1))) if w and h else None

dropped, resized = [], 0

def rebuild_srcset(value):
    """Regenerate the candidate list from what is actually on disk, using each
    file's true width as its descriptor. Self-healing: sizes reappear by
    themselves once a large enough original is supplied."""
    m = re.search(r'([a-z0-9-]+)-\d+\.(jpg|webp)', value)
    if not m:
        return value
    slot, ext = m.groups()
    before = {os.path.basename(c.split()[0]) for c in value.split(',') if c.strip()}
    cands, after = [], set()
    for w in (800, 1600, 2400):
        fname = f'{slot}-{w}.{ext}'
        if not have(fname):
            continue
        d = dims(fname)
        cands.append(f'images/{fname} {d[0] if d else w}w')
        after.add(fname)
    for gone in sorted(before - after):
        dropped.append(gone)
    return ', '.join(cands)

def fix_attr(tag, attr):
    m = re.search(rf'{attr}="([^"]*)"', tag)
    if not m:
        return tag
    rebuilt = rebuild_srcset(m.group(1))
    if not rebuilt:                      # nothing on disk — drop the attribute
        return re.sub(rf'\s*{attr}="[^"]*"', '', tag)
    return tag[:m.start(1)] + rebuilt + tag[m.end(1):]

def fix_img(tag):
    global resized
    tag = fix_attr(tag, 'srcset')
    m = re.search(r'src="(images/[^"]+)"', tag)
    if m and (d := dims(m.group(1))):
        w, h = d
        new = re.sub(r'width="\d+"', f'width="{w}"', tag)
        new = re.sub(r'height="\d+"', f'height="{h}"', new)
        if new != tag:
            resized += 1
        tag = new
    return tag

# Unwrap any <picture> we generated on a previous run, so this is idempotent.
html = re.sub(r'<picture data-auto><source[^>]*>(<img\b[^>]*>)</picture>', r'\1', html)

html = re.sub(r'<source\b[^>]*>', lambda m: fix_attr(m.group(0), 'srcset'), html)
html = re.sub(r'<img\b[^>]*>', lambda m: fix_img(m.group(0)), html)
html = re.sub(r'<link\b[^>]*rel="preload"[^>]*>',
              lambda m: fix_attr(m.group(0), 'imagesrcset'), html)

# Absolute image URLs (og:image, twitter:image, schema.org, preload href) must
# point at a size that was actually generated — a broken og:image means a Meta
# ad with no preview picture.
def best_variant(url, prefer_largest=False):
    # Lightbox links and social/schema URLs always want the biggest file that
    # exists. An <img src> keeps its authored size and is only ever downgraded,
    # so gallery thumbnails can't silently become full-size downloads.
    if have(url) and not prefer_largest:
        return url
    m = re.search(r'(.*/)([a-z0-9-]+)-(\d+)\.(jpg|webp)$', url)
    if not m:
        return url
    prefix, slot, _, ext = m.groups()
    for w in (2400, 1600, 800):
        if have(f'{slot}-{w}.{ext}'):
            return f'{prefix}{slot}-{w}.{ext}'
    return url

repointed = set()
def fix_url(m, prefer_largest=False):
    old = m.group(1)
    new = best_variant(old, prefer_largest)
    if new != old:
        repointed.add((os.path.basename(old), os.path.basename(new)))
    return m.group(0).replace(old, new)

# lightbox links + absolute social/schema URLs: take the largest that exists
html = re.sub(r'href="(images/[a-z0-9-]+-\d+\.jpg)"',
              lambda m: fix_url(m, True), html)
html = re.sub(r'content="(https?://[^"]*images/[a-z0-9-]+-\d+\.(?:jpg|webp))"',
              lambda m: fix_url(m, True), html)
html = re.sub(r'"(https?://[^"]*images/[a-z0-9-]+-\d+\.(?:jpg|webp))"',
              lambda m: fix_url(m, True), html)
# <img src>: downgrade only
html = re.sub(r'src="(images/[a-z0-9-]+-\d+\.jpg)"',
              lambda m: fix_url(m, False), html)

# Serve WebP to browsers that take it, JPEG to those that don't. Only the hero
# was hand-authored as a <picture>; every other image is wrapped here so the
# WebP files we generate are actually used (roughly a third of the bytes).
wrapped = 0
def wrap(m):
    global wrapped
    tag = m.group(0)
    src = re.search(r'src="(images/[a-z0-9-]+-\d+)\.jpg"', tag)
    # skip the hero itself (already hand-authored inside a <picture>), but not
    # the gallery tile that happens to reuse the same photograph
    if not src or 'fetchpriority' in tag:
        return tag
    webp = f'{src.group(1)}.webp'
    if not have(webp):
        return tag
    wrapped += 1
    return f'<picture data-auto><source type="image/webp" srcset="{webp}">{tag}</picture>'

html = re.sub(r'<img\b[^>]*>', wrap, html)

# keep og:image:width/height truthful
hero = None
for w in (2400, 1600, 800):
    if have(f'hero-house-lavender-{w}.jpg'):
        hero = dims(f'hero-house-lavender-{w}.jpg')
        break
if hero:
    html = re.sub(r'(<meta property="og:image:width" content=")\d+(")', rf'\g<1>{hero[0]}\g<2>', html)
    html = re.sub(r'(<meta property="og:image:height" content=")\d+(")', rf'\g<1>{hero[1]}\g<2>', html)

if html != original:
    open(html_path, 'w', encoding='utf-8').write(html)

if resized:
    print(f"\033[32m✓\033[0m Synced width/height on {resized} <img> tag(s)")
if dropped:
    uniq = sorted(set(dropped))
    print(f"\033[32m✓\033[0m Pruned {len(uniq)} srcset entry(s) with no file on disk:")
    for d in uniq[:6]:
        print(f"    \033[2m{d}\033[0m")
    if len(uniq) > 6:
        print(f"    \033[2m…and {len(uniq)-6} more\033[0m")
if wrapped:
    print(f"\033[32m✓\033[0m Wrapped {wrapped} image(s) in <picture> so WebP is served where supported")
if repointed:
    print(f"\033[32m✓\033[0m Repointed {len(repointed)} URL(s) to a size that exists:")
    for old, new in sorted(repointed):
        print(f"    \033[2m{old} → {new}\033[0m")

# Anything still referenced but absent is a broken image — say so loudly.
missing = sorted({os.path.basename(u) for u in
                  re.findall(r'images/[a-z0-9-]+-\d+\.(?:jpg|webp)', html)
                  if not have(u)})
if missing:
    print(f"\033[31m✗\033[0m {len(missing)} image(s) referenced but MISSING:")
    for m_ in missing:
        print(f"    \033[31m{m_}\033[0m")

if not resized and not dropped and not repointed and not missing and not wrapped:
    print("\033[2m— index.html already matches the files on disk\033[0m")
PY
}

# ---------------------------------------------------------------------------
case "${1:-help}" in
  scan)  cmd_scan ;;
  build) cmd_build ;;
  *)
    cat <<EOF

  prep-photos.sh — get your photography ready for the web

    1.  Drop your full-size originals into:
          images/_originals/
        (JPEG, PNG, HEIC straight off an iPhone, or TIFF — all fine)

    2.  ./prep-photos.sh scan
        Lists what you've got and writes photo-map.txt

    3.  Open photo-map.txt and put a filename after each |

    4.  ./prep-photos.sh build
        Makes every size in JPEG + WebP, strips GPS, updates index.html

  Tuning: JPEG_QUALITY=72 ./prep-photos.sh build   (smaller files)

EOF
    ;;
esac
