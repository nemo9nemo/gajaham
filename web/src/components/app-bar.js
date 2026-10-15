import { html } from '../html.js';

export function appBar(title, { back, right = '' } = {}) {
  return '<header class="app-bar">' +
    (back ? html`<a class="back" href="${back}" aria-label="뒤로">‹</a>` : '') +
    html`<h1>${title}</h1>` + right + '</header>';
}
