const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const script = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');

const context = {
  document: {
    addEventListener() {}
  },
  localStorage: {
    getItem() {
      return null;
    },
    setItem() {}
  }
};

vm.createContext(context);
vm.runInContext(script, context);

test('calcula horário de saída com jornada decimal', () => {
  const result = context.calculateExitTime('08:00', 7.5, 60);

  assert.equal(result.clock, '16:30');
  assert.equal(result.nextDay, false);
});

test('marca saída no dia seguinte quando ultrapassa meia-noite', () => {
  const result = context.calculateExitTime('22:30', 8, 30);

  assert.equal(result.clock, '07:00');
  assert.equal(result.nextDay, true);
});

test('calcula hora extra com divisor e decimal de horas', () => {
  const result = context.calculateOvertime(3000, 220, 50, 10.5);

  assert.equal(Number(result.overtimeRate.toFixed(2)), 20.45);
  assert.equal(Number(result.total.toFixed(2)), 214.77);
});

test('mantém chaves de data com zero à esquerda', () => {
  assert.equal(context.toDateKey(2026, 5, 5), '2026-06-05');
  assert.equal(context.normalizeDateKey('2026-6-5'), '2026-06-05');
});

test('normaliza perfil com padrões úteis', () => {
  const profile = context.normalizeProfile({
    name: ' Samara ',
    workHours: '7.5',
    salary: '2200'
  });

  assert.equal(profile.name, 'Samara');
  assert.equal(profile.workHours, 7.5);
  assert.equal(profile.salary, 2200);
});
