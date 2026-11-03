import { describe, expect, it } from 'vitest';
import { escapeHtml } from '../src/lib/html';

describe('HTML escaping', () => {
  it('escapes markup and attribute delimiters', () => {
    expect(escapeHtml(`<script src="x">&'`)).toBe('&lt;script src=&quot;x&quot;&gt;&amp;&#39;');
  });
});
