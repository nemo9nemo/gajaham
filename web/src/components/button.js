import { html } from '../html.js';

export function button(label, { action, id, href, variant = 'primary', disabled = false } = {}) {
  const attributes = html` class="button ${variant}"` +
    (action ? html` data-action="${action}"` : '') +
    (id ? html` data-id="${id}"` : '');
  return href && !disabled
    ? html`<a href="${href}"` + attributes + html`>${label}</a>`
    : '<button type="button"' + attributes + (disabled ? ' disabled aria-disabled="true"' : '') + html`>${label}</button>`;
}
