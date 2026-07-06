function activateAeroTrackTab(targetId) {
    const tabButtons = document.querySelectorAll('[data-tab-target]');
    const tabPanels = document.querySelectorAll('.tab-panel');
    const tabsContainer = document.getElementById('appTabs');
    const previousTabsHeight = tabsContainer ? tabsContainer.offsetHeight : 0;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

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

    if (tabsContainer) {
        const currentMinHeight = parseFloat(tabsContainer.style.minHeight) || 0;
        tabsContainer.style.minHeight = `${Math.max(previousTabsHeight, currentMinHeight, tabsContainer.offsetHeight)}px`;
    }

    window.requestAnimationFrame(() => {
        window.scrollTo(scrollX, scrollY);
        window.requestAnimationFrame(() => {
            window.scrollTo(scrollX, scrollY);
        });
    });
}

document.querySelectorAll('[data-tab-target]').forEach((button) => {
    button.addEventListener('click', () => {
        activateAeroTrackTab(button.dataset.tabTarget);
    });
});
