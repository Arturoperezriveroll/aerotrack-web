(function () {
  const EARTH_RADIUS_KM = 6371;
  const KM_TO_NM = 0.539957;

  function normalizeToken(value) {
    return String(value || '').trim().toUpperCase();
  }

  function toNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  function normalizeCoordinates(point) {
    const lat = toNumber(point?.lat);
    const lng = toNumber(point?.lng);

    if (lat === null || lng === null) {
      return null;
    }

    return { lat, lng };
  }

  function calculateDistanceKm(pointA, pointB) {
    const start = normalizeCoordinates(pointA);
    const end = normalizeCoordinates(pointB);

    if (!start || !end) {
      return null;
    }

    const dLat = toRadians(end.lat - start.lat);
    const dLng = toRadians(end.lng - start.lng);
    const lat1 = toRadians(start.lat);
    const lat2 = toRadians(end.lat);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return EARTH_RADIUS_KM * c;
  }

  function calculateDistanceNm(pointA, pointB) {
    const distanceKm = calculateDistanceKm(pointA, pointB);
    return distanceKm === null ? null : distanceKm * KM_TO_NM;
  }

  function computeRouteDistances(waypoints, currentLocation) {
    let totalDistanceNm = 0;

    return (waypoints || []).map((waypoint, index, routeWaypoints) => {
      const previousWaypoint = routeWaypoints[index - 1];
      const legDistanceNm = previousWaypoint
        ? calculateDistanceNm(previousWaypoint, waypoint) || 0
        : 0;
      const distanceFromCurrentNm = currentLocation
        ? calculateDistanceNm(currentLocation, waypoint)
        : null;

      totalDistanceNm += legDistanceNm;

      return {
        ...waypoint,
        legDistanceNm,
        totalDistanceNm,
        distanceFromCurrentNm
      };
    });
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
    calculateDistanceKm,
    calculateDistanceNm,
    computeRouteDistances,
    getAirwaySegmentFromList,
    getSegmentOfAirway,
    normalizeToken,
    parseRouteInput
  };
})();
