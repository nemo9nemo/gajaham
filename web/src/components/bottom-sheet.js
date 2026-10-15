import { html } from '../html.js';
import { button } from './button.js';

export function bottomSheet(title, content) {
  return '<div class="sheet-layer"><button type="button" class="sheet-scrim" data-action="close-sheet" aria-label="시트 닫기" tabindex="-1"></button>' +
    '<section class="bottom-sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" tabindex="-1">' +
    '<div class="sheet-handle" aria-hidden="true"></div><header class="sheet-header">' +
    html`<h2 id="sheet-title">${title}</h2>` + button('닫기', { action: 'close-sheet', variant: 'text' }) +
    '</header>' + content + '</section></div>';
}
