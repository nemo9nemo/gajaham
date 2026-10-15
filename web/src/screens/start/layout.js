export function flowPage(header, body, footer = '', className = '') {
  return `<div class="flow-page ${className}">` + header +
    '<main class="flow-body">' + body + '</main>' +
    (footer ? '<footer class="flow-footer">' + footer + '</footer>' : '') + '</div>';
}
