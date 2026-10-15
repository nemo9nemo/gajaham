import { html } from '../html.js';

export function chip(label, action, id, active = false) {
  return html`<button type="button" class="chip" data-action="${action}" data-id="${id}" aria-pressed="${active}">${label}</button>`;
}
