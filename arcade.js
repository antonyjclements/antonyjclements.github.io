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
    <p>You found the arcade. Protect the build zone.<br>← → or A / D to move · Space to fire · Esc to exit</p>
    <div class="game-score"><span>SCORE <span id="score">00000</span></span><span>WAVE <span id="wave">01</span></span></div>
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
  const keys = new Set();
  const sprite = ['00100000100', '00010001000', '00111111100', '01101110110', '11111111111', '10111111101', '10100000101', '00011011000'];
  let player, enemies, shots, score, wave, direction, cooldown, frame, previous, running = false;
  function spawnWave() {
    enemies = Array.from({ length: 24 }, (_, i) => ({ x: 44 + (i % 8) * 50, y: 35 + Math.floor(i / 8) * 35 }));
    direction = 1;
    waveLabel.textContent = String(wave).padStart(2, '0');
  }
  function reset() {
    cancelAnimationFrame(frame);
    player = 226; shots = []; score = 0; wave = 1; cooldown = 0; previous = 0;
    keys.clear(); scoreLabel.textContent = '00000'; spawnWave();
    running = true; restart.textContent = 'RESTART'; status.textContent = 'Build zone defended. Go get them.';
    frame = requestAnimationFrame(loop);
  }
  function draw() {
    ctx.fillStyle = '#101629'; ctx.fillRect(0, 0, 480, 340);
    ctx.fillStyle = '#384760';
    for (let i = 0; i < 45; i++) ctx.fillRect((i * 109) % 480, (i * 67) % 320, 2, 2);
    ctx.fillStyle = '#b7ef74';
    ctx.fillRect(player + 10, 300, 8, 7); ctx.fillRect(player + 4, 307, 20, 6); ctx.fillRect(player, 313, 28, 7);
    for (const enemy of enemies) {
      ctx.fillStyle = enemy.y < 70 ? '#af91ee' : '#7bdde4';
      sprite.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] === '1') ctx.fillRect(enemy.x + x * 2, enemy.y + y * 2, 2, 2); });
    }
    ctx.fillStyle = '#b7ef74'; for (const shot of shots) ctx.fillRect(shot.x, shot.y, 3, 9);
    ctx.fillStyle = '#394a64'; ctx.fillRect(0, 329, 480, 1);
    if (!running) {
      ctx.fillStyle = '#0b101bdd'; ctx.fillRect(0, 132, 480, 70);
      ctx.fillStyle = '#b7ef74'; ctx.font = 'bold 21px monospace'; ctx.textAlign = 'center';
      ctx.fillText(restart.textContent === 'START' ? 'READY, PLAYER ONE?' : 'BUILD ZONE OVERRUN', 240, 174);
    }
  }
  function loop(timestamp) {
    const dt = previous ? Math.min((timestamp - previous) / 1000, .04) : 0;
    previous = timestamp;
    if (!document.hidden && document.hasFocus()) {
      const movement = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0);
      player = Math.max(0, Math.min(452, player + movement * 240 * dt));
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
        if (hit !== -1) { enemies.splice(hit, 1); score += 100; scoreLabel.textContent = String(score).padStart(5, '0'); return false; }
        return shot.y > -10;
      });
      if (!enemies.length) { wave++; shots = []; spawnWave(); status.textContent = `Wave ${wave}. Keep the build zone clear.`; }
      if (enemies.some(enemy => enemy.y + 16 >= 300)) { running = false; keys.clear(); status.textContent = `Game over. Score ${score}. Press restart for another run.`; }
    }
    draw();
    if (running && dialog.open) frame = requestAnimationFrame(loop);
  }
  function openArcade() {
    if (dialog.open) return;
    dialog.showModal();
    restart.textContent = 'START';
    player = 226; shots = []; enemies = []; score = 0; wave = 1; running = false;
    scoreLabel.textContent = '00000'; spawnWave(); draw();
    status.textContent = 'Ready, player one?'; restart.focus();
  }
  dialog.querySelector('.close-game').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { running = false; keys.clear(); cancelAnimationFrame(frame); });
  restart.addEventListener('click', reset);
  document.querySelectorAll('.secret-trigger').forEach(button => button.addEventListener('click', openArcade));
  const code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let sequence = [], lastKey = 0;
  const controls = { ArrowLeft: 'left', ArrowRight: 'right', a: 'left', d: 'right', ' ': 'fire' };
  document.addEventListener('keydown', event => {
    if (event.target.closest('input, textarea, select, [contenteditable="true"]') || event.ctrlKey || event.metaKey || event.altKey) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (dialog.open) {
      if (controls[key]) { event.preventDefault(); keys.add(controls[key]); }
      return;
    }
    if (event.repeat) return;
    if (Date.now() - lastKey > 3000) sequence = [];
    lastKey = Date.now(); sequence.push(key); sequence = sequence.slice(-code.length);
    if (sequence.every((value, i) => value === code[i])) event.preventDefault();
    if (sequence.length === code.length && sequence.every((value, i) => value === code[i])) { sequence = []; openArcade(); }
  });
  document.addEventListener('keyup', event => keys.delete(controls[event.key.length === 1 ? event.key.toLowerCase() : event.key]));
  window.addEventListener('blur', () => keys.clear());
  document.addEventListener('visibilitychange', () => { keys.clear(); previous = 0; });
  dialog.querySelectorAll('[data-control]').forEach(button => {
    button.addEventListener('pointerdown', event => { event.preventDefault(); button.setPointerCapture(event.pointerId); keys.add(button.dataset.control); });
    const release = () => keys.delete(button.dataset.control);
    button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release); button.addEventListener('lostpointercapture', release);
    button.addEventListener('keydown', event => { if (event.key === 'Enter') keys.add(button.dataset.control); });
    button.addEventListener('keyup', event => { if (event.key === 'Enter') keys.delete(button.dataset.control); });
  });
})();
