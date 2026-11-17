(function (root, factory) {
  const api = factory(root.AeroTrackRouteEngine);

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  root.AeroTrackRouteSuggester = api;
})(typeof window !== 'undefined' ? window : globalThis, function (routeEngine) {
  const normalizeToken = routeEngine?.normalizeToken || ((value) => String(value || '').trim().toUpperCase());
  const calculateDistanceNm = routeEngine?.calculateDistanceNm;

  function normalizeFix(fix) {
    const name = normalizeToken(fix?.nombre);
    const lat = Number(fix?.coordenadas?.latitud);
    const lng = Number(fix?.coordenadas?.longitud);

    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }

    return { name, lat, lng, source: fix };
  }

  function normalizeAirport(airport) {
    const lat = Number(airport?.lat);
    const lng = Number(airport?.lon ?? airport?.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return null;
    }

    const icaoCode = normalizeToken(airport?.icaoId);
    const iataCode = normalizeToken(airport?.iataId);

    return {
      code: icaoCode || iataCode,
      // Exclude only the aerodrome's ICAO identifier. An IATA code can also be
      // the valid identifier of its terminal VOR (for example OAX or MID).
      identifiers: icaoCode && icaoCode !== '-' ? [icaoCode] : [],
      lat,
      lng,
      source: airport
    };
  }

  function findAirport(code, airports) {
    const wanted = normalizeToken(code);
    return (airports || []).find((airport) =>
      normalizeToken(airport?.icaoId) === wanted || normalizeToken(airport?.iataId) === wanted
    ) || null;
  }

  function buildAirwayGraph(fixes, airwayList) {
    const fixIndex = new Map();
    const adjacency = new Map();

    (fixes || []).forEach((fix) => {
      const normalized = normalizeFix(fix);
      if (normalized) {
        fixIndex.set(normalized.name, normalized);
      }
    });

    function addEdge(from, to, airway, distanceNm) {
      if (!adjacency.has(from)) {
        adjacency.set(from, []);
      }
      adjacency.get(from).push({ to, airway, distanceNm });
    }

    (airwayList || []).forEach((airwayObject) => {
      const rawName = Object.keys(airwayObject || {})[0];
      const airway = normalizeToken(rawName);
      const names = (airwayObject?.[rawName] || []).map(normalizeToken).filter(Boolean);

      for (let index = 1; index < names.length; index += 1) {
        const from = fixIndex.get(names[index - 1]);
        const to = fixIndex.get(names[index]);
        if (!from || !to || !airway || typeof calculateDistanceNm !== 'function') {
          continue;
        }

        const distanceNm = calculateDistanceNm(from, to);
        if (!Number.isFinite(distanceNm) || distanceNm <= 0) {
          continue;
        }

        addEdge(from.name, to.name, airway, distanceNm);
        addEdge(to.name, from.name, airway, distanceNm);
      }
    });

    return { fixIndex, adjacency };
  }

  function nearestGraphFixes(point, graph, limit, maxDistanceNm, excludedNames = []) {
    const excluded = new Set((excludedNames || []).map(normalizeToken));
    return [...graph.adjacency.keys()]
      .filter((name) => !excluded.has(name))
      .map((name) => {
        const fix = graph.fixIndex.get(name);
        return { name, distanceNm: calculateDistanceNm(point, fix) };
      })
      .filter((candidate) => Number.isFinite(candidate.distanceNm))
      .sort((a, b) => a.distanceNm - b.distanceNm)
      .filter((candidate, index) => candidate.distanceNm <= maxDistanceNm || index < 3)
      .slice(0, limit);
  }

  function shortestAirwayPath(graph, starts, destinations) {
    const destinationAccess = new Map(destinations.map((candidate) => [candidate.name, candidate.distanceNm]));
    const distances = new Map();
    const previous = new Map();
    const open = [];

    starts.forEach((candidate) => {
      const known = distances.get(candidate.name);
      if (known === undefined || candidate.distanceNm < known) {
        distances.set(candidate.name, candidate.distanceNm);
        previous.set(candidate.name, null);
        open.push({ name: candidate.name, distanceNm: candidate.distanceNm });
      }
    });

    let bestDestination = null;
    let bestTotalNm = Infinity;

    while (open.length > 0) {
      open.sort((a, b) => a.distanceNm - b.distanceNm);
      const current = open.shift();
      if (current.distanceNm !== distances.get(current.name)) {
        continue;
      }
      if (current.distanceNm >= bestTotalNm) {
        break;
      }

      if (destinationAccess.has(current.name)) {
        const totalNm = current.distanceNm + destinationAccess.get(current.name);
        if (totalNm < bestTotalNm) {
          bestTotalNm = totalNm;
          bestDestination = current.name;
        }
      }

      (graph.adjacency.get(current.name) || []).forEach((edge) => {
        const nextDistanceNm = current.distanceNm + edge.distanceNm;
        if (nextDistanceNm < (distances.get(edge.to) ?? Infinity)) {
          distances.set(edge.to, nextDistanceNm);
          previous.set(edge.to, { from: current.name, edge });
          open.push({ name: edge.to, distanceNm: nextDistanceNm });
        }
      });
    }

    if (!bestDestination) {
      return null;
    }

    const nodes = [bestDestination];
    const edges = [];
    let cursor = bestDestination;
    while (previous.get(cursor)) {
      const step = previous.get(cursor);
      edges.unshift(step.edge);
      nodes.unshift(step.from);
      cursor = step.from;
    }

    const startAccessNm = distances.get(nodes[0]) || 0;
    const endAccessNm = destinationAccess.get(bestDestination) || 0;
    const airwayDistanceNm = bestTotalNm - startAccessNm - endAccessNm;

    return { nodes, edges, startAccessNm, endAccessNm, airwayDistanceNm, totalDistanceNm: bestTotalNm };
  }

  function formatRoute(nodes, edges) {
    if (!nodes.length) {
      return '';
    }
    if (!edges.length) {
      return nodes[0];
    }

    const tokens = [nodes[0]];
    let segmentAirway = edges[0].airway;

    for (let index = 1; index <= edges.length; index += 1) {
      const nextAirway = edges[index]?.airway;
      if (nextAirway !== segmentAirway) {
        tokens.push(segmentAirway, nodes[index]);
        segmentAirway = nextAirway;
      }
    }

    return tokens.join(' ');
  }

  function suggestRoute(options) {
    const departureRecord = findAirport(options?.departure, options?.airports);
    const destinationRecord = findAirport(options?.destination, options?.airports);
    const departure = normalizeAirport(departureRecord);
    const destination = normalizeAirport(destinationRecord);

    if (!departure || !destination) {
      return {
        ok: false,
        message: !departure
          ? `Departure airport not found: ${normalizeToken(options?.departure) || 'empty'}`
          : `Destination airport not found: ${normalizeToken(options?.destination) || 'empty'}`
      };
    }

    const graph = options?.graph || buildAirwayGraph(options?.fixes, options?.airways);
    if (graph.adjacency.size === 0) {
      return { ok: false, message: 'No usable airway network is available.' };
    }

    // Without a runway/SID/STAR selection, lock each terminal end to its nearest
    // connected navigation fix. Airport identifiers are references, not graph WPs.
    const candidateLimit = Number(options?.candidateLimit) || 1;
    const accessRadiusNm = Number(options?.accessRadiusNm) || 150;
    const starts = nearestGraphFixes(
      departure,
      graph,
      candidateLimit,
      accessRadiusNm,
      departure.identifiers
    );
    const destinations = nearestGraphFixes(
      destination,
      graph,
      candidateLimit,
      accessRadiusNm,
      destination.identifiers
    );
    const path = shortestAirwayPath(graph, starts, destinations);

    if (!path) {
      return { ok: false, message: 'No connected airway route was found between nearby fixes.' };
    }

    const directDistanceNm = calculateDistanceNm(departure, destination);
    const detourPercent = directDistanceNm > 0
      ? ((path.totalDistanceNm / directDistanceNm) - 1) * 100
      : 0;

    return {
      ok: true,
      departure,
      destination,
      terminalStrategy: 'nearest-connected-fix',
      routeText: formatRoute(path.nodes, path.edges),
      ...path,
      directDistanceNm,
      detourPercent
    };
  }

  return {
    buildAirwayGraph,
    findAirport,
    formatRoute,
    nearestGraphFixes,
    shortestAirwayPath,
    suggestRoute
  };
});

