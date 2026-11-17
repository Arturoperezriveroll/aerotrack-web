(function () {
  const resetButton = document.getElementById('resetAppBtn');
  if (!resetButton) return;

  resetButton.addEventListener('click', () => {
    const confirmed = window.confirm(
      'Reset AeroTrack? This will clear the current route, tracking and map selections.'
    );
    if (!confirmed) return;

    document.querySelectorAll('input, textarea, select').forEach((field) => {
      if (field.type === 'checkbox' || field.type === 'radio') return;
      if (field.tagName === 'SELECT') field.selectedIndex = 0;
      else field.value = '';
    });
    window.location.reload();
  });
})();
