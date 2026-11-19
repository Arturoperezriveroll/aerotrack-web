const assert = require('node:assert/strict');
const manager = require('./aviation_layer_manager.js');
const vsaTma = require('../geojson/vsaTma.json');
const cmeTma = require('../geojson/cmetma.json');
const tgzTma = require('../geojson/tgztma.json');
const tapAda = require('../geojson/adatap.json');

const sourcePaths = manager.AIRSPACE_SOURCES.map((source) => source.data.toLowerCase());
assert.equal(manager.GROUPS.fixes.enabled, true);
assert.equal(sourcePaths.some((path) => path.includes('vz23')), false);
assert.equal(manager.AIRSPACE_SOURCES.length, 11);
assert.equal(manager.AIRSPACE_SOURCES.find((source) => source.id === 'aviation-cme-tma').color, manager.AIRSPACE_CLASS_COLORS.D);
assert.deepEqual(manager.AIRSPACE_SOURCES.find((source) => source.id === 'aviation-cme-tma').lineDasharray, [6, 4]);
assert.equal(manager.AIRSPACE_SOURCES.find((source) => source.id === 'aviation-adatap').color, manager.AIRSPACE_CLASS_COLORS.F);
assert.equal(vsaTma.features.length, 1);
assert.equal(vsaTma.features[0].properties.Name, 'VSA TMA / CTR / TWR');
assert.equal(vsaTma.features[0].geometry.type, 'Polygon');
assert.equal(vsaTma.features[0].geometry.coordinates.length, 1);
assert.equal(vsaTma.features[0].properties.airspaceClass, 'D');
assert.match(vsaTma.features[0].properties.description, /APP NO RADAR: 120\.9 MHz/);
assert.match(vsaTma.features[0].properties.description, /CTR \/ TWR[\s\S]*FREQUENCY: 118\.7 MHz/);
assert.equal(cmeTma.features[0].properties.airspaceClass, 'D');
assert.equal(cmeTma.features[0].properties.Name, 'CME TMA / CTR / TWR');
assert.match(cmeTma.features[0].properties.description, /APP NO RADAR: 119\.1 MHz/);
assert.match(cmeTma.features[0].properties.description, /CTR \/ TWR[\s\S]*FREQUENCY: 118\.4 MHz/);
assert.equal(tgzTma.features[0].properties.lowerLimits, 'Varies by published area');
assert.equal(tgzTma.features[0].properties.Name, 'TGZ TMA / CTR / TWR');
assert.match(tgzTma.features[0].properties.description, /TMA \/ APP[\s\S]*APP NO RADAR: 118\.6 MHz/);
assert.match(tgzTma.features[0].properties.description, /CTR \/ TWR[\s\S]*FREQUENCY: 118\.6 MHz/);
assert.equal(tapAda.features[0].properties.lowerLimit, 'GND');
assert.equal(tapAda.features[0].properties.Name, 'TAP ADA / CTR / TWR');
assert.match(tapAda.features[0].properties.description, /ADA \/ ADVISORY[\s\S]*FREQUENCY: 118\.85 MHz/);
assert.match(tapAda.features[0].properties.description, /CTR \/ TWR[\s\S]*FREQUENCY: 118\.3 MHz/);
assert.doesNotMatch(tapAda.features[0].properties.description, /ATZ|A035/);
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
assert.equal(manager.shouldHighlightFeature(vorDetails), true);
assert.match(manager.detailsHtml(vorDetails), /Frequency and schedule: not available/);

const airspaceDetails = manager.buildFeatureDetails({
  layer: { id: 'aviation-cme-tma-fill' },
  properties: { Name: 'CME TMA', description: 'CLASS D\nFL195 / 2500FT AMSL\nAPP 119.1\nTWR 118.4' },
  geometry: { type: 'Polygon', coordinates: [] }
});
assert.equal(airspaceDetails.category, 'Airspace');
assert.equal(airspaceDetails.accentColor, '#0f766e');
assert.equal(airspaceDetails.showCoordinates, false);
assert.equal(manager.shouldHighlightFeature(airspaceDetails), false);
assert.match(manager.detailsHtml(airspaceDetails), /CLASS D<br>FL195 \/ 2500FT AMSL/);
assert.match(manager.detailsHtml(airspaceDetails), /APP 119\.1<br>TWR 118\.4/);
assert.doesNotMatch(manager.detailsHtml(airspaceDetails), /Latitude|Longitude|Geometry|polygon/i);

const combinedAirspaceHtml = manager.detailsHtml(manager.buildFeatureDetails({
  layer: { id: 'aviation-cme-tma-fill' },
  properties: cmeTma.features[0].properties,
  geometry: { type: 'Polygon', coordinates: [] }
}));
assert.match(combinedAirspaceHtml, /aviation-popup-section-title">TMA \/ APP/);
assert.match(combinedAirspaceHtml, /aviation-popup-section-title">CTR \/ TWR/);
assert.match(combinedAirspaceHtml, /CARMEN APPROACH/);
assert.match(combinedAirspaceHtml, /CARMEN TOWER/);
assert.match(combinedAirspaceHtml, /--aviation-popup-accent: #2563eb/);

const advisoryAirspaceHtml = manager.detailsHtml(manager.buildFeatureDetails({
  layer: { id: 'aviation-adatap-fill' },
  properties: tapAda.features[0].properties,
  geometry: { type: 'Polygon', coordinates: [] }
}));
assert.match(advisoryAirspaceHtml, /--aviation-popup-accent: #d97706/);

const explicitAreaDetails = manager.buildFeatureDetails({
  layer: { id: 'aviation-danger-area-fill' },
  properties: {
    Name: 'Danger area',
    showCoordinates: true,
    coordinateLabel: 'Published centre',
    centerLatitude: 18.5,
    centerLongitude: -92.5
  },
  geometry: { type: 'Polygon', coordinates: [] }
});
assert.equal(explicitAreaDetails.showCoordinates, true);
assert.equal(explicitAreaDetails.coordinateLabel, 'Published centre');
assert.match(manager.detailsHtml(explicitAreaDetails), /Published centre/);
assert.match(manager.detailsHtml(explicitAreaDetails), /18\.500000/);

const clickOnlyAreaDetails = manager.buildFeatureDetails({
  layer: { id: 'aviation-danger-area-fill' },
  properties: { Name: 'Danger area' },
  geometry: { type: 'Polygon', coordinates: [] }
}, { lng: -92.5, lat: 18.5 });
assert.equal(clickOnlyAreaDetails.showCoordinates, false);
assert.doesNotMatch(manager.detailsHtml(clickOnlyAreaDetails), /18\.500000|-92\.500000/);

console.log('aviation_layer_manager tests passed');
