export function dialog(titleMarkup, content) {
  return '<div class="dialog-layer"><div class="dialog-scrim"></div><section class="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title">' +
    '<h2 id="delete-title">' + titleMarkup + '</h2>' + content + '</section></div>';
}
