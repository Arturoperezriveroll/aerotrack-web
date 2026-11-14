(function () {
  let cachedGraph = null;

  function setSuggestionMessage(message, isError) {
    const output = document.getElementById('routeSuggestion');
    if (!output) {
      return;
    }
    output.textContent = message;
    output.classList.toggle('has-error', Boolean(isError));
  }

  function suggestFplRoute() {
    const departure = document.getElementById('depAd')?.value;
    const destination = document.getElementById('destAd')?.value;
    const routeInput = document.getElementById('fixes');
    const button = document.getElementById('suggestRouteBtn');

    if (!departure?.trim() || !destination?.trim()) {
      setSuggestionMessage('Enter departure and destination airports first.', true);
      return;
    }

    button?.setAttribute('disabled', 'disabled');
    setSuggestionMessage('Calculating the shortest connected airway route…', false);

    window.setTimeout(() => {
      try {
        cachedGraph ||= AeroTrackRouteSuggester.buildAirwayGraph(fixesData, airways);
        const result = AeroTrackRouteSuggester.suggestRoute({
          departure,
          destination,
          airports: mexicoAirports,
          graph: cachedGraph
        });

        if (!result.ok) {
          setSuggestionMessage(result.message, true);
          return;
        }

        routeInput.value = result.routeText;
        routeInput.dispatchEvent(new Event('input', { bubbles: true }));
        const detour = result.detourPercent >= 0
          ? `+${result.detourPercent.toFixed(0)}%`
          : `${result.detourPercent.toFixed(0)}%`;
        setSuggestionMessage(
          `Suggested ${result.nodes[0]} → ${result.nodes[result.nodes.length - 1]} | ` +
          `${result.totalDistanceNm.toFixed(1)} NM (${detour} vs direct) | ` +
          `airport access ${result.startAccessNm.toFixed(1)} + ${result.endAccessNm.toFixed(1)} NM`,
          false
        );
        buildRoute();
      } catch (error) {
        console.error('Route suggestion failed:', error);
        setSuggestionMessage('The route could not be calculated. Check the navigation data.', true);
      } finally {
        button?.removeAttribute('disabled');
      }
    }, 0);
  }

  const button = document.getElementById('suggestRouteBtn');
  if (button) {
    button.addEventListener('click', suggestFplRoute);
  }
})();

