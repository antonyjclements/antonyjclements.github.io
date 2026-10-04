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
    </div>
    <p class="game-instructions"></p>
    <div class="game-score"><span>SCORE <span id="score">00000</span></span><span>WAVE <span id="wave">01</span></span><span id="lives-display" hidden>LIVES <span id="lives">03</span></span></div>
    <canvas width="480" height="340" aria-label="Invader arcade. Destroy the descending enemies using the keyboard or buttons below."></canvas>
    <p class="game-status" role="status" aria-live="polite">Ready, player one?</p>
    <div class="game-controls"><button data-control="left" aria-label="Move left">←</button><button data-control="fire">FIRE</button><button data-control="right" aria-label="Move right">→</button><button class="restart-game">START</button></div>`;
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
    livesDisplay.hidden = selectedGame !== 'breakout';
    if (selectedGame === 'breakout') {
      spawnBricks();
      prepareBall();
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
      : 'Build zone defended. Go get them.';
    frame = requestAnimationFrame(loop);
  }
  function selectGame(game) {
    selectedGame = game;
    for (const button of gameButtons) {
      button.setAttribute('aria-pressed', String(button.dataset.game === game));
    }
    instructions.textContent = game === 'breakout'
      ? 'Break every brick. ← → or A / D to move the paddle · Space or LAUNCH to serve · Esc to exit'
      : 'Protect the build zone. ← → or A / D to move · Space or FIRE to fire · Esc to exit';
    actionButton.textContent = game === 'breakout' ? 'LAUNCH' : 'FIRE';
    canvas.setAttribute('aria-label', game === 'breakout'
      ? 'Breakout arcade. Bounce the ball off your paddle to clear the bricks. Use the keyboard or buttons below.'
      : 'Invader arcade. Destroy the descending enemies using the keyboard or buttons below.');
    prepareGame();
    restart.textContent = 'START';
    status.textContent = `Ready, player one? ${game === 'breakout' ? 'Breakout' : 'Invaders'} selected.`;
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
    if (selectedGame === 'breakout') {
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
      ctx.fillText(restart.textContent === 'START' ? 'READY, PLAYER ONE?' : selectedGame === 'breakout' ? 'GAME OVER' : 'BUILD ZONE OVERRUN', 240, 174);
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
  function loop(timestamp) {
    const dt = previous ? Math.min((timestamp - previous) / 1000, .04) : 0;
    previous = timestamp;
    if (!document.hidden && document.hasFocus()) {
      const movement = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0);
      const maxX = selectedGame === 'breakout' ? 400 : 452;
      const speed = selectedGame === 'breakout' ? 280 : 240;
      player = Math.max(0, Math.min(maxX, player + movement * speed * dt));
      if (selectedGame === 'breakout') updateBreakout(dt);
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
    if (control === 'fire' && selectedGame === 'breakout' && running && ball.waiting) serveRequested = true;
  }
  actionButton.addEventListener('click', () => {
    if (selectedGame === 'breakout' && running && ball.waiting) serveRequested = true;
  });
  const controls = { ArrowLeft: 'left', ArrowRight: 'right', a: 'left', d: 'right', ' ': 'fire' };
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
