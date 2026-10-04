(() => {
  'use strict';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const motionButton = document.querySelector('.motion-toggle');
  let pausedFX = reducedMotion.matches;
  function updateFX() {
    document.body.classList.toggle('no-motion', pausedFX);
    motionButton.setAttribute('aria-pressed', String(pausedFX));
    motionButton.setAttribute('aria-label', pausedFX ? 'Enable visual animations' : 'Pause visual animations');
    motionButton.querySelector('span').textContent = pausedFX ? 'OFF' : 'ON';
  }
  motionButton.addEventListener('click', () => { pausedFX = !pausedFX; updateFX(); });
  reducedMotion.addEventListener('change', (event) => { pausedFX = event.matches; updateFX(); });
  updateFX();

  const dialog = document.createElement('dialog');
  dialog.className = 'arcade-dialog';
  dialog.setAttribute('aria-labelledby', 'arcade-title');
  dialog.innerHTML = `<div class="arcade-heading"><h2 id="arcade-title">SECRET SECTOR</h2><button class="close-game" aria-label="Close arcade">✕</button></div>
    <div class="game-picker" role="group" aria-label="Choose a game">
      <button type="button" data-game="invaders" aria-pressed="true">01 / INVADERS</button>
      <button type="button" data-game="breakout" aria-pressed="false">02 / BREAKOUT</button>
      <button type="button" data-game="maze" aria-pressed="false">03 / MAZE CHASE</button>
    </div>
    <p class="game-instructions"></p>
    <div class="game-score"><span>SCORE <span id="score">00000</span></span><span>WAVE <span id="wave">01</span></span><span id="lives-display" hidden>LIVES <span id="lives">03</span></span></div>
    <canvas width="480" height="340" aria-label="Invader arcade. Destroy the descending enemies using the keyboard or buttons below."></canvas>
    <p class="game-status" role="status" aria-live="polite">Ready, player one?</p>
    <div class="game-controls"><button data-control="left" aria-label="Move left">←</button><button data-control="fire">FIRE</button><button data-control="right" aria-label="Move right">→</button><button data-control="up" aria-label="Move up" hidden>↑</button><button data-control="down" aria-label="Move down" hidden>↓</button><button class="restart-game">START</button></div>`;
  document.body.append(dialog);
  const canvas = dialog.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const scoreLabel = dialog.querySelector('#score');
  const waveLabel = dialog.querySelector('#wave');
  const status = dialog.querySelector('.game-status');
  const restart = dialog.querySelector('.restart-game');
  const instructions = dialog.querySelector('.game-instructions');
  const actionButton = dialog.querySelector('[data-control="fire"]');
  const livesLabel = dialog.querySelector('#lives');
  const livesDisplay = dialog.querySelector('#lives-display');
  const gameButtons = dialog.querySelectorAll('[data-game]');
  const keys = new Set();
  let selectedGame = 'invaders';
  let bricks, ball, lives;
  let serveRequested = false;
  const sprite = ['00100000100', '00010001000', '00111111100', '01101110110', '11111111111', '10111111101', '10100000101', '00011011000'];
  let player, enemies, shots, score, wave, direction, cooldown, frame, previous, running = false;
  function spawnWave() {
    enemies = Array.from({ length: 24 }, (_, i) => ({ x: 44 + (i % 8) * 50, y: 35 + Math.floor(i / 8) * 35 }));
    direction = 1;
    waveLabel.textContent = String(wave).padStart(2, '0');
  }
  function addScore(points) {
    score += points;
    scoreLabel.textContent = String(score).padStart(5, '0');
  }
  function prepareBall() {
    ball = { x: player + 40, y: 293, vx: 100, vy: -200, waiting: true };
  }
  function spawnBricks() {
    bricks = Array.from({ length: 40 }, (_, i) => ({
      x: 20 + (i % 8) * 56, y: 35 + Math.floor(i / 8) * 22,
      color: ['#af91ee', '#7bdde4', '#b7ef74', '#af91ee', '#7bdde4'][Math.floor(i / 8)],
    }));
    waveLabel.textContent = String(wave).padStart(2, '0');
  }
  function prepareGame() {
    cancelAnimationFrame(frame);
    running = false;
    serveRequested = false;
    keys.clear();
    player = selectedGame === 'breakout' ? 200 : 226;
    shots = [];
    score = 0;
    wave = 1;
    cooldown = 0;
    previous = 0;
    lives = 3;
    scoreLabel.textContent = '00000';
    livesLabel.textContent = '03';
    livesDisplay.hidden = selectedGame === 'invaders';
    if (selectedGame === 'breakout') {
      spawnBricks();
      prepareBall();
    } else if (selectedGame === 'maze') {
      spawnMaze();
    } else {
      spawnWave();
    }
  }
  function reset() {
    prepareGame();
    running = true;
    restart.textContent = 'RESTART';
    status.textContent = selectedGame === 'breakout'
      ? 'Move the paddle. Press Space or LAUNCH to serve.'
      : selectedGame === 'maze' ? 'Clear the pellets. Arrow keys or W / A / S / D to turn.' : 'Build zone defended. Go get them.';
    frame = requestAnimationFrame(loop);
  }
  function selectGame(game) {
    selectedGame = game;
    for (const button of gameButtons) {
      button.setAttribute('aria-pressed', String(button.dataset.game === game));
    }
    instructions.textContent = game === 'maze'
      ? 'Collect every pellet. Arrow keys or W / A / S / D to turn · Power pellets let you chase ghosts · Esc to exit'
      : game === 'breakout'
      ? 'Break every brick. ← → or A / D to move the paddle · Space or LAUNCH to serve · Esc to exit'
      : 'Protect the build zone. ← → or A / D to move · Space or FIRE to fire · Esc to exit';
    actionButton.hidden = game === 'maze';
    dialog.querySelector('[data-control="up"]').hidden = game !== 'maze';
    dialog.querySelector('[data-control="down"]').hidden = game !== 'maze';
    actionButton.textContent = game === 'breakout' ? 'LAUNCH' : 'FIRE';
    canvas.setAttribute('aria-label', game === 'maze'
      ? 'Maze Chase arcade. Collect pellets and avoid ghosts. Use four direction keys or the buttons below.'
      : game === 'breakout'
      ? 'Breakout arcade. Bounce the ball off your paddle to clear the bricks. Use the keyboard or buttons below.'
      : 'Invader arcade. Destroy the descending enemies using the keyboard or buttons below.');
    prepareGame();
    restart.textContent = 'START';
    status.textContent = `Ready, player one? ${game === 'maze' ? 'Maze Chase' : game === 'breakout' ? 'Breakout' : 'Invaders'} selected.`;
    draw();
  }
  function endGame() {
    running = false;
    keys.clear();
    status.textContent = `Game over. Score ${score}. Press restart for another run.`;
  }
  function draw() {
    ctx.fillStyle = '#101629'; ctx.fillRect(0, 0, 480, 340);
    ctx.fillStyle = '#384760';
    for (let i = 0; i < 45; i++) ctx.fillRect((i * 109) % 480, (i * 67) % 320, 2, 2);
    if (selectedGame === 'maze') {
      drawMaze();
    } else if (selectedGame === 'breakout') {
      for (const brick of bricks) {
        ctx.fillStyle = brick.color;
        ctx.fillRect(brick.x, brick.y, 50, 14);
        ctx.fillStyle = '#ffffff30';
        ctx.fillRect(brick.x, brick.y, 50, 3);
      }
      ctx.fillStyle = '#b7ef74';
      ctx.fillRect(player, 300, 80, 8);
      ctx.fillStyle = '#eef1f6';
      ctx.fillRect(ball.x - 4, ball.y - 4, 8, 8);
    } else {
      ctx.fillStyle = '#b7ef74';
      ctx.fillRect(player + 10, 300, 8, 7);
      ctx.fillRect(player + 4, 307, 20, 6);
      ctx.fillRect(player, 313, 28, 7);
      for (const enemy of enemies) {
        ctx.fillStyle = enemy.y < 70 ? '#af91ee' : '#7bdde4';
        sprite.forEach((row, y) => {
          for (let x = 0; x < row.length; x++) {
            if (row[x] === '1') ctx.fillRect(enemy.x + x * 2, enemy.y + y * 2, 2, 2);
          }
        });
      }
      ctx.fillStyle = '#b7ef74';
      for (const shot of shots) ctx.fillRect(shot.x, shot.y, 3, 9);
    }
    ctx.fillStyle = '#394a64'; ctx.fillRect(0, 329, 480, 1);
    if (!running) {
      ctx.fillStyle = '#0b101bdd'; ctx.fillRect(0, 132, 480, 70);
      ctx.fillStyle = '#b7ef74'; ctx.font = 'bold 21px monospace'; ctx.textAlign = 'center';
      ctx.fillText(restart.textContent === 'START' ? 'READY, PLAYER ONE?' : selectedGame === 'invaders' ? 'BUILD ZONE OVERRUN' : 'GAME OVER', 240, 174);
    }
  }
  function updateInvaders(dt) {
    cooldown -= dt;
    if (keys.has('fire') && cooldown <= 0) { shots.push({ x: player + 12, y: 299 }); cooldown = .2; }
    for (const shot of shots) shot.y -= 320 * dt;
    for (const enemy of enemies) enemy.x += direction * (22 + wave * 8) * dt;
    if (enemies.some(enemy => enemy.x < 8 || enemy.x > 450)) {
      direction *= -1;
      for (const enemy of enemies) { enemy.x = Math.max(8, Math.min(450, enemy.x)); enemy.y += 13; }
    }
    shots = shots.filter(shot => {
      const hit = enemies.findIndex(enemy => shot.x + 3 > enemy.x && shot.x < enemy.x + 22 && shot.y < enemy.y + 16 && shot.y + 9 > enemy.y);
      if (hit !== -1) { enemies.splice(hit, 1); addScore(100); return false; }
      return shot.y > -10;
    });
    if (!enemies.length) { wave++; shots = []; spawnWave(); status.textContent = `Wave ${wave}. Keep the build zone clear.`; }
    if (enemies.some(enemy => enemy.y + 16 >= 300)) { endGame(); }
  }
  function updateBreakout(dt) {
    if (ball.waiting) {
      ball.x = player + 40;
      if (!keys.has('fire') && !serveRequested) return;
      serveRequested = false;
      ball.waiting = false;
      status.textContent = 'Keep the ball in play. Clear every brick.';
    }
    // Small physics steps keep the ball from crossing a brick between frames.
    const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
    const step = dt / steps;
    for (let i = 0; i < steps; i++) {
      const oldX = ball.x;
      const oldY = ball.y;
      ball.x += ball.vx * step;
      ball.y += ball.vy * step;
      if (ball.x < 4 || ball.x > 476) {
        ball.x = Math.max(4, Math.min(476, ball.x));
        ball.vx *= -1;
      }
      if (ball.y < 4) { ball.y = 4; ball.vy = Math.abs(ball.vy); }
      if (ball.vy > 0 && oldY + 4 <= 300 && ball.y + 4 >= 300
          && ball.x + 4 > player && ball.x - 4 < player + 80) {
        const speed = Math.min(360, 224 + (wave - 1) * 20);
        const offset = Math.max(-1, Math.min(1, (ball.x - player - 40) / 40));
        ball.vx = offset * speed * .8;
        ball.vy = -Math.sqrt(speed * speed - ball.vx * ball.vx);
        ball.y = 296;
      }
      const hit = bricks.findIndex(brick => ball.x + 4 > brick.x && ball.x - 4 < brick.x + 50
        && ball.y + 4 > brick.y && ball.y - 4 < brick.y + 14);
      if (hit !== -1) {
        const brick = bricks[hit];
        if (oldX + 4 <= brick.x || oldX - 4 >= brick.x + 50) {
          ball.x = oldX < brick.x ? brick.x - 4 : brick.x + 54;
          ball.vx *= -1;
        } else {
          ball.y = oldY < brick.y ? brick.y - 4 : brick.y + 18;
          ball.vy *= -1;
        }
        bricks.splice(hit, 1);
        addScore(100);
        if (!bricks.length) {
          wave++;
          spawnBricks();
          prepareBall();
          status.textContent = `Wave ${wave}. Press Space or LAUNCH to serve.`;
          return;
        }
      }
      if (ball.y > 344) {
        lives--;
        livesLabel.textContent = String(lives).padStart(2, '0');
        if (!lives) { endGame(); return; }
        prepareBall();
        status.textContent = `${lives} ${lives === 1 ? 'life' : 'lives'} left. Press Space or LAUNCH to serve.`;
        return;
      }
    }
  }
  const mazeMap = [
    '#####################',
    '#o........#........o#',
    '#.###.###.#.###.###.#',
    '#...................#',
    '#.###.#.#####.#.###.#',
    '#.....#...#...#.....#',
    '#####.###...###.#####',
    '#.....#.......#.....#',
    '#.###.#.#####.#.###.#',
    '#...#...........#...#',
    '###.#.###.#.###.#.###',
    '#.....#...#...#.....#',
    '#.#####.#####.#####.#',
    '#o.................o#',
    '#####################',
  ];
  const mazeDirections = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
  let runner, ghosts, pellets, mazeDirection, queuedTurn, mazeClock, ghostClock, powerTime, graceTime;
  function mazeOpen(x, y) { return mazeMap[y]?.[x] !== undefined && mazeMap[y][x] !== '#'; }
  function resetMazeActors() {
    runner = { x: 1, y: 13 };
    ghosts = [{ x: 9, y: 7 }, { x: 11, y: 7 }, { x: 10, y: 6 }];
    mazeDirection = 'right';
    queuedTurn = null;
    mazeClock = 0;
    ghostClock = 0;
    powerTime = 0;
    graceTime = 2;
  }
  function spawnMaze() {
    pellets = new Map();
    mazeMap.forEach((row, y) => {
      [...row].forEach((cell, x) => { if (cell !== '#') pellets.set(`${x},${y}`, cell); });
    });
    resetMazeActors();
    waveLabel.textContent = String(wave).padStart(2, '0');
  }
  function mazeCollision() {
    if (graceTime > 0) return false;
    for (const ghost of ghosts) {
      if (ghost.rest) continue;
      if (ghost.x !== runner.x || ghost.y !== runner.y) continue;
      if (powerTime > 0) {
        addScore(200);
        ghost.x = 10;
        ghost.y = 7;
        ghost.rest = 1.5;
      } else {
        lives--;
        livesLabel.textContent = String(lives).padStart(2, '0');
        if (!lives) endGame();
        else {
          resetMazeActors();
          status.textContent = `${lives} ${lives === 1 ? 'life' : 'lives'} left. Watch the ghosts!`;
        }
        return true;
      }
    }
    return false;
  }
  function updateMaze(dt) {
    const wasPowered = powerTime > 0;
    powerTime = Math.max(0, powerTime - dt);
    graceTime = Math.max(0, graceTime - dt);
    if (wasPowered && !powerTime) status.textContent = 'Power wore off. Watch the ghosts!';
    mazeClock += dt;
    ghostClock += dt;
    if (mazeClock >= .13) {
      mazeClock -= .13;
      const wanted = mazeDirections[queuedTurn];
      if (wanted && mazeOpen(runner.x + wanted[0], runner.y + wanted[1])) {
        mazeDirection = queuedTurn;
        queuedTurn = null;
      }
      const [dx, dy] = mazeDirections[mazeDirection];
      if (mazeOpen(runner.x + dx, runner.y + dy)) { runner.x += dx; runner.y += dy; }
      const key = `${runner.x},${runner.y}`;
      if (pellets.has(key)) {
        if (pellets.get(key) === 'o') {
          powerTime = 8;
          addScore(50);
          status.textContent = 'Power up! Chase the ghosts for bonus points.';
        } else addScore(10);
        pellets.delete(key);
      }
      if (mazeCollision()) return;
      if (!pellets.size) {
        wave++;
        spawnMaze();
        status.textContent = `Wave ${wave}. A fresh maze awaits.`;
        return;
      }
    }
    for (const ghost of ghosts) ghost.rest = Math.max(0, (ghost.rest || 0) - dt);
    if (graceTime > 0 || ghostClock < (powerTime > 0 ? .34 : Math.max(.17, .27 - wave * .01))) return;
    ghostClock = 0;
    // Distances through corridors make ghosts chase around walls rather than through them.
    const distances = new Map([[`${runner.x},${runner.y}`, 0]]);
    const queue = [{ ...runner }];
    for (let i = 0; i < queue.length; i++) {
      const cell = queue[i];
      for (const [dx, dy] of Object.values(mazeDirections)) {
        const x = cell.x + dx, y = cell.y + dy, key = `${x},${y}`;
        if (!mazeOpen(x, y) || distances.has(key)) continue;
        distances.set(key, distances.get(`${cell.x},${cell.y}`) + 1);
        queue.push({ x, y });
      }
    }
    ghosts.forEach((ghost, index) => {
      if (ghost.rest) return;
      const choices = Object.values(mazeDirections).map(([dx, dy]) => ({ x: ghost.x + dx, y: ghost.y + dy }))
        .filter(cell => mazeOpen(cell.x, cell.y));
      choices.sort((a, b) => (distances.get(`${a.x},${a.y}`) - distances.get(`${b.x},${b.y}`)) * (powerTime > 0 ? -1 : 1));
      const best = choices[0];
      // Let equal routes differ slightly so the three ghosts do not stack together.
      const ties = choices.filter(cell => distances.get(`${cell.x},${cell.y}`) === distances.get(`${best.x},${best.y}`));
      Object.assign(ghost, ties[index % ties.length]);
    });
    mazeCollision();
  }
  function drawMaze() {
    const tile = 20, left = 30, top = 20;
    mazeMap.forEach((row, y) => {
      [...row].forEach((cell, x) => {
        const px = left + x * tile, py = top + y * tile;
        if (cell === '#') {
          ctx.fillStyle = '#365fba'; ctx.fillRect(px + 1, py + 1, 18, 18);
          ctx.fillStyle = '#16254b'; ctx.fillRect(px + 3, py + 3, 14, 14);
        } else if (pellets.has(`${x},${y}`)) {
          const size = cell === 'o' ? 8 : 3;
          ctx.fillStyle = cell === 'o' ? '#b7ef74' : '#f1d8ac';
          ctx.fillRect(px + 10 - size / 2, py + 10 - size / 2, size, size);
        }
      });
    });
    const angle = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[mazeDirection];
    const px = left + runner.x * tile + 10, py = top + runner.y * tile + 10;
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath(); ctx.moveTo(px, py);
    ctx.arc(px, py, 8, angle + .35, angle + Math.PI * 2 - .35);
    ctx.closePath(); ctx.fill();
    ghosts.forEach((ghost, index) => {
      const x = left + ghost.x * tile + 3, y = top + ghost.y * tile + 3;
      ctx.fillStyle = powerTime > 0 ? '#6775e8' : ['#f27c9f', '#7bdde4', '#af91ee'][index];
      ctx.fillRect(x + 2, y, 10, 3); ctx.fillRect(x, y + 3, 14, 9);
      ctx.fillRect(x, y + 12, 3, 3); ctx.fillRect(x + 5, y + 12, 3, 3); ctx.fillRect(x + 11, y + 12, 3, 3);
      ctx.fillStyle = '#eef1f6'; ctx.fillRect(x + 2, y + 4, 4, 4); ctx.fillRect(x + 8, y + 4, 4, 4);
      ctx.fillStyle = '#101629'; ctx.fillRect(x + 3, y + 5, 2, 2); ctx.fillRect(x + 9, y + 5, 2, 2);
    });
  }

  function loop(timestamp) {
    const dt = previous ? Math.min((timestamp - previous) / 1000, .04) : 0;
    previous = timestamp;
    if (!document.hidden && document.hasFocus()) {
      const movement = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0);
      const maxX = selectedGame === 'breakout' ? 400 : 452;
      const speed = selectedGame === 'breakout' ? 280 : 240;
      if (selectedGame !== 'maze') player = Math.max(0, Math.min(maxX, player + movement * speed * dt));
      if (selectedGame === 'maze') updateMaze(dt);
      else if (selectedGame === 'breakout') updateBreakout(dt);
      else updateInvaders(dt);
    }
    draw();
    if (running && dialog.open) frame = requestAnimationFrame(loop);
  }
  function openArcade() {
    if (dialog.open) return;
    dialog.showModal();
    selectGame(selectedGame);
    gameButtons[0].focus();
  }
  dialog.querySelector('.close-game').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { running = false; keys.clear(); cancelAnimationFrame(frame); });
  restart.addEventListener('click', reset);
  for (const button of gameButtons) button.addEventListener('click', () => selectGame(button.dataset.game));
  document.querySelectorAll('.secret-trigger').forEach(button => button.addEventListener('click', openArcade));
  const code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let sequence = [], lastKey = 0;
  function pressControl(control) {
    keys.add(control);
    if (selectedGame === 'maze' && mazeDirections[control]) queuedTurn = control;
    if (control === 'fire' && selectedGame === 'breakout' && running && ball.waiting) serveRequested = true;
  }
  actionButton.addEventListener('click', () => {
    if (selectedGame === 'breakout' && running && ball.waiting) serveRequested = true;
  });
  const controls = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', w: 'up', s: 'down', a: 'left', d: 'right', ' ': 'fire' };
  document.addEventListener('keydown', event => {
    if (event.target.closest('input, textarea, select, [contenteditable="true"]') || event.ctrlKey || event.metaKey || event.altKey) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (dialog.open) {
      if (controls[key]) { event.preventDefault(); pressControl(controls[key]); }
      return;
    }
    if (event.repeat) return;
    if (Date.now() - lastKey > 3000) sequence = [];
    lastKey = Date.now(); sequence.push(key); sequence = sequence.slice(-code.length);
    if (sequence.every((value, i) => value === code[i])) event.preventDefault();
    if (sequence.length === code.length && sequence.every((value, i) => value === code[i])) { sequence = []; openArcade(); }
  });
  document.addEventListener('keyup', event => keys.delete(controls[event.key.length === 1 ? event.key.toLowerCase() : event.key]));
  window.addEventListener('blur', () => { keys.clear(); serveRequested = false; });
  document.addEventListener('visibilitychange', () => { keys.clear(); serveRequested = false; previous = 0; });
  dialog.querySelectorAll('[data-control]').forEach(button => {
    button.addEventListener('pointerdown', event => { event.preventDefault(); button.setPointerCapture(event.pointerId); pressControl(button.dataset.control); });
    const release = () => keys.delete(button.dataset.control);
    button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release); button.addEventListener('lostpointercapture', release);
    button.addEventListener('keydown', event => { if (event.key === 'Enter') pressControl(button.dataset.control); });
    button.addEventListener('keyup', event => { if (event.key === 'Enter') keys.delete(button.dataset.control); });
  });
})();
