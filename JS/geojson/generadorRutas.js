// Reads the route input, resolves fixes/airways, and fills fixTable.
function displayLatLong() {
  const routeText = document.getElementById('fixes').value;
  const table = document.getElementById('fixTable');
  const messageBox = document.getElementById('routeMessages');
  table.innerHTML = '';
  if (messageBox) {
    messageBox.textContent = '';
  }

  const route = AeroTrackRouteEngine.parseRouteInput(routeText, fixesData, airways);
  console.log('Route input:', routeText);
  console.log('Resolved route:', route);

  route.fixes.forEach((fix) => {
    addRowToTable(fix, table);
  });

  if (route.messages.length > 0) {
    console.warn('Route messages:', route.messages);
    if (messageBox) {
      messageBox.textContent = route.messages.join(' | ');
    }
  }

  return route;
}

function getSegmentOfAirway(airwayName, startFix, endFix) {
  return AeroTrackRouteEngine.getSegmentOfAirway(airwayName, startFix, endFix, airways);
}

function addRowToTable(fix, table) {
  const row = document.createElement('tr');
  const nameCell = document.createElement('td');
  const latCell = document.createElement('td');
  const lngCell = document.createElement('td');

  nameCell.textContent = AeroTrackRouteEngine.normalizeToken(fix.nombre);
  latCell.textContent = fix.coordenadas.latitud;
  lngCell.textContent = fix.coordenadas.longitud;

  row.appendChild(nameCell);
  row.appendChild(latCell);
  row.appendChild(lngCell);
  table.appendChild(row);
}
