(function () {
  function normalizeToken(value) {
    return String(value || '').trim().toUpperCase();
  }

  function validateFixes(fixes) {
    const names = new Map();
    const duplicateFixes = [];
    const blankFixes = [];
    const spacedFixes = [];
    const invalidCoordinates = [];

    (fixes || []).forEach((fix, index) => {
      const rawName = String(fix?.nombre || '');
      const name = normalizeToken(rawName);
      const lat = Number(fix?.coordenadas?.latitud);
      const lng = Number(fix?.coordenadas?.longitud);

      if (!name) {
        blankFixes.push({ index });
        return;
      }

      if (rawName !== rawName.trim()) {
        spacedFixes.push(name);
      }

      if (names.has(name)) {
        duplicateFixes.push(name);
      }

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        invalidCoordinates.push(name);
      }

      names.set(name, fix);
    });

    return {
      names,
      duplicateFixes: [...new Set(duplicateFixes)],
      blankFixes,
      spacedFixes: [...new Set(spacedFixes)],
      invalidCoordinates: [...new Set(invalidCoordinates)]
    };
  }

  function validateAirways(airwayList, fixNames) {
    const airwayNames = new Set();
    const duplicateAirways = [];
    const blankAirways = [];
    const missingFixes = [];

    (airwayList || []).forEach((airwayObject, index) => {
      const rawAirwayName = Object.keys(airwayObject || {})[0] || '';
      const airwayName = normalizeToken(rawAirwayName);
      const airwayFixes = airwayObject?.[rawAirwayName] || [];

      if (!airwayName) {
        blankAirways.push({ index });
        return;
      }

      if (airwayNames.has(airwayName)) {
        duplicateAirways.push(airwayName);
      }

      airwayNames.add(airwayName);

      airwayFixes.forEach((fixName) => {
        const normalizedFix = normalizeToken(fixName);
        if (!fixNames.has(normalizedFix)) {
          missingFixes.push({ airway: airwayName, fix: normalizedFix });
        }
      });
    });

    return {
      duplicateAirways: [...new Set(duplicateAirways)],
      blankAirways,
      missingFixes
    };
  }

  function validateNavigationData(fixes, airwayList) {
    const fixReport = validateFixes(fixes);
    const airwayReport = validateAirways(airwayList, fixReport.names);

    return {
      summary: {
        fixes: (fixes || []).length,
        airways: (airwayList || []).length,
        duplicateFixes: fixReport.duplicateFixes.length,
        spacedFixes: fixReport.spacedFixes.length,
        invalidCoordinates: fixReport.invalidCoordinates.length,
        duplicateAirways: airwayReport.duplicateAirways.length,
        missingAirwayFixes: airwayReport.missingFixes.length
      },
      duplicateFixes: fixReport.duplicateFixes,
      blankFixes: fixReport.blankFixes,
      spacedFixes: fixReport.spacedFixes,
      invalidCoordinates: fixReport.invalidCoordinates,
      duplicateAirways: airwayReport.duplicateAirways,
      blankAirways: airwayReport.blankAirways,
      missingAirwayFixes: airwayReport.missingFixes
    };
  }

  function logValidationReport(report) {
    console.groupCollapsed('AeroTrack data validation');
    console.table(report.summary);

    if (report.missingAirwayFixes.length > 0) {
      console.warn('Airway fixes missing from fixesData:', report.missingAirwayFixes);
    }

    if (report.duplicateFixes.length > 0) {
      console.warn('Duplicate fixes:', report.duplicateFixes);
    }

    if (report.duplicateAirways.length > 0) {
      console.warn('Duplicate airways:', report.duplicateAirways);
    }

    if (report.spacedFixes.length > 0) {
      console.info('Fix names with extra spaces:', report.spacedFixes);
    }

    if (report.invalidCoordinates.length > 0) {
      console.warn('Fixes with invalid coordinates:', report.invalidCoordinates);
    }

    console.groupEnd();
  }

  function runDataValidation() {
    const report = validateNavigationData(window.fixesData || fixesData, window.airways || airways);
    window.AeroTrackDataValidation = report;
    logValidationReport(report);
    return report;
  }

  window.AeroTrackDataValidator = {
    runDataValidation,
    validateNavigationData
  };

  runDataValidation();
})();
