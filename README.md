# La Cour des Lavandes — single-property landing site

Static site (no build step). Deploy the folder as-is to Netlify, Vercel, Cloudflare
Pages, or any web host.

## Before launch — checklist

1. **Domain**: search-and-replace `https://YOUR-DOMAIN.com` in `index.html`,
   `privacy.html`, `robots.txt`, `sitemap.xml`.
2. **Images**: drop your originals into `images/_originals/`, then run
   `./prep-photos.sh scan` and `./prep-photos.sh build`. See
   `images/README.md` for the walkthrough.
3. **Meta Pixel**: set `META_PIXEL_ID` at the top of `js/main.js`. The pixel only
   loads after cookie consent (GDPR-safe); the form fires a `Lead` event, and
   email-link clicks fire `Contact` events.
4. **Form backend**: set `FORM_ENDPOINT` in `js/main.js` (Formspree, Basin,
   Netlify Forms, or your own handler). Until set, submissions simulate success
   so the page can be reviewed.
5. **Email address**: replace `hello@YOUR-DOMAIN.com` throughout `index.html`
   (6 links), and fill in the owner/controller details in `privacy.html`.
6. **Airbnb link**: replace `https://www.airbnb.com/YOUR-LISTING` in the income
   section with the real listing URL.
7. **Photo credits**: several surrounding-area photographs look like they came
   from Wikimedia Commons (`FR_79_Couture_d'Argenson_-_Place`, `Panorama_Niort`,
   `Thouars_-_Hotel_de_Ville_02` and similar). Those licences usually require
   attribution. Confirm each one's licence and fill in the credit line in the
   footer, or swap them for your own photographs, before running ads.
6. **Map pin**: verify the marker position in the OpenStreetMap iframe
   (`index.html`, Location section) matches the actual property, or keep it
   village-centre for privacy.

## Meta ads notes

- UTM parameters are captured into hidden form fields and persisted in
  `sessionStorage`, so the lead records which ad/campaign produced it.
- The `Lead` event on form submit is the conversion to optimise the campaign on.
- No interstitials/pop-ups; cookie notice is a small non-blocking bar.
- Hero image is preloaded with `fetchpriority=high` for LCP; everything below
  the fold lazy-loads.

## Structure

- `index.html` — the whole landing page (hero → story → gallery → property
  chapters → grounds → location/map → income → key facts → enquiry → footer)
- `privacy.html` — GDPR privacy policy (noindex)
- `css/styles.css`, `js/main.js` — no frameworks, no dependencies
- `robots.txt`, `sitemap.xml`
