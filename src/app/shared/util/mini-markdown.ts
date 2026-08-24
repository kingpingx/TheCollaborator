/**
 * A deliberately tiny Markdown subset for the curated `longDescription` field:
 * paragraphs, bullet lists, bold, italic, inline code and links.
 *
 * Input is HTML-escaped before any formatting is applied, so the output can
 * only ever contain the tags this file emits — no sanitiser needed, and no
 * Markdown dependency for what amounts to a few paragraphs of prose.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function inline(text: string): string {
  return (
    escapeHtml(text)
      // `code`
      .replace(
        /`([^`]+)`/g,
        '<code class="bg-surface-2 border-line rounded border px-1 py-0.5 font-mono text-[0.85em]">$1</code>',
      )
      // **bold**
      .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-content">$1</strong>')
      // *italic*
      .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
      // [text](https://url) — http(s) only, so no javascript: URLs survive
      .replace(
        /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-brand hover:underline">$1</a>',
      )
  );
}

export function renderMiniMarkdown(source: string | null | undefined): string {
  const trimmed = source?.trim();
  if (!trimmed) return '';

  const blocks = trimmed.split(/\n{2,}/);

  return blocks
    .map((block) => {
      const lines = block.split('\n');

      // Bullet list
      if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
        const items = lines
          .map((l) => `<li>${inline(l.replace(/^\s*[-*]\s+/, ''))}</li>`)
          .join('');
        return `<ul class="list-disc space-y-1 pl-5">${items}</ul>`;
      }

      // Heading
      const heading = /^(#{1,3})\s+(.*)$/.exec(lines[0]);
      if (heading && lines.length === 1) {
        const level = heading[1].length + 2; // # -> h3, ## -> h4
        return `<h${level} class="text-content font-semibold">${inline(heading[2])}</h${level}>`;
      }

      return `<p>${inline(block.replace(/\n/g, ' '))}</p>`;
    })
    .join('');
}
