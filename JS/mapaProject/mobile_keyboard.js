(function () {
  'use strict';

  const viewport = window.visualViewport;
  if (!viewport) {
    return;
  }

  let largestViewportHeight = viewport.height;
  let scrollTimer;

  function isEditable(element) {
    return element instanceof HTMLElement && (
      element.matches('input:not([type="checkbox"]):not([type="radio"]), textarea, select') ||
      element.isContentEditable
    );
  }

  function keepFocusedFieldVisible() {
    window.clearTimeout(scrollTimer);
    scrollTimer = window.setTimeout(() => {
      const active = document.activeElement;
      if (isEditable(active)) {
        active.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      }
    }, 80);
  }

  function updateKeyboardState() {
    largestViewportHeight = Math.max(largestViewportHeight, viewport.height);
    const heightReduction = largestViewportHeight - viewport.height;
    const keyboardOpen = isEditable(document.activeElement) && heightReduction > 120;

    document.documentElement.style.setProperty('--visual-viewport-height', `${viewport.height}px`);
    document.body.classList.toggle('mobile-keyboard-open', keyboardOpen);

    if (keyboardOpen) {
      keepFocusedFieldVisible();
    }
  }

  document.addEventListener('focusin', (event) => {
    if (!isEditable(event.target)) {
      return;
    }
    window.setTimeout(updateKeyboardState, 120);
    window.setTimeout(updateKeyboardState, 320);
  });

  document.addEventListener('focusout', () => {
    window.setTimeout(updateKeyboardState, 180);
  });

  viewport.addEventListener('resize', updateKeyboardState);
  viewport.addEventListener('scroll', updateKeyboardState);
  window.addEventListener('orientationchange', () => {
    largestViewportHeight = viewport.height;
    document.body.classList.remove('mobile-keyboard-open');
  });
})();
