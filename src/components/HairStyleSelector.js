export function createHairStyleSelector({ container, styles, selectedStyleId, onSelect }) {
  let selectedStyle = styles.find((style) => style.id === selectedStyleId) || styles[0];

  container.innerHTML = styles.map((style) => renderStyleButton(style, style.id === selectedStyle.id)).join('');

  container.addEventListener('click', (event) => {
    const button = event.target.closest('[data-style]');
    if (!button) return;

    const nextStyle = styles.find((style) => style.id === button.dataset.style);
    if (!nextStyle) return;

    selectedStyle = nextStyle;
    updateActiveStyle(container, button);
    onSelect?.(selectedStyle);
  });

  return {
    getSelectedStyle: () => selectedStyle
  };
}

function renderStyleButton(style, isActive) {
  return `
    <button class="style-button ${isActive ? 'is-active' : ''}" data-style="${style.id}">
      <span
        class="style-thumb style-thumb--3d style-thumb--${style.preview.shape}"
        style="--hair-base: ${style.material.base}; --hair-highlight: ${style.material.highlight}; --hair-shadow: ${style.material.shadow};"
      >
        <span class="style-thumb-model" aria-hidden="true"></span>
      </span>
      <span class="style-copy">
        <strong>${style.name}</strong>
        <span>${style.desc}</span>
      </span>
    </button>
  `;
}

function updateActiveStyle(container, activeButton) {
  container.querySelectorAll('.style-button').forEach((button) => {
    button.classList.toggle('is-active', button === activeButton);
  });
}
