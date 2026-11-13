const test = require('node:test');
const assert = require('node:assert/strict');
const { Shift, Worker, displayMinutes } = require('../js/cafe-core.js');

test('the display advances in half hours, including noon and closing', () => {
  assert.equal(displayMinutes(540), 540);
  assert.equal(displayMinutes(569.99), 540);
  assert.equal(displayMinutes(570), 570);
  assert.equal(displayMinutes(719.99), 690);
  assert.equal(displayMinutes(720), 720);
  assert.equal(displayMinutes(1260), 1260);
});

test('the five minute shift closes once and cannot run beyond closing', () => {
  const shift = new Shift();
  shift.advance(12500);
  assert.equal(shift.minutes, 570);
  shift.advance(287500);
  assert.equal(shift.minutes, 1260);
  assert.equal(shift.closed, true);
  shift.advance(10000);
  assert.equal(shift.minutes, 1260);
});

test('a worker continues during a foreground order without replacing that order', () => {
  const worker = new Worker();
  const foreground = { drink: 'mocha', poured: ['choco'], art: null };
  const order = { cust: { id: 'luka' }, drink: { id: 'cafe', price: 4000 } };
  worker.start(order, ['espresso', 'milk'], { type: 'template', id: 'heart' });
  assert.equal(worker.advance(11000), null);
  foreground.poured.push('espresso');
  assert.equal(worker.job.elapsed, 11000);
  assert.deepEqual(foreground.poured, ['choco', 'espresso']);
  const done = worker.advance(13000);
  assert.equal(done.order, order);
  assert.equal(worker.busy, false);
  assert.deepEqual(foreground, { drink: 'mocha', poured: ['choco', 'espresso'], art: null });
  assert.equal(worker.advance(100000), null, 'completion cannot be paid twice');
});

test('an occupied worker rejects a second assignment and preserves its current job', () => {
  const worker = new Worker();
  worker.start({ id: 1 }, ['milk'], null);
  assert.equal(worker.start({ id: 2 }, ['espresso'], null), false);
  assert.equal(worker.job.order.id, 1);
});

test('teaching a new recipe or drawing does not mutate the drink in progress', () => {
  const worker = new Worker();
  const steps = ['espresso', 'milk'];
  const art = { type: 'grid', grid: new Float32Array([.2, .8]), n: 1 };
  worker.start({ id: 1 }, steps, art);
  steps[0] = 'choco'; art.grid[0] = 1;
  assert.equal(worker.job.steps[0], 'espresso');
  assert.ok(Math.abs(worker.job.art.grid[0] - .2) < .00001);
});

test('an order accepted before closing completes after the clock closes', () => {
  const shift = new Shift(); const worker = new Worker();
  shift.advance(299000);
  worker.start({ id: 1 }, ['espresso', 'milk'], null);
  shift.advance(1000); worker.advance(1000);
  assert.equal(shift.closed, true);
  assert.equal(worker.busy, true);
  const done = worker.advance(18800);
  assert.equal(done.order.id, 1);
  assert.equal(done.art, null);
  assert.equal(worker.busy, false);
});

test('reading can pause the clock while the worker progresses', () => {
  const shift = new Shift(); const worker = new Worker();
  worker.start({ id: 1 }, ['espresso'], null);
  worker.advance(5000);
  assert.equal(shift.minutes, 540);
  assert.equal(worker.job.elapsed, 5000);
});
