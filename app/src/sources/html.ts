// Text from a website must not be read as HTML, or a sneaky peice of code can find its way through,
// so these 5 swaps turn them to text
export function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function toHtml(paragraphs: string[]) {
  return paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("\n");
}