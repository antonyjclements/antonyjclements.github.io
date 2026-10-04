# antonyjclements.github.io

Personal blog of Antony Clements — notes on AI-augmented software engineering.

Published via GitHub Pages. New posts go in `posts/`; update `index.html` and `feed.xml`.

## Local preview

Run `python3 -m http.server 8000` from the repository root, then open
`http://localhost:8000`. No build step or external dependencies are needed.

## Arcade theme

The home page and essays share `styles.css` and `arcade.js`. Original pixel art
lives in `assets/`. Add the shared header, footer, stylesheet, and deferred script
when creating a new post.

Enter **↑ ↑ ↓ ↓ ← → ← → B A** to unlock the invader arcade, or select **INSERT
COIN** in the footer (also works on touch screens). Start the game, move with
arrow keys or A/D, and fire with Space. Touch controls are below the game. Escape
closes it. The FX button pauses decorative animation; the theme also respects
reduced-motion preferences. The game pauses when the tab is hidden or unfocused.

Run arcade regression checks with `node --test tests/arcade.test.cjs`.
