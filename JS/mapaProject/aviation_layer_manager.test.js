const assert = require('node:assert/strict');
const manager = require('./aviation_layer_manager.js');

const sourcePaths = manager.AIRSPACE_SOURCES.map((source) => source.data.toLowerCase());
assert.equal(manager.GROUPS.fixes.enabled, true);
assert.equal(sourcePaths.some((path) => path.includes('vz23')), false);
assert.equal(manager.AIRSPACE_SOURCES.length, 11);
assert.equal(
  manager.AIRSPACE_SOURCES
    .filter((source) => /^aviation-sector-\d$/.test(source.id))
    .every((source) => source.geometry === 'line'),
  true
);

const geojson = manager.convertVorData([
  { nombre: 'mid', coordenadas: { latitud: '20.938', longitud: '-89.656' } },
  { nombre: '', coordenadas: { latitud: 'bad', longitud: '-89' } }
]);
assert.equal(geojson.features.length, 1);
assert.equal(geojson.features[0].properties.Name, 'MID');
assert.deepEqual(geojson.features[0].geometry.coordinates, [-89.656, 20.938]);

const vorDetails = manager.buildFeatureDetails({
  layer: { id: 'aviation-vors-point' },
  properties: { Name: 'MID' },
  geometry: { type: 'Point', coordinates: [-89.656, 20.938] }
}, { lng: 0, lat: 0 });
assert.equal(vorDetails.category, 'VOR');
assert.equal(vorDetails.longitude, '-89.656000');
assert.equal(vorDetails.latitude, '20.938000');
assert.match(manager.detailsHtml(vorDetails), /Frequency and schedule: not available/);

const airspaceDetails = manager.buildFeatureDetails({
  layer: { id: 'aviation-cme-tma-fill' },
  properties: { Name: 'CME TMA', description: 'APP 119.1\nTWR 118.4' },
  geometry: { type: 'Polygon', coordinates: [] }
}, { lng: -91.8, lat: 18.65 });
assert.equal(airspaceDetails.category, 'Airspace');
assert.match(manager.detailsHtml(airspaceDetails), /APP 119\.1<br>TWR 118\.4/);

console.log('aviation_layer_manager tests passed');
