const assert = require('node:assert/strict');

global.window = global;
require('./route_engine.js');
const suggester = require('./route_suggester.js');

const fixes = [
  { nombre: 'AAA', coordenadas: { latitud: '0', longitud: '0' } },
  { nombre: 'BBB', coordenadas: { latitud: '0', longitud: '1' } },
  { nombre: 'CCC', coordenadas: { latitud: '0', longitud: '2' } },
  { nombre: 'DDD', coordenadas: { latitud: '1', longitud: '2' } }
];
const airways = [
  { J1: ['AAA', 'BBB', 'CCC'] },
  { V2: ['CCC', 'DDD'] }
];
const airports = [
  { icaoId: 'TEST', iataId: 'TST', lat: 0, lon: -0.1 },
  { icaoId: 'DONE', iataId: 'DNE', lat: 1.1, lon: 2 }
];

const result = suggester.suggestRoute({
  departure: 'TEST',
  destination: 'DONE',
  airports,
  fixes,
  airways,
  candidateLimit: 1
});

assert.equal(result.ok, true);
assert.equal(result.routeText, 'AAA J1 CCC V2 DDD');
assert.deepEqual(result.nodes, ['AAA', 'BBB', 'CCC', 'DDD']);
assert.ok(result.totalDistanceNm > result.airwayDistanceNm);
assert.equal(suggester.findAirport('TST', airports), airports[0]);

console.log('route_suggester tests passed');

