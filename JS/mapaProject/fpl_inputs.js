function normalizeInputToUppercase(input) {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const upperValue = input.value.toUpperCase();

    if (input.value === upperValue) {
        return;
    }

    input.value = upperValue;

    if (typeof start === 'number' && typeof end === 'number') {
        input.setSelectionRange(start, end);
    }
}

document.querySelectorAll('#depAd, #destAd, #etd, #fixes').forEach((input) => {
    input.addEventListener('input', () => normalizeInputToUppercase(input));
    input.addEventListener('blur', () => {
        input.value = input.value.trim().toUpperCase();
    });
});
