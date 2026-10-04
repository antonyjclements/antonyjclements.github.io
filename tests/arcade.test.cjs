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
    querySelectorAll() { return touchButtons; }
    focus() {}
    showModal() { this.open = true; }
    close() { this.open = false; this.emit('close'); }
    setPointerCapture() {}
  }
  const elements = Object.fromEntries(['.motion-toggle', 'span', '#score', '#wave', '.game-status', '.restart-game', '.close-game', 'canvas'].map(selector => [selector, new Element()]));
  const drawn = [];
  elements.canvas.getContext = () => ({ fillRect() {}, fillText(text) { drawn.push(text); } });
  const dialog = new Element();
  const trigger = new Element();
  const touchButtons = ['left', 'fire', 'right'].map(control => { const button = new Element(); button.dataset.control = control; return button; });
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
  return { elements, dialog, trigger, touchButtons, doc, win, classes, drawn, tick, key, hasFrame: () => !!callback };
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
