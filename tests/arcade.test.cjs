const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function arcade() {
  class Element {
    constructor() { this.listeners = {}; this.attrs = {}; this.textContent = ''; this.dataset = {}; this.open = false; }
    addEventListener(type, callback) { (this.listeners[type] ||= []).push(callback); }
    emit(type, values = {}) {
      const event = { target: { closest: () => null }, preventDefault() {}, ...values };
      for (const callback of this.listeners[type] || []) callback(event);
    }
    setAttribute(name, value) { this.attrs[name] = value; }
    querySelector(selector) { return elements[selector]; }
    querySelectorAll(selector) { return selector === '[data-game]' ? gameButtons : touchButtons; }
    focus() {}
    showModal() { this.open = true; }
    close() { this.open = false; this.emit('close'); }
    setPointerCapture() {}
  }
  const elements = Object.fromEntries(['.motion-toggle', 'span', '#score', '#wave', '.game-status', '.restart-game', '.close-game', '.game-instructions', '[data-control="fire"]', '[data-control="up"]', '[data-control="down"]', '#lives', '#lives-display', 'canvas'].map(selector => [selector, new Element()]));
  const drawn = [];
  const painted = {};
  elements.canvas.getContext = () => ({
    fillRect(x, y, width, height) {
      if (width === 480 && height === 340) { painted.walls = []; painted.ghosts = []; }
      if (this.fillStyle === '#365fba' && width === 18) painted.walls.push(`${Math.round((x - 31) / 20)},${Math.round((y - 21) / 20)}`);
      if (['#6775e8', '#f27c9f', '#7bdde4', '#af91ee'].includes(this.fillStyle) && width === 10 && height === 3)
        painted.ghosts.push({ x: Math.round((x - 35) / 20), y: Math.round((y - 23) / 20) });
      if (this.fillStyle === '#eef1f6' && width === 8 && height === 8) painted.ball = { x: x + 4, y: y + 4 };
      if (this.fillStyle === '#b7ef74' && width === 80 && height === 8) painted.paddle = { x, y };
    },
    beginPath() {}, moveTo() {}, arc(x,y) { painted.runner = { x: Math.round((x - 40) / 20), y: Math.round((y - 30) / 20) }; }, closePath() {}, fill() {},
    fillText(text) { drawn.push(text); },
  });
  const dialog = new Element();
  const trigger = new Element();
  const gameButtons = ['invaders', 'breakout', 'maze'].map(game => { const button = new Element(); button.dataset.game = game; return button; });
  const touchButtons = ['left', 'fire', 'right', 'up', 'down'].map(control => { const button = new Element(); button.dataset.control = control; return button; });
  const doc = new Element();
  doc.querySelector = selector => elements[selector];
  doc.querySelectorAll = () => [trigger];
  doc.createElement = () => dialog;
  const classes = new Set();
  doc.body = { append() {}, classList: { toggle(name, on) { if (on) classes.add(name); else classes.delete(name); } } };
  doc.hasFocus = () => true;
  const win = new Element();
  win.matchMedia = () => ({ matches: false, addEventListener() {} });
  let callback, timestamp = 0;
  vm.runInNewContext(fs.readFileSync('arcade.js', 'utf8'), { window: win, document: doc, Date, requestAnimationFrame(fn) { callback = fn; return 1; }, cancelAnimationFrame() { callback = null; } });
  const tick = (count = 1) => { for (let i = 0; i < count && callback; i++) { const fn = callback; callback = null; timestamp += 16; fn(timestamp); } };
  const key = value => doc.emit('keydown', { key: value });
  return { elements, dialog, trigger, touchButtons, gameButtons, doc, win, classes, drawn, painted, tick, key, hasFrame: () => !!callback };
}

test('Konami code opens the arcade; an incorrect sequence does not', () => {
  const a = arcade();
  for (const key of ['ArrowUp', 'ArrowDown', 'b', 'a']) a.key(key);
  assert.equal(a.dialog.open, false);
  for (const key of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'B', 'A']) a.key(key);
  assert.equal(a.dialog.open, true);
  assert.equal(a.elements['.restart-game'].textContent, 'START');
});

test('footer opens game, firing scores hits, restart resets, close cancels animation', () => {
  const a = arcade();
  a.trigger.emit('click'); a.elements['.restart-game'].emit('click');
  a.key(' '); a.tick(800);
  assert.ok(Number(a.elements['#score'].textContent) > 0);
  a.elements['.restart-game'].emit('click');
  assert.equal(a.elements['#score'].textContent, '00000');
  assert.equal(a.elements['#wave'].textContent, '01');
  a.elements['.close-game'].emit('click');
  assert.equal(a.dialog.open, false); assert.equal(a.hasFrame(), false);
});

test('touch firing works and hidden tabs pause gameplay', () => {
  const a = arcade();
  a.trigger.emit('click'); a.elements['.restart-game'].emit('click');
  a.touchButtons[1].emit('pointerdown', { pointerId: 1 });
  a.doc.hidden = true; a.tick(800);
  assert.equal(a.elements['#score'].textContent, '00000');
  a.doc.hidden = false; a.tick(800);
  assert.ok(Number(a.elements['#score'].textContent) > 0);
  a.touchButtons[1].emit('pointerup');
});

test('FX toggle updates animation and accessibility state', () => {
  const a = arcade();
  a.elements['.motion-toggle'].emit('click');
  assert.equal(a.classes.has('no-motion'), true);
  assert.equal(a.elements['.motion-toggle'].attrs['aria-pressed'], 'true');
  assert.equal(a.elements.span.textContent, 'OFF');
});

test('an untouched game ends when invaders reach the build zone', () => {
  const a = arcade();
  a.trigger.emit('click'); a.elements['.restart-game'].emit('click'); a.tick(30000);
  assert.match(a.elements['.game-status'].textContent, /Game over/);
  assert.equal(a.hasFrame(), false);
  assert.equal(a.drawn.at(-1), 'BUILD ZONE OVERRUN');
});


test('game picker switches to Breakout, updates instructions and starts a fresh session', () => {
  const a = arcade();
  a.trigger.emit('click'); a.elements['.restart-game'].emit('click');
  a.key(' '); a.tick(800);
  a.gameButtons[1].emit('click');
  assert.equal(a.gameButtons[1].attrs['aria-pressed'], 'true');
  assert.equal(a.gameButtons[0].attrs['aria-pressed'], 'false');
  assert.match(a.elements['.game-instructions'].textContent, /paddle/i);
  assert.equal(a.elements['#score'].textContent, '00000');
  assert.equal(a.elements['#lives'].textContent, '03');
  assert.equal(a.elements['.restart-game'].textContent, 'START');
  assert.equal(a.hasFrame(), false);
});

test('Breakout launch breaks bricks and awards points', () => {
  const a = arcade();
  a.trigger.emit('click'); a.gameButtons[1].emit('click');
  assert.match(a.elements.canvas.attrs['aria-label'], /Breakout/);
  a.elements['.restart-game'].emit('click');
  a.tick(200);
  assert.equal(a.elements['#score'].textContent, '00000');
  a.touchButtons[1].emit('pointerdown', { pointerId: 1 });
  a.tick(200);
  assert.ok(Number(a.elements['#score'].textContent) > 0);
});

test('Breakout runs out of lives, restarts, and switches back to Invaders', () => {
  const a = arcade();
  a.trigger.emit('click'); a.gameButtons[1].emit('click');
  a.elements['.restart-game'].emit('click'); a.key(' '); a.key('ArrowLeft'); a.tick(6000);
  assert.equal(a.elements['#lives'].textContent, '00');
  assert.match(a.elements['.game-status'].textContent, /Game over/);
  assert.equal(a.hasFrame(), false);
  a.elements['.restart-game'].emit('click');
  assert.equal(a.elements['#lives'].textContent, '03');
  assert.equal(a.elements['#score'].textContent, '00000');
  a.gameButtons[0].emit('click');
  assert.match(a.elements['.game-instructions'].textContent, /fire/i);
  assert.equal(a.elements['#lives-display'].hidden, true);
  a.elements['.restart-game'].emit('click'); a.key(' '); a.tick(800);
  assert.ok(Number(a.elements['#score'].textContent) > 0);
});


test('Breakout paddle rebounds keep the ball in play and clearing bricks advances the wave', () => {
  const a = arcade();
  a.trigger.emit('click'); a.gameButtons[1].emit('click');
  a.elements['.restart-game'].emit('click'); a.key(' ');
  for (let i = 0; i < 60000 && a.elements['#wave'].textContent === '01'; i++) {
    // Play through the public controls using the currently painted ball and paddle.
    const offset = Math.sin(i / 160) * 18;
    const target = a.painted.ball.x - 40 + offset;
    a.doc.emit('keyup', { key: 'ArrowLeft' });
    a.doc.emit('keyup', { key: 'ArrowRight' });
    if (a.painted.paddle.x > target + 2) a.key('ArrowLeft');
    else if (a.painted.paddle.x < target - 2) a.key('ArrowRight');
    a.tick();
  }
  assert.equal(a.elements['#wave'].textContent, '02');
  assert.equal(a.elements['#score'].textContent, '04000');
  assert.ok(Number(a.elements['#lives'].textContent) > 0);
});

test('Breakout pauses while unfocused and closing cancels its frame', () => {
  const a = arcade();
  a.trigger.emit('click'); a.gameButtons[1].emit('click');
  a.elements['.restart-game'].emit('click'); a.key(' ');
  a.doc.hasFocus = () => false; a.tick(800);
  assert.equal(a.elements['#score'].textContent, '00000');
  assert.equal(a.elements['#lives'].textContent, '03');
  a.doc.hasFocus = () => true; a.tick(200);
  assert.ok(Number(a.elements['#score'].textContent) > 0);
  a.dialog.close();
  assert.equal(a.hasFrame(), false);
});

test('a quick Space tap or LAUNCH click serves Breakout without holding a button', () => {
  for (const launch of ['space', 'click']) {
    const a = arcade();
    a.trigger.emit('click'); a.gameButtons[1].emit('click');
    a.elements['.restart-game'].emit('click');
    if (launch === 'space') { a.key(' '); a.doc.emit('keyup', { key: ' ' }); }
    else a.elements['[data-control="fire"]'].emit('click');
    a.tick(200);
    assert.ok(Number(a.elements['#score'].textContent) > 0, launch);
  }
});


test('Maze Chase selects its own controls and collects pellets using a quick direction tap', () => {
  const a = arcade();
  a.trigger.emit('click'); a.gameButtons[2].emit('click');
  assert.match(a.elements.canvas.attrs['aria-label'], /Maze Chase/);
  assert.equal(a.elements['[data-control="fire"]'].hidden, true);
  assert.equal(a.elements['[data-control="up"]'].hidden, false);
  a.elements['.restart-game'].emit('click');
  a.key('ArrowRight'); a.doc.emit('keyup', { key: 'ArrowRight' }); a.tick(35);
  assert.ok(Number(a.elements['#score'].textContent) >= 20);
  assert.equal(a.elements['#lives'].textContent, '03');
});

test('Maze Chase supports touch turns, wall collisions, power pellets and restart', () => {
  const a = arcade();
  a.trigger.emit('click'); a.gameButtons[2].emit('click');
  a.elements['.restart-game'].emit('click');
  a.touchButtons[3].emit('pointerdown', { pointerId: 1 }); a.touchButtons[3].emit('pointerup');
  a.tick(40);
  assert.ok(Number(a.elements['#score'].textContent) > 0);
  const wallScore = a.elements['#score'].textContent;
  a.tick(20);
  assert.equal(a.elements['#score'].textContent, wallScore);
  a.elements['.restart-game'].emit('click');
  a.key('ArrowRight'); a.tick(160);
  assert.match(a.elements['.game-status'].textContent, /Power/);
  a.elements['.restart-game'].emit('click');
  assert.equal(a.elements['#score'].textContent, '00000');
  assert.equal(a.elements['#lives'].textContent, '03');
  a.gameButtons[0].emit('click');
  assert.equal(a.elements['[data-control="fire"]'].hidden, false);
  assert.equal(a.elements['[data-control="up"]'].hidden, true);
  assert.equal(a.hasFrame(), false);
});


test('Maze Chase ghosts consume all lives and closing or switching stops the old game', () => {
  const a = arcade();
  a.trigger.emit('click'); a.gameButtons[2].emit('click');
  a.elements['.restart-game'].emit('click'); a.tick(18000);
  assert.equal(a.elements['#lives'].textContent, '00');
  assert.match(a.elements['.game-status'].textContent, /Game over/);
  assert.equal(a.hasFrame(), false);
  a.elements['.restart-game'].emit('click');
  a.doc.hidden = true; a.tick(300);
  assert.equal(a.elements['#score'].textContent, '00000');
  a.doc.hidden = false; a.tick(35);
  assert.ok(Number(a.elements['#score'].textContent) > 0);
  a.dialog.close();
  assert.equal(a.hasFrame(), false);
});


test('a powered maze runner can chase and eat a ghost for bonus points', () => {
  const a = arcade();
  a.trigger.emit('click'); a.gameButtons[2].emit('click');
  a.elements['.restart-game'].emit('click'); a.tick(150);
  assert.match(a.elements['.game-status'].textContent, /Power/);
  const directions = [['ArrowLeft', -1, 0], ['ArrowRight', 1, 0], ['ArrowUp', 0, -1], ['ArrowDown', 0, 1]];
  let ateGhost = false;
  for (let frame = 0; frame < 480 && !ateGhost; frame++) {
    const walls = new Set(a.painted.walls);
    const queue = [{ ...a.painted.runner, first: null }];
    const seen = new Set();
    for (let i = 0; i < queue.length; i++) {
      const cell = queue[i];
      if (a.painted.ghosts.some(ghost => ghost.x === cell.x && ghost.y === cell.y) && cell.first) {
        a.key(cell.first); break;
      }
      for (const [key, dx, dy] of directions) {
        const x = cell.x + dx, y = cell.y + dy, id = `${x},${y}`;
        if (x < 0 || x >= 21 || y < 0 || y >= 15 || walls.has(id) || seen.has(id)) continue;
        seen.add(id); queue.push({ x, y, first: cell.first || key });
      }
    }
    const score = Number(a.elements['#score'].textContent);
    a.tick();
    ateGhost = Number(a.elements['#score'].textContent) - score >= 200;
  }
  assert.equal(ateGhost, true);
  assert.equal(a.elements['#lives'].textContent, '03');
});
