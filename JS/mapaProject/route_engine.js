(function () {
  function normalizeToken(value) {
    return String(value || '').trim().toUpperCase();
  }

  function buildFixIndex(fixes) {
    const index = new Map();
    (fixes || []).forEach((fix) => {
      const name = normalizeToken(fix?.nombre);
      if (name) {
        index.set(name, fix);
      }
    });
    return index;
  }

  function buildAirwayIndex(airwayList) {
    const index = new Map();
    (airwayList || []).forEach((airwayObject) => {
      const airwayName = normalizeToken(Object.keys(airwayObject || {})[0]);
      if (airwayName) {
        index.set(airwayName, airwayObject[Object.keys(airwayObject)[0]]);
      }
    });
    return index;
  }

  function getAirwaySegmentFromList(airwayFixes, startFix, endFix) {
    const startName = normalizeToken(startFix);
    const endName = normalizeToken(endFix);
    const normalizedAirway = (airwayFixes || []).map(normalizeToken);
    const startIndex = normalizedAirway.indexOf(startName);
    const endIndex = endName ? normalizedAirway.indexOf(endName) : -1;

    if (startIndex === -1) {
      return [];
    }

    if (endIndex === -1) {
      return normalizedAirway.slice(startIndex + 1);
    }

    if (startIndex > endIndex) {
      return normalizedAirway.slice(endIndex + 1, startIndex + 1).reverse();
    }

    return normalizedAirway.slice(startIndex + 1, endIndex);
  }

  function getSegmentOfAirway(airwayName, startFix, endFix, airwayList) {
    const airwayIndex = buildAirwayIndex(airwayList);
    const airwayFixes = airwayIndex.get(normalizeToken(airwayName));
    return getAirwaySegmentFromList(airwayFixes, startFix, endFix);
  }

  function parseRouteInput(routeInput, fixes, airwayList) {
    const tokens = String(routeInput || '')
      .split(/\s+/)
      .map(normalizeToken)
      .filter(Boolean);
    const fixIndex = buildFixIndex(fixes);
    const airwayIndex = buildAirwayIndex(airwayList);
    const routeFixes = [];
    const messages = [];
    let previousFixName = null;
    let pendingAirway = null;

    function addFixByName(fixName) {
      const fix = fixIndex.get(normalizeToken(fixName));
      if (!fix) {
        messages.push(`Fix not found: ${fixName}`);
        return;
      }

      routeFixes.push(fix);
      previousFixName = normalizeToken(fix.nombre);
    }

    tokens.forEach((token) => {
      const fix = fixIndex.get(token);

      if (fix) {
        if (pendingAirway && previousFixName) {
          const airwayFixes = airwayIndex.get(pendingAirway);
          const segment = getAirwaySegmentFromList(airwayFixes, previousFixName, token);

          if (!airwayFixes) {
            messages.push(`Airway not found: ${pendingAirway}`);
          } else if (segment.length === 0 && previousFixName !== token) {
            messages.push(`No segment found on ${pendingAirway} from ${previousFixName} to ${token}`);
          }

          segment.forEach((fixName) => {
            if (fixName !== previousFixName) {
              addFixByName(fixName);
            }
          });

          pendingAirway = null;
        }

        if (previousFixName !== token) {
          routeFixes.push(fix);
        }
        previousFixName = token;
        return;
      }

      pendingAirway = token;
    });

    if (pendingAirway && previousFixName) {
      const airwayFixes = airwayIndex.get(pendingAirway);
      const segment = getAirwaySegmentFromList(airwayFixes, previousFixName, null);

      if (!airwayFixes) {
        messages.push(`Airway not found: ${pendingAirway}`);
      }

      segment.forEach(addFixByName);
    }

    return {
      fixes: routeFixes,
      messages
    };
  }

  window.AeroTrackRouteEngine = {
    buildAirwayIndex,
    buildFixIndex,
    getAirwaySegmentFromList,
    getSegmentOfAirway,
    normalizeToken,
    parseRouteInput
  };
})();
