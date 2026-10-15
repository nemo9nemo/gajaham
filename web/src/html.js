const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ENTITIES[character]);
}

// Composed markup is concatenated outside this tag; every interpolation is text.
export function html(parts, ...values) {
  return parts.reduce((result, part, index) => result + part +
    (index < values.length ? escapeHtml(values[index]) : ''), '');
}
