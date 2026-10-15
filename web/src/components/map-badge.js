import { html } from '../html.js';

export function mapBadge(type) {
  return html`<span class="badge map-badge ${type === 'shared' ? 'shared' : 'personal'}">${type === 'shared' ? '공유' : '개인'}</span>`;
}
