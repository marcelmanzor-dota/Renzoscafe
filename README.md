# Renzo's Cafe & Pizzeria — website

A single-page site for Renzo's Cafe & Pizzeria (6900 N Federal Hwy, Boca Raton). The top of the page is a scroll-driven scene: a dough ball gets pressed out, sauced, topped, baked, drizzled with hot honey and sliced as you scroll. Every section below it also moves with your scroll.

## What moves, and where

| Section | What happens as you scroll |
| --- | --- |
| Intro | A curtain with the Renzo's wordmark lifts away while the scene loads |
| Build scene | The pizza is built step by step; captions rise out of a blur; film grain makes it feel photographed |
| Red ribbon | Two rows of text that speed up, skew and flip direction with how fast and which way you scroll |
| Gordon Ramsay quote | The section holds in place while the quote lights up word by word |
| Menu | Headlines rise line by line, a pill slides between tabs, dishes stagger in |
| Zoom gallery | Seven photos zoom apart to fill the screen (shows once photos are added, see below) |
| Our story | The dark section rises like a card, "Since 1989" drifts behind, numbers count up |
| Events | The photo opens out from a smaller window and drifts |
| Reviews | On desktop the section holds while the cards slide sideways; on phones they swipe |
| Visit | The map wipes open; the "Open now" dot pulses |
| Footer | A giant "Renzo's" rises letter by letter as you reach the bottom |

Visitors who have "reduce motion" turned on in their device settings get a calm version: no smooth scrolling, no pinning, everything visible.

## Files

- `index.html` — the page
- `css/styles.css` — all styling
- `js/main.js` — scrolling and every animation (photo list for the zoom gallery is at the top)
- `js/pizza.js` — the code-drawn pizza used in the build scene until real video frames are added
- `js/frames.js` — plays real video frames as you scroll (used automatically once `assets/hero/manifest.json` exists)
- `vendor/` — GSAP, ScrollTrigger, SplitText and Lenis, saved in the repo so the site does not depend on outside servers
- `tools/make-frames.sh` — turns a video into frames for the build scene

## Make the build scene photoreal (Higgsfield)

1. Generate two keyframe photos (16:9, Nano Banana Pro, 2k), same camera and lighting:
   - **Start:** "Overhead food photograph, a single ball of pizza dough resting on a dark floured stone counter, scattered flour, warm side light from the left, deep shadows, shallow depth of field, moody Italian pizzeria, dough positioned right of center, negative space on the left, 35mm, photorealistic"
   - **End:** "Same overhead shot: a finished Neapolitan-style pizza with crushed tomato sauce, torn fresh mozzarella, cupped pepperoni, fresh basil leaves and a glossy hot honey drizzle, blistered leopard-spotted crust, steam, on the same dark floured stone counter, same lighting, pizza right of center, photorealistic"
2. Make the video with Kling 3.0 (pro, 8 s, sound off), start image + end image, prompt: "Locked-off overhead camera. The dough is pressed and stretched into a round base, sauce is ladled in a spiral, mozzarella and pepperoni drop on, basil lands, the pizza bakes and blisters, hot honey drizzles over. Continuous single shot, no cuts, realistic food motion."
3. Optional for phones: the same in 9:16.
4. Download the videos and run `tools/make-frames.sh hero-16x9.mp4 hero-9x16.mp4`. Commit `assets/hero/`. The site switches to the real frames automatically. If a caption shows up too early or late, nudge the `steps` numbers in `assets/hero/manifest.json`.

For the zoom gallery, save seven photos in `assets/img/` and list them in `GALLERY` at the top of `js/main.js`.

## Put it online with GitHub Pages

1. Go to **Settings → Pages**, set **Source** to *Deploy from a branch*, choose the branch and **/ (root)**, then **Save**.
2. After a minute the site is live at `https://<your-username>.github.io/<repo-name>/`.

To preview locally, run `python3 -m http.server` in this folder and open http://localhost:8000 (opening `index.html` directly works too, but the real video frames only load through a server).

## Things loaded from other sites

- **Google Fonts** (Fraunces and Karla).
- The **dining room photo** in the Events section and **Chef Ramsay's audio clip** are linked from the current renzosbocaraton.com WordPress site. If that old site gets shut down, download both files into `assets/`, and change the two links in `index.html`:
  - photo: `.../uploads/2020/07/39512470_2084336931600384_8631313990556844032_n.jpg`
  - audio: `.../uploads/2023/06/01-Renzos.m4a`
- The **menu PDFs** and **catering menu** link to the current site too. Same idea: move them into the repo if the old site goes away.
- **Online ordering** links to their existing GetSauce ordering page.

## To confirm with the owner

- Prices and hours were taken from the restaurant's own site and its February 2026 dinner menu PDF. Double-check before launch.
- The header uses a text logo ("Renzo's" in italic serif). Swap in the real logo file if they want it.

## Credits

Animation libraries: [GSAP](https://gsap.com) (ScrollTrigger, SplitText) and [Lenis](https://lenis.darkroom.engineering). The zoom gallery and word-by-word quote are adapted from the 21st.dev "Zoom Parallax" and Motion "Scroll word reveal" components.
