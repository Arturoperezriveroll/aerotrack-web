const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

// Load the same classic script as index.html without a browser, map, or network.
const aircraftDetails = { innerHTML: '' };
const button = {
  addEventListener() {},
  setAttribute() {},
  classList: { toggle() {} }
};
const scriptPath = path.join(__dirname, 'traffic_info.js');
const context = vm.createContext({
  document: {
    getElementById(id) {
      if (id === 'aircraftDetails') return aircraftDetails;
      if (id === 'startTrackingFlights' || id === 'testTrafficConflict') return button;
      return null;
    }
  }
});
vm.runInContext(fs.readFileSync(scriptPath, 'utf8'), context, { filename: scriptPath });
const {
  formatTrafficNumber,
  formatTrafficHeading,
  formatTrafficRate,
  formatTrafficAltitude,
  updateAircraftDetails
} = context;

const missingValues = [null, undefined, '', '   ', '\t\n'];
const invalidValues = [
  NaN, Infinity, -Infinity, 'Infinity', 'Unknown', 'not a number',
  false, true, [], [0], {}, Symbol('invalid')
];

test('formatTrafficNumber omits missing and invalid input', () => {
  for (const value of [...missingValues, ...invalidValues]) {
    assert.equal(formatTrafficNumber(value, 0, ' kt'), '');
  }
});

test('formatTrafficNumber preserves valid zeros, units, and precision', () => {
  assert.equal(formatTrafficNumber(0, 0, ' kt'), '0 kt');
  assert.equal(formatTrafficNumber(' 0 ', 0, ' kt'), '0 kt');
  assert.equal(formatTrafficNumber('1234.5', 1, ' ft'), '1,234.5 ft');
  assert.equal(formatTrafficNumber(-89.275, 5, '°'), '-89.27500°');
});

test('formatTrafficHeading omits missing and invalid input', () => {
  for (const value of [...missingValues, ...invalidValues]) {
    assert.equal(formatTrafficHeading(value), '');
  }
});

test('formatTrafficHeading preserves north and rounds and pads valid headings', () => {
  assert.equal(formatTrafficHeading(0), '000°');
  assert.equal(formatTrafficHeading('000'), '000°');
  assert.equal(formatTrafficHeading(' 9.6 '), '010°');
  assert.equal(formatTrafficHeading(274.6), '275°');
});

test('formatTrafficRate omits missing and invalid input', () => {
  for (const value of [...missingValues, ...invalidValues]) {
    assert.equal(formatTrafficRate(value), '');
  }
});

test('formatTrafficRate preserves level, climb, and descent indications', () => {
  assert.equal(formatTrafficRate(0), '0 ft/min —');
  assert.equal(formatTrafficRate('0'), '0 ft/min —');
  assert.equal(formatTrafficRate('1200'), '+1,200 ft/min ↑');
  assert.equal(formatTrafficRate(-800), '-800 ft/min ↓');
});

test('formatTrafficAltitude distinguishes blank, zero, and ground', () => {
  assert.equal(formatTrafficAltitude('   '), '');
  assert.equal(formatTrafficAltitude(0), '0 ft');
  assert.equal(formatTrafficAltitude('ground'), 'GND');
});

test('aircraft details hide missing fields and display valid zeros', () => {
  updateAircraftDetails({
    gs: null, mag_heading: '', baro_rate: '   ',
    ias: 0, track: 0, geom_rate: 0
  });

  const html = aircraftDetails.innerHTML;
  assert.doesNotMatch(html, /GROUND SPEED|MAG HEADING|BARO RATE/);
  assert.match(html, /<span>IAS<\/span><strong>0 kt<\/strong>/);
  assert.match(html, /<span>TRACK<\/span><strong>000°<\/strong>/);
  assert.match(html, /<span>GEOMETRIC RATE<\/span><strong>0 ft\/min —<\/strong>/);
});
