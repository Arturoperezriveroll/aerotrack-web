function activateAeroTrackTab(targetId) {
    const tabButtons = document.querySelectorAll('[data-tab-target]');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabButtons.forEach((button) => {
        const isActive = button.dataset.tabTarget === targetId;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-selected', String(isActive));
    });

    tabPanels.forEach((panel) => {
        const isActive = panel.id === targetId;
        panel.classList.toggle('is-active', isActive);
        panel.hidden = !isActive;
    });
}

document.querySelectorAll('[data-tab-target]').forEach((button) => {
    button.addEventListener('click', () => {
        activateAeroTrackTab(button.dataset.tabTarget);
    });
});
