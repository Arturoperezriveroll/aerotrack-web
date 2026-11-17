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
  airways
});

assert.equal(result.ok, true);
assert.equal(result.routeText, 'AAA J1 CCC V2 DDD');
assert.equal(result.terminalStrategy, 'nearest-connected-fix');
assert.deepEqual(result.nodes, ['AAA', 'BBB', 'CCC', 'DDD']);
assert.ok(result.totalDistanceNm > result.airwayDistanceNm);
assert.equal(suggester.findAirport('TST', airports), airports[0]);

const airportCodeFixes = [
  { nombre: 'TEST', coordenadas: { latitud: '0', longitud: '-0.1' } },
  ...fixes
];
const airportCodeAirways = [{ X1: ['TEST', 'AAA', 'BBB'] }, ...airways];
const excludedAirportResult = suggester.suggestRoute({
  departure: 'TEST',
  destination: 'DONE',
  airports,
  fixes: airportCodeFixes,
  airways: airportCodeAirways
});
assert.equal(excludedAirportResult.nodes[0], 'AAA');

const iataVorResult = suggester.suggestRoute({
  departure: 'TEST',
  destination: 'DONE',
  airports,
  fixes: [
    { nombre: 'TST', coordenadas: { latitud: '0', longitud: '-0.05' } },
    ...fixes
  ],
  airways: [{ X2: ['TST', 'AAA'] }, ...airways]
});
assert.equal(iataVorResult.nodes[0], 'TST');

console.log('route_suggester tests passed');

