import { html } from '../html.js';

export function checkRow(label, { action, id, checked = false, caption = '', className = '' }) {
  return html`<label class="check-row ${className}"><input type="checkbox" data-action="${action}" data-id="${id}"` +
    (checked ? ' checked' : '') + html`><span><strong>${label}</strong>` +
    (caption ? html`<span class="caption">${caption}</span>` : '') + '</span></label>';
}

export function radioOption(label, { action, id, selected = false, caption = '', disabled = false }) {
  return html`<button type="button" role="radio" aria-checked="${selected}" class="save-option copy-option ${selected ? 'selected' : ''}" data-action="${action}" data-id="${id}"` +
    (disabled ? ' disabled' : '') + '><span class="radio-mark" aria-hidden="true"></span>' +
    html`<span class="option-copy"><strong>${label}</strong>` + (caption ? html`<span class="caption">${caption}</span>` : '') + '</span></button>';
}
