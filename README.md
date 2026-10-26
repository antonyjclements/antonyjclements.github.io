# antonyjclements.github.io

Personal blog of Antony Clements — notes on building software.

Published via GitHub Pages. New posts go in `posts/`; update `index.html`, `feed.xml` (including `lastBuildDate`), and `sitemap.xml`. The Experiments section lives in `experiments/`; keep it discoverable from the shared navigation and home page.

## Local preview

Run `python3 -m http.server 8000` from the repository root, then open
`http://localhost:8000`. No build step or external dependencies are needed.

## Arcade theme

The home page and essays share `styles.css` and `arcade.js`. Original pixel art
lives in `assets/`. Add the shared header, footer, stylesheet, and deferred script
when creating a new post.

Enter **↑ ↑ ↓ ↓ ← → ← → B A** to unlock the secret arcade, or select **INSERT
COIN** in the footer (also works on touch screens). Pick **Invaders**,
**Breakout**, or **Maze Chase**, then press **START**. Move with arrow keys or A/D. In Invaders,
Space fires; in Breakout, Space or **LAUNCH** serves the ball. Breakout has three
lives, paddle-angle rebounds, and successive brick waves. Touch controls are
below each game. In Maze Chase, use arrows or WASD to collect pellets and avoid
ghosts; power pellets let you eat ghosts for eight seconds. Clear the maze to
advance to the next wave. Switching games starts a fresh session. Escape closes the arcade. The FX button pauses decorative animation; the theme also respects
reduced-motion preferences. The game pauses when the tab is hidden or unfocused.

Run arcade regression checks with `node --test tests/arcade.test.cjs`.

## Page metadata

Keep the canonical URL, Open Graph and Twitter metadata in each page’s head.
Use absolute production URLs for metadata and root-relative URLs for internal
navigation. The shared link preview image is `assets/social-preview.png` (1200 × 630).
Keep publication dates consistent between the article, home listing, and feed.
`404.html` is the GitHub Pages error page; exclude it from the sitemap.

Run metadata and discovery checks with `python3 -m unittest discover -s tests -p "test_*.py"`.

## Editorial layout

The home page features the newest essay above a numbered writing list and a
separate experiments band. When adding a post, update its estimated reading
time in the home listing and article metadata, and maintain the previous/next
article links. Essays use serif body text and share the header and arcade footer.
