import { escapeHtml } from './escape-html';

describe('escapeHtml', () => {
  it('escapes the characters that can break out of text and quoted attribute values', () => {
    expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe(
      '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;',
    );
  });

  it('escapes & first so entities are not double-escaped', () => {
    expect(escapeHtml('a&lt;b')).toBe('a&amp;lt;b');
  });

  it('leaves a plain URL untouched', () => {
    expect(escapeHtml('https://mise.example.com/verify-email?token=abc-123')).toBe(
      'https://mise.example.com/verify-email?token=abc-123',
    );
  });
});
