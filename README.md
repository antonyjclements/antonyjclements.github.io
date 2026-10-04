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
