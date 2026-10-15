import { html } from '../html.js';

export function notice(message, tone = 'info') {
  return html`<p class="notice ${tone}" role="status">${message}</p>`;
}
