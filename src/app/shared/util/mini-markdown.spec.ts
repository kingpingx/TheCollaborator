import { renderMiniMarkdown } from './mini-markdown';

describe('renderMiniMarkdown', () => {
  it('returns an empty string for empty input', () => {
    expect(renderMiniMarkdown(null)).toBe('');
    expect(renderMiniMarkdown(undefined)).toBe('');
    expect(renderMiniMarkdown('   ')).toBe('');
  });

  it('wraps plain text in a paragraph', () => {
    expect(renderMiniMarkdown('Hello there')).toBe('<p>Hello there</p>');
  });

  it('splits blank-line-separated blocks into separate paragraphs', () => {
    const html = renderMiniMarkdown('First para\n\nSecond para');
    expect(html).toBe('<p>First para</p><p>Second para</p>');
  });

  it('escapes HTML before formatting, so injected markup cannot survive', () => {
    const html = renderMiniMarkdown('<script>alert(1)</script>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('escapes HTML inside inline code too', () => {
    const html = renderMiniMarkdown('use `<div>` here');
    expect(html).toContain('&lt;div&gt;');
    expect(html).not.toContain('<div>');
  });

  it('renders bold, italic and inline code', () => {
    expect(renderMiniMarkdown('**strong**')).toContain('<strong');
    expect(renderMiniMarkdown('some *emphasis* here')).toContain('<em>emphasis</em>');
    expect(renderMiniMarkdown('`code`')).toContain('<code');
  });

  it('renders http links and opens them safely in a new tab', () => {
    const html = renderMiniMarkdown('[Angular](https://angular.dev)');
    expect(html).toContain('href="https://angular.dev"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
  });

  it('ignores non-http link targets, so javascript: URLs never render', () => {
    const html = renderMiniMarkdown('[click](javascript:alert(1))');
    expect(html).not.toContain('href=');
    expect(html).toContain('[click]');
  });

  it('renders a bullet list', () => {
    const html = renderMiniMarkdown('- one\n- two');
    expect(html).toBe('<ul class="list-disc space-y-1 pl-5"><li>one</li><li>two</li></ul>');
  });

  it('renders headings at a demoted level', () => {
    expect(renderMiniMarkdown('# Title')).toContain('<h3');
    expect(renderMiniMarkdown('## Sub')).toContain('<h4');
  });

  it('joins soft-wrapped lines within a paragraph', () => {
    expect(renderMiniMarkdown('line one\nline two')).toBe('<p>line one line two</p>');
  });
});
