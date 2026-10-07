import { describe, it, expect } from 'vitest';
import { parseInitialUrl, buildShareUrl } from '../src/app/deepLink';

describe('Deep Link URL Handling (Group D - Item 12)', () => {
  it('parses valid ply and mode from query string', () => {
    const parsed = parseInitialUrl('?ply=47&mode=study');
    expect(parsed.ply).toBe(47);
    expect(parsed.mode).toBe('study');
  });

  it('clamps invalid or out-of-range plies', () => {
    expect(parseInitialUrl('?ply=120').ply).toBe(87);
    expect(parseInitialUrl('?ply=-10').ply).toBe(0);
    expect(parseInitialUrl('?ply=abc').ply).toBe(0);
    expect(parseInitialUrl('').mode).toBe('cinematic');
    expect(parseInitialUrl('?mode=invalid').mode).toBe('cinematic');
  });

  it('builds shareable URL query string', () => {
    const url = buildShareUrl(47, 'study', 'https://example.com/chess');
    expect(url).toBe('https://example.com/chess?ply=47&mode=study');
  });
});
